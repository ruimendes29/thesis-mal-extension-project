import * as vscode from "vscode";
import { Emojinfo } from "./codeActions/codeActionsProvider";
import { provider1, provider2 } from "./codeCompletion/codeCompletionProvider";
import { commandHandler } from "./commands/commands";
import { clearDiagnosticCollection } from "./diagnostics/diagnostics";
import { clearStoredValues } from "./parsers/globalParserInfo";
import { _parseText } from "./parsers/textParser";

const tokenTypes = new Map<string, number>();
const tokenModifiers = new Map<string, number>();

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

  const tokenModifiersLegend: any[] | undefined = [];
  tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

  return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();

export const diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection();

export function activate(context: vscode.ExtensionContext) {

  const command = 'mal.checkIfActionsAreDeterministic';

  context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

  context.subscriptions.push(provider1,provider2);

  context.subscriptions.push(diagnosticCollection);

  vscode.window.onDidChangeActiveTextEditor(() => {clearStoredValues();clearDiagnosticCollection();});

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider("mal", new Emojinfo(), {
      providedCodeActionKinds: Emojinfo.providedCodeActionKinds,
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      { language: "mal" },
      new DocumentSemanticTokensProvider(),
      legend
    )
  );
}

class DocumentSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
  async provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.SemanticTokens> {
    const allTokens = _parseText(document.getText());
    const builder = new vscode.SemanticTokensBuilder();
    allTokens.forEach((token) => {
      builder.push(
        token.line,
        token.startCharacter,
        token.length,
        this._encodeTokenType(token.tokenType),
        this._encodeTokenModifiers(token.tokenModifiers)
      );
    });
    return builder.build();
  }

  private _encodeTokenType(tokenType: string): number {
    if (tokenTypes.has(tokenType)) {
      return tokenTypes.get(tokenType)!;
    } else if (tokenType === "notInLegend") {
      return tokenTypes.size + 2;
    }
    return 0;
  }

  private _encodeTokenModifiers(strTokenModifiers: string[]): number {
    let result = 0;
    for (let i = 0; i < strTokenModifiers.length; i++) {
      const tokenModifier = strTokenModifiers[i];
      if (tokenModifiers.has(tokenModifier)) {
        result = result | (1 << tokenModifiers.get(tokenModifier)!);
      } else if (tokenModifier === "notInLegend") {
        result = result | (1 << (tokenModifiers.size + 2));
      }
    }
    return result;
  }
}
