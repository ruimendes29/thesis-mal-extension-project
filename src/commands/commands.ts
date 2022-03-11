import * as vscode from "vscode";
import { actionsToAttributes } from "../parsers/globalParserInfo";
//TODO verificar se os tipos existem
//TODO verificar se os defines sao valores validos
export const commandHandler = () => {
    for (let x of actionsToAttributes)
    {
        console.log(x[0]);
        console.log(x[1]);
    }
    vscode.window.showInformationMessage('Hello World');
        console.log(`Hello World!!!`);
  };