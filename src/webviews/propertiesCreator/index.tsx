import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./components/App";
import TabProvider from "./store/TabProvider";

declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}

const vscode = window.acquireVsCodeApi();

import "./index.css";
import "./vscode.css";

ReactDOM.render(
  <TabProvider>
    <App vscode={vscode} />
  </TabProvider>,
  document.getElementById("root")
);
