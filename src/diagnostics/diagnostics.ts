import * as vscode from "vscode";
import { actions, defines } from "../parsers/globalParserInfo";

const mapForDiag: Map<vscode.Uri, vscode.Diagnostic[]> = new Map<
  vscode.Uri,
  vscode.Diagnostic[]
>();

const diagnosticCollection: vscode.DiagnosticCollection =
  vscode.languages.createDiagnosticCollection();

export const clearDiagnosticCollection = () => {
  diagnosticCollection.delete(vscode.window.activeTextEditor!.document.uri);
  actions.clear();
  defines.clear();
  mapForDiag.clear();
};

export const addDiagnostic = (
  initialLineNumber: number,
  initialCharacter: number,
  finalLineNumber: number,
  finalCharacter: number,
  diagnosticMessage: string,
  severity: string
) => {
  let severityType;
  switch (severity) {
    case "error":
      severityType = vscode.DiagnosticSeverity.Error;
      break;
    case "warning":
      severityType = vscode.DiagnosticSeverity.Warning;
      break;
    case "info":
      severityType = vscode.DiagnosticSeverity.Information;
      break;
    case "hint":
      severityType = vscode.DiagnosticSeverity.Hint;
      break;
  }
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(
      new vscode.Position(initialLineNumber, initialCharacter),
      new vscode.Position(finalLineNumber, finalCharacter)
    ),
    diagnosticMessage,
    severityType
  );
  const currentUri = vscode.window.activeTextEditor!.document.uri;
  if (!mapForDiag.has(currentUri)) {
    mapForDiag.set(currentUri, []);
  }
  if (
    !mapForDiag.get(currentUri)?.filter((diag) => {
      return diag.range.isEqual(diagnostic.range);
    }).length
  ) {
    mapForDiag.get(currentUri)!.push(diagnostic);
  }
  diagnosticCollection.clear();
  diagnosticCollection.set(currentUri, mapForDiag.get(currentUri));
};
