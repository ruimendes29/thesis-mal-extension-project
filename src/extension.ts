import * as vscode from "vscode";
import { MyCodeActionProvider } from "./codeActions/codeActionsProvider";
import { provider1, provider2, provider3, provider4, provider5 } from "./codeCompletion/codeCompletionProvider";
import { commandHandler } from "./commands/commands";
import { clearDiagnosticCollection } from "./diagnostics/diagnostics";
import { actions, attributes, clearStoredValues } from "./parsers/globalParserInfo";
import { _parseText } from "./parsers/textParser";
import { ActionsDeterminismProvider } from "./webviews/actionsDeterminism";
import { PropertiesProvider } from "./webviews/propertiesCreator";

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
  const command = "mal.checkIfActionsAreDeterministic";

  context.subscriptions.push(vscode.commands.registerCommand(command, commandHandler));

  context.subscriptions.push(provider1, provider2, provider3, provider4,provider5);

  context.subscriptions.push(diagnosticCollection);

  vscode.window.onDidChangeActiveTextEditor(() => {
    clearStoredValues();
    clearDiagnosticCollection();
  });

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider("mal", new MyCodeActionProvider(), {
      providedCodeActionKinds: MyCodeActionProvider.providedCodeActionKinds,
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider({ language: "mal" }, new MyDefinitionProvider())
  );

  context.subscriptions.push(vscode.languages.registerHoverProvider({ language: "mal" }, new MyHoverProvider()));

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      { language: "mal" },
      new DocumentSemanticTokensProvider(),
      legend
    )
  );

  const actionsProvider = new ActionsDeterminismProvider(context.extensionUri);

  const propertiesProvider = new PropertiesProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ActionsDeterminismProvider.viewType, actionsProvider)
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(PropertiesProvider.viewType, propertiesProvider)
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

class MyHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const wordRange = document.getWordRangeAtPosition(position);
    const word = document.getText(wordRange);
    switch (word) {
      case "per":
        return new vscode.Hover(
          new vscode.MarkdownString(
            "**per** is a keyword of **MAL** that allows the user to specify in what cases an action is valid.\nThe expression `per(ac)->a=b` means that the action **ac** can only happen when the attribute **a** equals **b** "
          ),
          wordRange
        );
      case "keep":
        return new vscode.Hover(
          new vscode.MarkdownString(
            "**keep** is a keyword of **MAL** that allows the user to tell the compiler that the value of the attributes defined after maintain their values in the next state, so that the changes in state can be deterministic."
          ),
          wordRange
        );
    }
    if (word === "per") {
    }

    return undefined;
  }
}

class MyDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const wordRange = document.getWordRangeAtPosition(position);
    const word = document.getText(wordRange);
    for (const interactorInAttributes of Array.from(attributes)) {
      if (interactorInAttributes[1].has(word)) {
        const line = interactorInAttributes[1].get(word)!.line;
        return new vscode.Location(
          document.uri,
          new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, document.lineAt(line).text.length))
        );
      }
    }
    for (const interactorInActions of Array.from(actions)) {
      if (interactorInActions[1].has(word)) {
        const line = interactorInActions[1].get(word)!.line;
        return new vscode.Location(
          document.uri,
          new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, document.lineAt(line).text.length))
        );
      }
    }
    return null;
  }
}
