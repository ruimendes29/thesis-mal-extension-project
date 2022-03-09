import * as vscode from "vscode";
import { actions, attributes, defines } from "../parsers/globalParserInfo";

export const provideBasicCompletion = (
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ) => {
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
  };