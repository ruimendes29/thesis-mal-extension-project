import * as vscode from "vscode";
import { diagnosticCollection } from "../extension";
import { actions, actionsStartingLine, attributes, defines, enums } from "../parsers/globalParserInfo";
import { getCorrectLine, lineSizes } from "../parsers/textParser";

export const ADD_TO_ENUM = "addToEnum";
export const CHANGE_TYPE = "changeType";
export const DECLARE_ACTION = "declareAction";
export const ALREADY_DEFINED = "alreadyDefined";
export const NOT_YET_IMPLEMENTED = "notYetImplemented";
export const DEFINE_ATTRIBUTE = "defineAttribute";

const mapForDiag: Map<vscode.Uri, vscode.Diagnostic[]> = new Map<vscode.Uri, vscode.Diagnostic[]>();

export const clearDiagnosticCollection = () => {
  diagnosticCollection.clear();
  mapForDiag.clear();
};

export const addDiagnostic = (
  initialLineNumber: number,
  initialCharacter: number,
  element: string,
  diagnosticMessage: string,
  severity: string,
  code: string
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
  const correctLineInfo = getCorrectLine(initialLineNumber-lineSizes.length+(lineSizes.length===0?0:1),lineSizes,initialCharacter);
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(
      new vscode.Position(correctLineInfo.correctLine, correctLineInfo.correctOffset),
      new vscode.Position(correctLineInfo.correctLine, correctLineInfo.correctOffset+element.length)
    ),
    diagnosticMessage,
    severityType
  );
  diagnostic.code = code ? code : "";
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
  textInfo: { line: string; lineNumber: number; el: string },
  attribute: string,
  value: string,
  message: string,
  severity: string,
  attOffset: number,
  valOffset: number,
  errorOffset: number,
  code: string
) => {
  let stringToCompare = "";
  let offsetToCompare=0;
  if (type === "att") {
    stringToCompare = attribute;
    offsetToCompare=attOffset;
  } else if (type === "val") {
    stringToCompare = value;
    offsetToCompare=valOffset;
  }
  addDiagnostic(
    textInfo.lineNumber,
    errorOffset+offsetToCompare,
    stringToCompare,
    message,
    severity,
    code
  );
  const scOfValue = textInfo.el.indexOf(attribute) + attribute.length;
  return [
    {
      offset: attOffset,
      value: attribute,
      tokenType: stringToCompare === attribute ? "regexp" : "variable",
    },
    {
      offset: valOffset,
      value: value,
      tokenType: stringToCompare === value ? "regexp" : "macro",
    },
  ];
};
