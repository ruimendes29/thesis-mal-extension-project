import * as vscode from "vscode";
import { actions, attributes, interactorLimits } from "../parsers/globalParserInfo";

export class PropertiesProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "mal-properties";

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
        case "interactor-info": {
          const possibleAtts = attributes.has(data.interactor)
            ? Array.from(attributes.get(data.interactor)!).map(([key, v]) => key)
            : [];
          const possibleActions = actions.has(data.interactor)
            ? Array.from(actions.get(data.interactor)!).map(([key, v]) => "effected(" + key + ")")
            : [];
          webviewView.webview.postMessage({
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
