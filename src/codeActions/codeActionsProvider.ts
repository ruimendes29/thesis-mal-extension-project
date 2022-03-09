import * as vscode from "vscode";
import { ALREADY_DEFINED, CHANGE_TYPE, DECLARE_ACTION, DEFINE_ATTRIBUTE } from "../diagnostics/diagnostics";
import { actionsStartingLine, attributes, attributesStartingLine } from "../parsers/globalParserInfo";
import { ParseSection } from "../parsers/ParseSection";

const COMMAND = "mal.command";

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class Emojinfo implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    // for each diagnostic entry that has the matching `code`, create a code action command
    return context.diagnostics.map((diagnostic) => {
      const diagnosticS = (diagnostic.code! + "").split(":");
      switch (diagnostic.code!.toString().split(":")[0]) {
        case DECLARE_ACTION:
          return this.declareAction(document, diagnostic.code!.toString().split(":")[1], diagnostic);
        case CHANGE_TYPE:
          return this.changeToCorrectType(document, diagnosticS[1]!, +diagnosticS[2]!, diagnosticS[3]!, diagnostic);
        case ALREADY_DEFINED:
          //ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
          return this.alreadyDefined(document, +diagnosticS[1], diagnosticS[2], diagnostic);
        case DEFINE_ATTRIBUTE:
          //DEFINE_ATTRIBUTE +":"+findValueType(val)+":"+attribute
          return this.addAttribute(document,diagnosticS[1],diagnosticS[2],diagnostic);
        default:
          return new vscode.CodeAction(`No QuickFix available`, vscode.CodeActionKind.QuickFix);
      }
    });
  }

  private alreadyDefined(
    document: vscode.TextDocument,
    lineToFix: number,
    defined: string,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(`Delete already defined ${defined}`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lineToFix).text;
    const actionRange = new vscode.Range(
      new vscode.Position(lineToFix - 1, document.lineAt(Math.max(0, lineToFix - 1)).text.length),
      new vscode.Position(lineToFix, line.length)
    );
    fix.edit.replace(document.uri, actionRange, "");
    return fix;
  }

  private changeToCorrectType(
    document: vscode.TextDocument,
    newType: string,
    lineToFix: number,
    attribute: string,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(`Convert to ${newType}`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lineToFix).text;
    const characterOfType = line.indexOf(":") + 2;
    if (attributes.get(attribute)!.alone) {
      const oldTypeRange = new vscode.Range(
        new vscode.Position(lineToFix, characterOfType),
        new vscode.Position(lineToFix, line.indexOf("#") > 0 ? line.indexOf("#") : line.length)
      );
      fix.edit.replace(document.uri, oldTypeRange, newType + " ");
    } else {
      const indexOfComma = line.slice(ParseSection.getPosition(line, attribute, 1) + attribute.length - 1).indexOf(",");
      const oldAttributeRange = new vscode.Range(
        new vscode.Position(lineToFix, ParseSection.getPosition(line, attribute, 1)),
        new vscode.Position(
          lineToFix,
          ParseSection.getPosition(line, attribute, 1) + attribute.length + (indexOfComma > 0 ? indexOfComma : 0)
        )
      );
      fix.edit.replace(document.uri, oldAttributeRange, "");
      fix.edit.insert(document.uri, new vscode.Position(lineToFix + 1, 2), attribute + " : " + newType + " " + "\n  ");
    }
    return fix;
  }

  private declareAction(
    document: vscode.TextDocument,
    newAction: string,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(`Declare ${newAction} as an action`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.insert(document.uri, new vscode.Position(actionsStartingLine[0] + 1, 0), "  " + newAction + "\n");
    return fix;
  }

  private addAttribute(
    document: vscode.TextDocument,
    newType: string,
    attribute: string,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(`Add ${attribute} with type ${newType}`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    fix.edit.insert(document.uri, new vscode.Position(attributesStartingLine[0] + 1, 2), attribute + " : " + newType + " " + "\n  ");

    return fix;
  }
}
