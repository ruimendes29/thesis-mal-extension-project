import * as vscode from "vscode";
import {
  attributes,
  actions,
  defines,
  enums,
  getInteractorByLine,
  aggregates,
} from "../parsers/globalParserInfo";
import { findValueType } from "../parsers/relations/typeFindes";

export const provider1 = vscode.languages.registerCompletionItemProvider("mal", {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ) {
    // a simple completion item which inserts `Hello World!`
    const simpleCompletion = new vscode.CompletionItem("Hello World!");

    const attributesCompletion =attributes.has(getInteractorByLine(position.line))? Array.from(attributes.get(getInteractorByLine(position.line)!)!)
      .map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable)):[];
    const actionsCompletion = actions.has(getInteractorByLine(position.line))?Array.from(actions.get(getInteractorByLine(position.line)!)!)
      .map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)):[];
    const definesCompletion = Array.from(defines).map(
      ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Constant)
    );

    // return all completion items as array
    return [...attributesCompletion, ...definesCompletion, ...actionsCompletion];
  },
});

export const provider2 = vscode.languages.registerCompletionItemProvider(
  "mal",
  {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      // get all text until the `position` and check if it reads `console.`
      // and if so then complete if `log`, `warn`, and `error`
      let match;
      const linePrefix = document.lineAt(position).text.slice(0, position.character);
      if (linePrefix.charAt(linePrefix.length - 1) === "[") {
        return Array.from(actions.get(getInteractorByLine(position.line)!)!).map(
          ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)
        );
      } else if (
        linePrefix.charAt(linePrefix.length - 1) === "=" &&
        (match = linePrefix.match(/(\w+)\s*\=/)) !== null
      ) {
        if (enums.has(findValueType(match[1])!)) {
          return enums
            .get(findValueType(match[1])!)!
            .values.map((v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember));
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    },
  },
  "[",
  "=" // triggered whenever a '.' is being typed
);

export const provider3 = vscode.languages.registerCompletionItemProvider(
  "mal",
  {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      // get all text until the `position` and check if it reads `console.`
      // and if so then complete if `log`, `warn`, and `error`
      let match;
      const linePrefix = document.lineAt(position).text.slice(0, position.character);
      if (linePrefix.charAt(linePrefix.length - 1) === ".") {
        let c = "r";
        let includeToCheckArray = [];
        let i = linePrefix.length - 1;
        while ( i > 0) {
          c = linePrefix.charAt(--i);
          if (/\w/.test(c))
          {
            includeToCheckArray.unshift(c);
          }
          else {break;}
        } if (aggregates.has(includeToCheckArray.join("").trim())) {
          let { included, current } = aggregates.get(includeToCheckArray.join("").trim())!;
          if (current === getInteractorByLine(position.line)) {
            return [
              ...Array.from(actions.get(included)!).map(
                ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)
              ),
              ...Array.from(attributes.get(included)!).map(
                ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable)
              ),
            ];
          } else {
            return undefined;
          }
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    },
  },
  "." // triggered whenever a '.' is being typed
);
