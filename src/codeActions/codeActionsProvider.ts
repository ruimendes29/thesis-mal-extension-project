import * as vscode from "vscode";
import { CHANGE_TYPE } from "../diagnostics/diagnostics";

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
      .filter((diagnostic) => diagnostic.code?.toString().split(":")[0] === CHANGE_TYPE)
      .map((diagnostic) => {
        console.log(diagnostic);
        return this.changeToCorrectType(
          document,
          diagnostic.code?.toString().split(":")[1]!,
          +diagnostic.code?.toString().split(":")[2]!,
          diagnostic
        );
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
}
