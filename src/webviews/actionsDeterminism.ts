import * as vscode from "vscode";
import { actions, actionsToAttributes, aggregates, attributes, interactorLimits } from "../parsers/globalParserInfo";

export class ActionsDeterminismProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "mal-deterministic";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

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
        case "receiveActions": {
          webviewView.webview.postMessage({
            type: "refreshActions",
            interactors: Array.from(interactorLimits).map(([key, _value]) => key),
            actions: Array.from(actionsToAttributes).map(([mainInteractor, insideInteractors]) => {
              return {
                mainInteractor: mainInteractor,
                insideInteractors: Array.from(insideInteractors).map(([interactorName, actionsInInteractor]) => {
                  return {
                    includedInteractor: interactorName === mainInteractor ? "self" : interactorName,
                    actions: Array.from(actionsInInteractor).map(([actionName, attributesAttended]) => {
                      const joinedAtts = this.joinAttributesFromInteractors(mainInteractor);
                      return {
                        actionName: actionName,
                        totalAttributes: joinedAtts.length,
                        attributes: joinedAtts.filter((el) => !attributesAttended.has(el)),
                      };
                    }),
                  };
                }),
              };
            }),
          });
          break;
        }
      }
    });
  }

  private joinAttributesFromInteractors(main: string): string[] {
    const mySet = new Set<string>();
    for (let included of Array.from(aggregates)
      .filter((el) => el[1].current === main)
      .map(([key, value]) => value.included)) {
      if (attributes.has(included)) {
        for (let x of Array.from(attributes.get(included)!).map(([key, value]) => key)) {
          if (included !== main) {
            const aggregatedName = Array.from(aggregates).filter(
              (el) => el[1].current === main && el[1].included === included
            )[0][0];
            mySet.add(aggregatedName + "." + x);
          } else {
            mySet.add(x);
          }
        }
      }
    }
    if (attributes.has(main)) {
      for (let x of Array.from(attributes.get(main)!).map(([key, value]) => key)) {
        mySet.add(x);
      }
    }
    return [...mySet];
  }

  private _getHtmlForWebview(webview: vscode.Webview) {

    const reactAppUri =  webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "configActionDeterminism", "configActionDeterminism.js"));

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return /*html*/`<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Determinism of Actions</title>
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

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
