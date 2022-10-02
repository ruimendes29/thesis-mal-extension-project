import * as vscode from "vscode";
import {
  ADD_TO_ENUM,
  ALREADY_DEFINED,
  CHANGE_TYPE,
  CREATE_CHANGE_NUMBER,
  DECLARE_ACTION,
  DEFINE_ATTRIBUTE,
} from "../diagnostics/diagnostics";
import {
  actionsStartingLine,
  attributes,
  attributesStartingLine,
  getInteractorByLine,
  interactorLimits,
  ranges,
  typesStartingLine,
} from "../parsers/globalParserInfo";
import { ParseSection } from "../parsers/ParseSection";
import { countSpacesAtStart } from "../parsers/textParser";

const COMMAND = "mal.command";

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class IvyCodeActionProvider implements vscode.CodeActionProvider {
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
        case CREATE_CHANGE_NUMBER:
          //CREATE_CHANGE_NUMBER:lineToFix:attributeName:minimum:maximum
          return this.declareNumberTypeAndChange(
            document,
            +diagnosticS[1]!,
            diagnosticS[2]!,
            +diagnosticS[3],
            +diagnosticS[4],
            diagnostic,
            range.start
          );
        case DECLARE_ACTION:
          return this.declareAction(document, diagnostic.code!.toString().split(":")[1], diagnostic, range.start);
        case CHANGE_TYPE:
          //CHANGE_TYPE:newTYpe:lineToFix:attributeName
          return this.changeToCorrectType(
            document,
            diagnosticS[1]!,
            +diagnosticS[2]!,
            diagnosticS[3]!,
            diagnostic,
            range.start
          );
        case ALREADY_DEFINED:
          //ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
          return this.alreadyDefined(document, +diagnosticS[1], diagnosticS[2], diagnostic);
        case DEFINE_ATTRIBUTE:
          //DEFINE_ATTRIBUTE +":"+findValueType(val)+":"+attribute
          return this.addAttribute(document, diagnosticS[1], diagnosticS[2], diagnostic, range.start, diagnosticS[3]);
        case ADD_TO_ENUM:
          //ADD_TO_ENUM:lineNumber:newEnumMember:enumName
          return this.addToEnum(document, +diagnosticS[1], diagnosticS[2], diagnosticS[3], diagnostic);
        default:
          return new vscode.CodeAction(`No QuickFix available`, vscode.CodeActionKind.QuickFix);
      }
    });
  }

  private declareNumberTypeAndChange(
    document: vscode.TextDocument,
    lineToFix: number,
    attribute: string,
    minimum: number,
    maximum: number,
    diagnostic: vscode.Diagnostic,
    position: vscode.Position,
    preExistingFix?: vscode.CodeAction
  ): vscode.CodeAction {
    let fix;
    if (preExistingFix) {
      fix = preExistingFix;
    } else {
      fix = this.changeToCorrectType(document, "Number", lineToFix, attribute, diagnostic, position);
    }
    fix.edit!.insert(
      document.uri,
      new vscode.Position(
        typesStartingLine ? typesStartingLine : 0,
        typesStartingLine ? countSpacesAtStart(document.lineAt(typesStartingLine).text) : 0
      ),
      `Number= ${minimum}..${maximum}\n`
    );
    return fix;
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

  private addToEnum(
    document: vscode.TextDocument,
    lineToFix: number,
    enumMember: string,
    enumName: string,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(`Add ${enumMember} to ${enumName}`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lineToFix).text;
    fix.edit.insert(
      document.uri,
      new vscode.Position(lineToFix, document.lineAt(lineToFix).text.indexOf("{") + 1),
      enumMember + ", "
    );
    return fix;
  }

  private changeToCorrectType(
    document: vscode.TextDocument,
    newType: string,
    lineToFix: number,
    attribute: string,
    diagnostic: vscode.Diagnostic,
    position: vscode.Position
  ): vscode.CodeAction {
    let fix;
    fix = new vscode.CodeAction(`Convert to ${newType}`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lineToFix).text;
    const characterOfType = line.indexOf(":") + 1;
    if (attributes.get(getInteractorByLine(lineToFix))!.get(attribute)!.alone) {
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
      const numberOfSpaces = countSpacesAtStart(
        document.lineAt(attributesStartingLine.get(getInteractorByLine(position.line))! + 1).text
      );
      fix.edit.insert(
        document.uri,
        new vscode.Position(lineToFix + 1, numberOfSpaces),
        attribute + " : " + newType + " " + "\n"
      );
    }
    return fix;
  }

  private declareAction(
    document: vscode.TextDocument,
    newAction: string,
    diagnostic: vscode.Diagnostic,
    position: vscode.Position
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(`Declare ${newAction} as an action`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    const actionStart = actionsStartingLine.get(getInteractorByLine(position.line));
    let linePosition = actionStart ? actionStart : interactorLimits.get(getInteractorByLine(position.line))!.start + 1;
    let numberOfSpaces = actionStart ? countSpacesAtStart(document.lineAt(linePosition + 1).text) : 0;
    const textToAdd = newAction + "\n" + " ".repeat(numberOfSpaces);
    if (!actionStart) {
      fix.edit.insert(document.uri, new vscode.Position(linePosition, 0), "actions\n");
    }
    fix.edit.insert(document.uri, new vscode.Position(linePosition + (actionStart ? 1 : 0), numberOfSpaces), textToAdd);
    return fix;
  }

  private addAttribute(
    document: vscode.TextDocument,
    newType: string,
    attribute: string,
    diagnostic: vscode.Diagnostic,
    position: vscode.Position,
    valValue?: string
  ): vscode.CodeAction {
    const attributesStart = attributesStartingLine.get(getInteractorByLine(position.line));
    const linePosition = attributesStart
      ? attributesStart
      : interactorLimits.get(getInteractorByLine(position.line))!.start + 1;

    const fix = new vscode.CodeAction(`Add ${attribute} with type ${newType}`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();

    const numberOfSpaces = attributesStart ? countSpacesAtStart(document.lineAt(linePosition + 1).text) : 0;
    const textToAdd = attribute + " : " + newType + " " + "\n" + " ".repeat(numberOfSpaces);
    if (!attributesStart) {
      fix.edit.insert(document.uri, new vscode.Position(linePosition, 0), "attributes\n");
    }
    fix.edit.insert(
      document.uri,
      new vscode.Position(linePosition + (attributesStart ? 1 : 0), numberOfSpaces),
      textToAdd
    );
    let toRetFix = fix;
    if (newType === "Number") {
      toRetFix = this.declareNumberTypeAndChange(
        document,
        linePosition + (attributesStart ? 1 : 0),
        attribute,
        Math.max(0, eval(valValue ? valValue : "0") - 10),
        Math.max(10, eval(valValue ? valValue : "0") + 10),
        diagnostic,
        position,
        fix
      );
    }
    return toRetFix;
  }
}
