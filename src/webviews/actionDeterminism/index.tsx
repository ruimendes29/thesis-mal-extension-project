import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './components/App';

declare global {
    interface Window {
      acquireVsCodeApi(): any;
    }
  }
  
  const vscode = window.acquireVsCodeApi();

import './index.css';
import './vscode.css';

ReactDOM.render(
    <App vscode={vscode}/>,
    document.getElementById('root')
);