import * as vscode from "vscode";
import { CHANGE_TYPE, DECLARE_ACTION } from "../diagnostics/diagnostics";
import { actionsStartingLine } from "../parsers/globalParserInfo";

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
    return context.diagnostics
      .map((diagnostic) => {
        switch (diagnostic.code!.toString().split(":")[0]) {
          case DECLARE_ACTION:
            return this.declareAction(document, diagnostic.code!.toString().split(":")[1], diagnostic);
          case CHANGE_TYPE:
            return this.changeToCorrectType(
              document,
              diagnostic.code?.toString().split(":")[1]!,
              +diagnostic.code?.toString().split(":")[2]!,
              diagnostic
            );
          default:
            return this.changeToCorrectType(
              document,
              diagnostic.code?.toString().split(":")[1]!,
              +diagnostic.code?.toString().split(":")[2]!,
              diagnostic
            );
        }
      });
  }

  private changeToCorrectType(
    document: vscode.TextDocument,
    newType: string,
    lineToFix: number,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction {
    const fix = new vscode.CodeAction(`Convert to ${newType}`, vscode.CodeActionKind.QuickFix);
    fix.diagnostics = [diagnostic];
    fix.edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lineToFix).text;
    const characterOfType = line.indexOf(":") + 2;
    const oldTypeRange = new vscode.Range(
      new vscode.Position(lineToFix, characterOfType),
      new vscode.Position(lineToFix, line.indexOf("#") > 0 ? line.indexOf("#") : line.length)
    );
    fix.edit.replace(document.uri, oldTypeRange, newType + " ");
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
    fix.edit.insert(document.uri, new vscode.Position(actionsStartingLine[0] + 1, 0), "  "+newAction+"\n");
    return fix;
  }
}
