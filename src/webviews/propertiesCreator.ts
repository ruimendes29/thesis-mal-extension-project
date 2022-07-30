import * as vscode from "vscode";
import { getArrayInStore, getArrayWrittenInfo } from "../parsers/arrayRelations";
import { actions, arrays, attributes, enums, interactorLimits, ranges } from "../parsers/globalParserInfo";
import { findValueType } from "../parsers/relations/typeFindes";

export class PropertiesProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "mal-properties";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  private findValuesWithSameType = (argumentName: string, interactor: string, type: string, arrayToAdd: any[]) => {
    for (let att of attributes.get(interactor)!) {
      if (findValueType(att[0], interactor) === type) {
        arrayToAdd.push(att[0]);
      }
    }
    if (type === "boolean") {
      arrayToAdd.push("TRUE", "FALSE");
    }
    if (enums.has(type!)) {
      arrayToAdd.push(...enums.get(type!)!.values);
    }

    arrayToAdd.push("$" + attributes.get(interactor)!.get(argumentName)!.type);
  };

  private getValidValues = (arg: string, interactor: string) => {
    const toRet: any[] = [];
    const possibleArrayName = getArrayWrittenInfo(arg);
    if (attributes.has(interactor) && attributes.get(interactor)!.has(arg)) {
      const foundValueTypeForArg = findValueType(arg, interactor)!;
      this.findValuesWithSameType(arg,interactor,foundValueTypeForArg,toRet);
     } else {
      if (attributes.has(interactor) && attributes.get(interactor)!.has(possibleArrayName.arrayName)) {
        const foundValueTypeForArg = getArrayInStore(possibleArrayName.arrayName, interactor).type!;
        this.findValuesWithSameType(possibleArrayName.arrayName,interactor,foundValueTypeForArg,toRet);
      }
    }

    return toRet;
  };

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "interactor-info": {
          const possibleAtts = attributes.has(data.interactor)
            ? Array.from(attributes.get(data.interactor)!)
                .map(([key, v]) => {
                  if (arrays.has(v.type!)) {
                    const toRet = [];
                    const arrayInfo = arrays.get(v.type!)!;
                    for (let i = arrayInfo.firstIndex; i <= arrayInfo.lastIndex; i++) {
                      toRet.push(key + "[" + i + "]");
                    }
                    for (let r of Array.from(ranges).filter(
                      ([rk, rv]) => rv.maximum <= arrayInfo.lastIndex && rv.minimum >= arrayInfo.firstIndex
                    )) {
                      toRet.push(key + "[" + r[0] + "]");
                    }
                    return toRet;
                  } else {
                    return key;
                  }
                })
                .flat()
            : [];
          const possibleActions = actions.has(data.interactor)
            ? Array.from(actions.get(data.interactor)!).map(([key, v]) => "effected(" + key + ")")
            : [];
          webviewView.webview.postMessage({
            key: data.key,
            type: "interactor-info-response",
            possibilities: [...possibleAtts, ...possibleActions],
          });
          break;
        }
        case "get-interactors": {
          webviewView.webview.postMessage({
            type: "interactors-response",
            possibilities: Array.from(interactorLimits).map(([key, val]) => key),
          });
          break;
        }
        case "get-valid-values": {
          webviewView.webview.postMessage({
            key: data.key,
            type: "valid-values-response",
            possibilities: this.getValidValues(data.value, data.interactor),
          });
          break;
        }
        case "insert": {
          const p = new vscode.Position(
            interactorLimits.get(data.interactor)!.end !== undefined
              ? interactorLimits.get(data.interactor)!.end!
              : vscode.window.activeTextEditor!.document.lineCount + 1,
            0
          );
          vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString("test\n" + data.value + "\n"), p);
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const reactAppUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "configPropertiesCreator", "configPropertiesCreator.js")
    );

    return /*html*/ `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Properties Creator</title>
        <meta http-equiv="Content-Security-Policy"
              content="default-src 'none';
                      img-src https:;
                      script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
                      style-src vscode-resource: 'unsafe-inline';">
        <script>
          window.acquireVsCodeApi = acquireVsCodeApi;
        </script>
      </head>
			<body>
        <div id="root"></div>
        <script src="${reactAppUri}"></script>
      </body>
			</html>`;
  }
}
