import * as vscode from "vscode";
import { Emojinfo } from "./codeActions/codeActionsProvider";
import { clearDiagnosticCollection } from "./diagnostics/diagnostics";
import { actions, attributes, clearStoredValues, defines, enums } from "./parsers/globalParserInfo";
import { findValueType } from "./parsers/relationParser";
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
  const provider1 = vscode.languages.registerCompletionItemProvider("mal", {
    provideCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      token: vscode.CancellationToken,
      context: vscode.CompletionContext
    ) {
      // a simple completion item which inserts `Hello World!`
      const simpleCompletion = new vscode.CompletionItem("Hello World!");

      const attributesCompletion = Array.from(attributes).map(
        ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable)
      );
      const actionsCompletion = Array.from(actions).map(
        ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)
      );
      const definesCompletion = Array.from(defines).map(
        ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Constant)
      );

      // return all completion items as array
      return [...attributesCompletion, ...definesCompletion, ...actionsCompletion];
    },
  });

  const provider2 = vscode.languages.registerCompletionItemProvider(
    "mal",
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        // get all text until the `position` and check if it reads `console.`
        // and if so then complete if `log`, `warn`, and `error`
        let match;
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (linePrefix.match(/\[/)) {
          return Array.from(actions).map(
            ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)
          );
        } else if ((match = linePrefix.match(/(\w+)\s*\=/)) !==null) {
          console.log(findValueType(match[1]));//Valor dentro do capture group
          if (enums.has(findValueType(match[1])!))
          {
            return enums.get(findValueType(match[1])!)!.values.map(v=>new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember));
          }
          else {return undefined;}
        } else {
          return undefined;
        }
      },
    },
    "[","=" // triggered whenever a '.' is being typed
  );

  context.subscriptions.push(provider1,provider2);

  context.subscriptions.push(diagnosticCollection);

  vscode.window.onDidChangeActiveTextEditor(() => {});

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
