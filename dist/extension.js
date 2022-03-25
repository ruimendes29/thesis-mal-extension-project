"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.diagnosticCollection = void 0;
const vscode = require("vscode");
const codeActionsProvider_1 = require("./codeActions/codeActionsProvider");
const codeCompletionProvider_1 = require("./codeCompletion/codeCompletionProvider");
const commands_1 = require("./commands/commands");
const diagnostics_1 = require("./diagnostics/diagnostics");
const globalParserInfo_1 = require("./parsers/globalParserInfo");
const textParser_1 = require("./parsers/textParser");
const actionsDeterminism_1 = require("./webviews/actionsDeterminism");
const tokenTypes = new Map();
const tokenModifiers = new Map();
const legend = (function () {
    const tokenTypesLegend = [
        "comment",
        "string",
        "keyword",
        "number",
        "regexp",
        "operator",
        "namespace",
        "type",
        "struct",
        "class",
        "interface",
        "enum",
        "typeParameter",
        "function",
        "method",
        "decorator",
        "macro",
        "variable",
        "parameter",
        "property",
        "label",
    ];
    tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));
    const tokenModifiersLegend = [];
    tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));
    return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();
exports.diagnosticCollection = vscode.languages.createDiagnosticCollection();
function activate(context) {
    const command = 'mal.checkIfActionsAreDeterministic';
    context.subscriptions.push(vscode.commands.registerCommand(command, commands_1.commandHandler));
    context.subscriptions.push(codeCompletionProvider_1.provider1, codeCompletionProvider_1.provider2, codeCompletionProvider_1.provider3);
    context.subscriptions.push(exports.diagnosticCollection);
    vscode.window.onDidChangeActiveTextEditor(() => { (0, globalParserInfo_1.clearStoredValues)(); (0, diagnostics_1.clearDiagnosticCollection)(); });
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider("mal", new codeActionsProvider_1.Emojinfo(), {
        providedCodeActionKinds: codeActionsProvider_1.Emojinfo.providedCodeActionKinds,
    }));
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: "mal" }, new DocumentSemanticTokensProvider(), legend));
    const provider = new actionsDeterminism_1.ActionsDeterminismProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(actionsDeterminism_1.ActionsDeterminismProvider.viewType, provider));
}
exports.activate = activate;
class DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(document, token) {
        const allTokens = (0, textParser_1._parseText)(document.getText());
        const builder = new vscode.SemanticTokensBuilder();
        allTokens.forEach((token) => {
            builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
        });
        return builder.build();
    }
    _encodeTokenType(tokenType) {
        if (tokenTypes.has(tokenType)) {
            return tokenTypes.get(tokenType);
        }
        else if (tokenType === "notInLegend") {
            return tokenTypes.size + 2;
        }
        return 0;
    }
    _encodeTokenModifiers(strTokenModifiers) {
        let result = 0;
        for (let i = 0; i < strTokenModifiers.length; i++) {
            const tokenModifier = strTokenModifiers[i];
            if (tokenModifiers.has(tokenModifier)) {
                result = result | (1 << tokenModifiers.get(tokenModifier));
            }
            else if (tokenModifier === "notInLegend") {
                result = result | (1 << (tokenModifiers.size + 2));
            }
        }
        return result;
    }
}
//# sourceMappingURL=extension.js.map