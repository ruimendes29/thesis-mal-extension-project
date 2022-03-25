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

    const attributesCompletion = attributes.has(getInteractorByLine(position.line))
      ? Array.from(attributes.get(getInteractorByLine(position.line)!)!).map(
          ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable)
        )
      : [];
    const actionsCompletion = actions.has(getInteractorByLine(position.line))
      ? Array.from(actions.get(getInteractorByLine(position.line)!)!).map(
          ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)
        )
      : [];
    const definesCompletion = Array.from(defines).map(
      ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Constant)
    );
    const aggregatesCompletion = Array.from(aggregates)
            .filter(([key, value]) => value.current === getInteractorByLine(position.line))
            .map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Interface));

    // return all completion items as array
    return [...attributesCompletion, ...definesCompletion, ...actionsCompletion, ...aggregatesCompletion];
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
      const result = [];
      if (linePrefix.charAt(linePrefix.length - 1) === ".") {
        const lineSep = linePrefix
          .split(/(\.)/)
          .map((el) => el.split(/([^\w]+)/))
          .flat()
          .filter((el) => el.trim() !== "");

        let toTake = false;
        for (let i = lineSep.length - 1; i >= 0; i--) {
          if (lineSep[i].trim() === ".") {
            toTake = true;
          } else {
            if (!toTake) {
              break;
            }
            result.unshift(lineSep[i]);
            toTake = false;
          }
        }
        let current = getInteractorByLine(position.line);
        for (let aggregated of result) {
          if (aggregates.has(aggregated) && aggregates.get(aggregated)!.current === current) {
            current = aggregates.get(aggregated)!.included;
          } else {
            break;
          }
        }

        return [
          ...Array.from(aggregates)
            .filter(([key, value]) => value.current === current)
            .map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Interface)),
          ...Array.from(actions.get(current)!).map(
            ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)
          ),
          ...Array.from(attributes.get(current)!).map(
            ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable)
          ),
        ];
      } else {
        return undefined;
      }
    },
  },
  "." // triggered whenever a '.' is being typed
);
