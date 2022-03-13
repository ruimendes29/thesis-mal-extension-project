import * as vscode from "vscode";
import { actionsToAttributes, attributes } from "../parsers/globalParserInfo";
//TODO verificar se os tipos existem
//TODO verificar se os defines sao valores validos
export const commandHandler = () => {
  const informationMessage = [];
  for (let x of actionsToAttributes) {
    informationMessage.push(
      x[0] + " attributes a value for " + x[1].size + " out of " + attributes.size + "\n"
    );
    let i = 0;
    for (let att of x[1]) {
      informationMessage.push(att);
      if (i < x[1].size) {
        informationMessage.push(", ");
      }
      i++;
    }
    informationMessage.push(" )\\n");
  }
  vscode.window.showInformationMessage(informationMessage.join(""));
  console.log(`Hello World!!!`);
};
