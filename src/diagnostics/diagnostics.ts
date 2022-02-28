import * as vscode from "vscode";
import { diagnosticCollection } from "../extension";
import { actions, defines, enums } from "../parsers/globalParserInfo";

export const CHANGE_TYPE = "changeType";
export const NOT_YET_IMPLEMENTED = "notYetImplemented";

const mapForDiag: Map<vscode.Uri, vscode.Diagnostic[]> = new Map<
  vscode.Uri,
  vscode.Diagnostic[]
>();


export const clearDiagnosticCollection = () => {
  actions.clear();
  defines.clear();
  enums.clear();
  mapForDiag.clear();
};

export const addDiagnostic = (
  initialLineNumber: number,
  initialCharacter: number,
  finalLineNumber: number,
  finalCharacter: number,
  diagnosticMessage: string,
  severity: string,
  code:string
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
  diagnostic.code=code?code:"";
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
  diagnosticCollection.set(currentUri, mapForDiag.get(currentUri));
};

/* function responsible for adding diagnostics to the attributes when they are in the conditions
  if any given axiom */
 export const addDiagnosticToRelation = (
    type: string,
    line: string,
    lineNumber: number,
    fullCondition: string,
    attribute: string,
    value: string,
    message: string,
    severity: string,
    offset: number,
    code: string
  ) => {
    let stringToCompare = "";
    if (type === "att") {
      stringToCompare = attribute;
    } else if (type === "val") {
      stringToCompare = value;
    }
      addDiagnostic(
        lineNumber,
        line.indexOf(fullCondition) + fullCondition.indexOf(stringToCompare) + offset,
        lineNumber,
        line.indexOf(fullCondition) +
          fullCondition.indexOf(stringToCompare) +
          stringToCompare.length + offset,
        message,
        severity, code
      );
   
    return [
      {
        offset: fullCondition.indexOf(attribute),
        value: attribute,
        tokenType: stringToCompare === attribute ? "regexp" : "variable",
      },
      {
        offset: fullCondition.indexOf(value),
        value: value,
        tokenType: stringToCompare === value ? "regexp" : "macro",
      },
    ];
  };