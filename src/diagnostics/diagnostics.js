"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDiagnosticToRelation = exports.addDiagnostic = exports.clearDiagnosticCollection = exports.DEFINE_ATTRIBUTE = exports.NOT_YET_IMPLEMENTED = exports.ALREADY_DEFINED = exports.DECLARE_ACTION = exports.CHANGE_TYPE = void 0;
const vscode = require("vscode");
const extension_1 = require("../extension");
exports.CHANGE_TYPE = "changeType";
exports.DECLARE_ACTION = "declareAction";
exports.ALREADY_DEFINED = "alreadyDefined";
exports.NOT_YET_IMPLEMENTED = "notYetImplemented";
exports.DEFINE_ATTRIBUTE = "defineAttribute";
const mapForDiag = new Map();
const clearDiagnosticCollection = () => {
    extension_1.diagnosticCollection.clear();
    mapForDiag.clear();
};
exports.clearDiagnosticCollection = clearDiagnosticCollection;
const addDiagnostic = (initialLineNumber, initialCharacter, finalLineNumber, finalCharacter, diagnosticMessage, severity, code) => {
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
    const diagnostic = new vscode.Diagnostic(new vscode.Range(new vscode.Position(initialLineNumber, initialCharacter), new vscode.Position(finalLineNumber, finalCharacter)), diagnosticMessage, severityType);
    diagnostic.code = code ? code : "";
    const currentUri = vscode.window.activeTextEditor.document.uri;
    if (!mapForDiag.has(currentUri)) {
        mapForDiag.set(currentUri, []);
    }
    if (!mapForDiag.get(currentUri)?.filter((diag) => {
        return diag.range.isEqual(diagnostic.range);
    }).length) {
        mapForDiag.get(currentUri).push(diagnostic);
    }
    extension_1.diagnosticCollection.set(currentUri, mapForDiag.get(currentUri));
};
exports.addDiagnostic = addDiagnostic;
/* function responsible for adding diagnostics to the attributes when they are in the conditions
  if any given axiom */
const addDiagnosticToRelation = (type, textInfo, attribute, value, message, severity, attOffset, valOffset, errorOffset, code) => {
    let stringToCompare = "";
    let offsetToCompare = 0;
    if (type === "att") {
        stringToCompare = attribute;
        offsetToCompare = attOffset;
    }
    else if (type === "val") {
        stringToCompare = value;
        offsetToCompare = valOffset;
    }
    (0, exports.addDiagnostic)(textInfo.lineNumber, errorOffset + offsetToCompare, textInfo.lineNumber, errorOffset + offsetToCompare + stringToCompare.length, message, severity, code);
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
exports.addDiagnosticToRelation = addDiagnosticToRelation;
//# sourceMappingURL=diagnostics.js.map