import * as vscode from "vscode";
import {
  attributes,
  actions,
  defines,
  enums,
  getInteractorByLine,
  aggregates,
  ranges,
  arrays,
  currentInteractor,
} from "../parsers/globalParserInfo";
import { findValueType } from "../parsers/relations/typeFindes";
import { countSpacesAtStart } from "../parsers/textParser";

export const provider1 = vscode.languages.registerCompletionItemProvider("mal", {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ) {
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
      if (linePrefix.charAt(linePrefix.length - 1) === "[" || linePrefix.includes("per(")) {
        return Array.from(actions.get(getInteractorByLine(position.line)!)!).map(
          ([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)
        );
      } else if (
        linePrefix.charAt(linePrefix.length - 1) === "=" &&
        (match = linePrefix.match(/(?<=(^|\s))(([0-9A-Za-z])+\s*[\.\'\=]{1})+/)) !== null
      ) {
        const separators = /(\.|\'|\=)/;
        const splitted = match[0].split(separators).filter((el) => el.trim() !== "" && !separators.test(el));
        let current = getInteractorByLine(position.line);
        for (let aggregated of splitted) {
          if (aggregates.has(aggregated) && aggregates.get(aggregated)!.current === current) {
            current = aggregates.get(aggregated)!.included;
          } else {
            break;
          }
        }
        const valueType = findValueType(splitted[splitted.length - 1], current);
        if (enums.has(valueType!)) {
          return enums
            .get(valueType!)!
            .values.map((v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember));
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    },
  },
  "(",
  "[",
  "="
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

const fromMapToType = (mapToType: Map<any, any>): vscode.CompletionItem[] => {
  return [
    ...Array.from(mapToType).map(([k, v]) => new vscode.CompletionItem(k, vscode.CompletionItemKind.TypeParameter)),
  ];
};

export const provider4 = vscode.languages.registerCompletionItemProvider(
  "mal",
  {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      return [
        ...fromMapToType(enums),
        ...fromMapToType(ranges),
        ...fromMapToType(arrays),
        new vscode.CompletionItem("boolean", vscode.CompletionItemKind.TypeParameter),
      ];
    },
  },
  ":",
  "of" // triggered whenever a '.' is being typed
);

export const provider5 = vscode.languages.registerCompletionItemProvider("mal", {
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
    const cc = new vscode.CompletionItem("keep remaining", vscode.CompletionItemKind.Snippet);
    let lineText = document.lineAt(position.line).text;
    let i = 1;
    while (countSpacesAtStart(document.lineAt(position.line - i).text) < countSpacesAtStart(lineText)) {
      lineText = document.lineAt(position.line - i).text + lineText;
      i++;
    }
    /* Get the variables that ARE defined in the next state */

    // parse normal variables
    const rx = /(\w+\s*\')/;
    let variablesChanged = lineText
      .split(rx)
      .filter((el) => rx.test(el))
      .map((el) => el.slice(0, el.length - 1).trim());

    const variablesToKeep = Array.from(attributes.get(getInteractorByLine(position.line))!)
      .map((el) => el[0])
      .filter((el) => !variablesChanged.includes(el));
    let lineToInsert = "keep(";
    for (let i = 0; i < variablesToKeep.length; i++) {
      if (i === variablesToKeep.length - 1) {
        lineToInsert += variablesToKeep[i] + ")";
      } else {
        lineToInsert += variablesToKeep[i] + ", ";
      }
    }
    cc.insertText = lineToInsert;
    return [cc];
  },
});
