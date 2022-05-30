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
const propertiesCreator_1 = require("./webviews/propertiesCreator");
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
    const command = "mal.checkIfActionsAreDeterministic";
    context.subscriptions.push(vscode.commands.registerCommand(command, commands_1.commandHandler));
    context.subscriptions.push(codeCompletionProvider_1.provider1, codeCompletionProvider_1.provider2, codeCompletionProvider_1.provider3, codeCompletionProvider_1.provider4, codeCompletionProvider_1.provider5);
    context.subscriptions.push(exports.diagnosticCollection);
    vscode.window.onDidChangeActiveTextEditor(() => {
        (0, globalParserInfo_1.clearStoredValues)();
        (0, diagnostics_1.clearDiagnosticCollection)();
    });
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider("mal", new codeActionsProvider_1.MyCodeActionProvider(), {
        providedCodeActionKinds: codeActionsProvider_1.MyCodeActionProvider.providedCodeActionKinds,
    }));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider({ language: "mal" }, new MyDefinitionProvider()));
    context.subscriptions.push(vscode.languages.registerHoverProvider({ language: "mal" }, new MyHoverProvider()));
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: "mal" }, new DocumentSemanticTokensProvider(), legend));
    const actionsProvider = new actionsDeterminism_1.ActionsDeterminismProvider(context.extensionUri);
    const propertiesProvider = new propertiesCreator_1.PropertiesProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(actionsDeterminism_1.ActionsDeterminismProvider.viewType, actionsProvider));
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(propertiesCreator_1.PropertiesProvider.viewType, propertiesProvider));
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
class MyHoverProvider {
    provideHover(document, position, token) {
        const wordRange = document.getWordRangeAtPosition(position);
        const word = document.getText(wordRange);
        switch (word) {
            case "per":
                return new vscode.Hover(new vscode.MarkdownString("**per** is a keyword of **MAL** that allows the user to specify in what cases an action is valid.\nThe expression `per(ac)->a=b` means that the action **ac** can only happen when the attribute **a** equals **b** "), wordRange);
            case "keep":
                return new vscode.Hover(new vscode.MarkdownString("**keep** is a keyword of **MAL** that allows the user to tell the compiler that the value of the attributes defined after maintain their values in the next state, so that the changes in state can be deterministic."), wordRange);
        }
        return undefined;
    }
}
class MyDefinitionProvider {
    provideDefinition(document, position, token) {
        const wordRange = document.getWordRangeAtPosition(position);
        const word = document.getText(wordRange);
        for (const interactorInAttributes of Array.from(globalParserInfo_1.attributes)) {
            if (interactorInAttributes[1].has(word)) {
                const line = interactorInAttributes[1].get(word).line;
                return new vscode.Location(document.uri, new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, document.lineAt(line).text.length)));
            }
        }
        for (const interactorInActions of Array.from(globalParserInfo_1.actions)) {
            if (interactorInActions[1].has(word)) {
                const line = interactorInActions[1].get(word).line;
                return new vscode.Location(document.uri, new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, document.lineAt(line).text.length)));
            }
        }
        return null;
    }
}
//# sourceMappingURL=extension.js.map