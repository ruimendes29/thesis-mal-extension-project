"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Emojinfo = void 0;
const vscode = require("vscode");
const diagnostics_1 = require("../diagnostics/diagnostics");
const globalParserInfo_1 = require("../parsers/globalParserInfo");
const ParseSection_1 = require("../parsers/ParseSection");
const COMMAND = "mal.command";
/**
 * Provides code actions corresponding to diagnostic problems.
 */
class Emojinfo {
    provideCodeActions(document, range, context, token) {
        // for each diagnostic entry that has the matching `code`, create a code action command
        return context.diagnostics.map((diagnostic) => {
            const diagnosticS = (diagnostic.code + "").split(":");
            switch (diagnostic.code.toString().split(":")[0]) {
                case diagnostics_1.DECLARE_ACTION:
                    return this.declareAction(document, diagnostic.code.toString().split(":")[1], diagnostic);
                case diagnostics_1.CHANGE_TYPE:
                    return this.changeToCorrectType(document, diagnosticS[1], +diagnosticS[2], diagnosticS[3], diagnostic);
                case diagnostics_1.ALREADY_DEFINED:
                    //ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
                    return this.alreadyDefined(document, +diagnosticS[1], diagnosticS[2], diagnostic);
                case diagnostics_1.DEFINE_ATTRIBUTE:
                    //DEFINE_ATTRIBUTE +":"+findValueType(val)+":"+attribute
                    return this.addAttribute(document, diagnosticS[1], diagnosticS[2], diagnostic);
                default:
                    return new vscode.CodeAction(`No QuickFix available`, vscode.CodeActionKind.QuickFix);
            }
        });
    }
    alreadyDefined(document, lineToFix, defined, diagnostic) {
        const fix = new vscode.CodeAction(`Delete already defined ${defined}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(lineToFix).text;
        const actionRange = new vscode.Range(new vscode.Position(lineToFix - 1, document.lineAt(Math.max(0, lineToFix - 1)).text.length), new vscode.Position(lineToFix, line.length));
        fix.edit.replace(document.uri, actionRange, "");
        return fix;
    }
    changeToCorrectType(document, newType, lineToFix, attribute, diagnostic) {
        const fix = new vscode.CodeAction(`Convert to ${newType}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(lineToFix).text;
        const characterOfType = line.indexOf(":") + 2;
        if (globalParserInfo_1.attributes.get((0, globalParserInfo_1.getInteractorByLine)(lineToFix)).get(attribute).alone) {
            const oldTypeRange = new vscode.Range(new vscode.Position(lineToFix, characterOfType), new vscode.Position(lineToFix, line.indexOf("#") > 0 ? line.indexOf("#") : line.length));
            fix.edit.replace(document.uri, oldTypeRange, newType + " ");
        }
        else {
            const indexOfComma = line.slice(ParseSection_1.ParseSection.getPosition(line, attribute, 1) + attribute.length - 1).indexOf(",");
            const oldAttributeRange = new vscode.Range(new vscode.Position(lineToFix, ParseSection_1.ParseSection.getPosition(line, attribute, 1)), new vscode.Position(lineToFix, ParseSection_1.ParseSection.getPosition(line, attribute, 1) + attribute.length + (indexOfComma > 0 ? indexOfComma : 0)));
            fix.edit.replace(document.uri, oldAttributeRange, "");
            fix.edit.insert(document.uri, new vscode.Position(lineToFix + 1, 2), attribute + " : " + newType + " " + "\n  ");
        }
        return fix;
    }
    declareAction(document, newAction, diagnostic) {
        const fix = new vscode.CodeAction(`Declare ${newAction} as an action`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, new vscode.Position(globalParserInfo_1.actionsStartingLine[0] + 1, 0), "  " + newAction + "\n");
        return fix;
    }
    addAttribute(document, newType, attribute, diagnostic) {
        const fix = new vscode.CodeAction(`Add ${attribute} with type ${newType}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, new vscode.Position(globalParserInfo_1.attributesStartingLine[0] + 1, 2), attribute + " : " + newType + " " + "\n  ");
        return fix;
    }
}
exports.Emojinfo = Emojinfo;
Emojinfo.providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
//# sourceMappingURL=codeActionsProvider.js.map