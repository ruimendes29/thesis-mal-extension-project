"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandHandler = void 0;
const vscode = require("vscode");
const globalParserInfo_1 = require("../parsers/globalParserInfo");
//TODO verificar se os tipos existem
//TODO verificar se os defines sao valores validos
const commandHandler = () => {
    const informationMessage = [];
    for (let x of globalParserInfo_1.actionsToAttributes) {
        informationMessage.push(x[0] + " attributes a value for " + x[1].size + " out of " + globalParserInfo_1.attributes.size + "\n");
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
exports.commandHandler = commandHandler;
//# sourceMappingURL=commands.js.map