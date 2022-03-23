/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = exports.diagnosticCollection = void 0;
const vscode = __webpack_require__(1);
const codeActionsProvider_1 = __webpack_require__(2);
const codeCompletionProvider_1 = __webpack_require__(6);
const commands_1 = __webpack_require__(13);
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const textParser_1 = __webpack_require__(14);
const actionsDeterminism_1 = __webpack_require__(20);
const tokenTypes = new Map();
const tokenModifiers = new Map();
const legend = (function () {
    const tokenTypesLegend = [
        "comment",
        "string",
        "keyword",
        "number",
        "regexp",
        "operator",
        "namespace",
        "type",
        "struct",
        "class",
        "interface",
        "enum",
        "typeParameter",
        "function",
        "method",
        "decorator",
        "macro",
        "variable",
        "parameter",
        "property",
        "label",
    ];
    tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(tokenType, index));
    const tokenModifiersLegend = [];
    tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));
    return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
})();
exports.diagnosticCollection = vscode.languages.createDiagnosticCollection();
function activate(context) {
    const command = 'mal.checkIfActionsAreDeterministic';
    context.subscriptions.push(vscode.commands.registerCommand(command, commands_1.commandHandler));
    context.subscriptions.push(codeCompletionProvider_1.provider1, codeCompletionProvider_1.provider2, codeCompletionProvider_1.provider3);
    context.subscriptions.push(exports.diagnosticCollection);
    vscode.window.onDidChangeActiveTextEditor(() => { (0, globalParserInfo_1.clearStoredValues)(); (0, diagnostics_1.clearDiagnosticCollection)(); });
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider("mal", new codeActionsProvider_1.Emojinfo(), {
        providedCodeActionKinds: codeActionsProvider_1.Emojinfo.providedCodeActionKinds,
    }));
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: "mal" }, new DocumentSemanticTokensProvider(), legend));
    const provider = new actionsDeterminism_1.ActionsDeterminismProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(actionsDeterminism_1.ActionsDeterminismProvider.viewType, provider));
}
exports.activate = activate;
class DocumentSemanticTokensProvider {
    async provideDocumentSemanticTokens(document, token) {
        const allTokens = (0, textParser_1._parseText)(document.getText());
        const builder = new vscode.SemanticTokensBuilder();
        allTokens.forEach((token) => {
            builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
        });
        return builder.build();
    }
    _encodeTokenType(tokenType) {
        if (tokenTypes.has(tokenType)) {
            return tokenTypes.get(tokenType);
        }
        else if (tokenType === "notInLegend") {
            return tokenTypes.size + 2;
        }
        return 0;
    }
    _encodeTokenModifiers(strTokenModifiers) {
        let result = 0;
        for (let i = 0; i < strTokenModifiers.length; i++) {
            const tokenModifier = strTokenModifiers[i];
            if (tokenModifiers.has(tokenModifier)) {
                result = result | (1 << tokenModifiers.get(tokenModifier));
            }
            else if (tokenModifier === "notInLegend") {
                result = result | (1 << (tokenModifiers.size + 2));
            }
        }
        return result;
    }
}


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Emojinfo = void 0;
const vscode = __webpack_require__(1);
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
const COMMAND = "mal.command";
/**
 * Provides code actions corresponding to diagnostic problems.
 */
class Emojinfo {
    provideCodeActions(document, range, context, token) {
        // for each diagnostic entry that has the matching `code`, create a code action command
        return context.diagnostics.map((diagnostic) => {
            const diagnosticS = (diagnostic.code + "").split(":");
            switch (diagnostic.code.toString().split(":")[0]) {
                case diagnostics_1.DECLARE_ACTION:
                    return this.declareAction(document, diagnostic.code.toString().split(":")[1], diagnostic);
                case diagnostics_1.CHANGE_TYPE:
                    return this.changeToCorrectType(document, diagnosticS[1], +diagnosticS[2], diagnosticS[3], diagnostic);
                case diagnostics_1.ALREADY_DEFINED:
                    //ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
                    return this.alreadyDefined(document, +diagnosticS[1], diagnosticS[2], diagnostic);
                case diagnostics_1.DEFINE_ATTRIBUTE:
                    //DEFINE_ATTRIBUTE +":"+findValueType(val)+":"+attribute
                    return this.addAttribute(document, diagnosticS[1], diagnosticS[2], diagnostic);
                default:
                    return new vscode.CodeAction(`No QuickFix available`, vscode.CodeActionKind.QuickFix);
            }
        });
    }
    alreadyDefined(document, lineToFix, defined, diagnostic) {
        const fix = new vscode.CodeAction(`Delete already defined ${defined}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(lineToFix).text;
        const actionRange = new vscode.Range(new vscode.Position(lineToFix - 1, document.lineAt(Math.max(0, lineToFix - 1)).text.length), new vscode.Position(lineToFix, line.length));
        fix.edit.replace(document.uri, actionRange, "");
        return fix;
    }
    changeToCorrectType(document, newType, lineToFix, attribute, diagnostic) {
        const fix = new vscode.CodeAction(`Convert to ${newType}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(lineToFix).text;
        const characterOfType = line.indexOf(":") + 2;
        if (globalParserInfo_1.attributes.get((0, globalParserInfo_1.getInteractorByLine)(lineToFix)).get(attribute).alone) {
            const oldTypeRange = new vscode.Range(new vscode.Position(lineToFix, characterOfType), new vscode.Position(lineToFix, line.indexOf("#") > 0 ? line.indexOf("#") : line.length));
            fix.edit.replace(document.uri, oldTypeRange, newType + " ");
        }
        else {
            const indexOfComma = line.slice(ParseSection_1.ParseSection.getPosition(line, attribute, 1) + attribute.length - 1).indexOf(",");
            const oldAttributeRange = new vscode.Range(new vscode.Position(lineToFix, ParseSection_1.ParseSection.getPosition(line, attribute, 1)), new vscode.Position(lineToFix, ParseSection_1.ParseSection.getPosition(line, attribute, 1) + attribute.length + (indexOfComma > 0 ? indexOfComma : 0)));
            fix.edit.replace(document.uri, oldAttributeRange, "");
            fix.edit.insert(document.uri, new vscode.Position(lineToFix + 1, 2), attribute + " : " + newType + " " + "\n  ");
        }
        return fix;
    }
    declareAction(document, newAction, diagnostic) {
        const fix = new vscode.CodeAction(`Declare ${newAction} as an action`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, new vscode.Position(globalParserInfo_1.actionsStartingLine[0] + 1, 0), "  " + newAction + "\n");
        return fix;
    }
    addAttribute(document, newType, attribute, diagnostic) {
        const fix = new vscode.CodeAction(`Add ${attribute} with type ${newType}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, new vscode.Position(globalParserInfo_1.attributesStartingLine[0] + 1, 2), attribute + " : " + newType + " " + "\n  ");
        return fix;
    }
}
exports.Emojinfo = Emojinfo;
Emojinfo.providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addDiagnosticToRelation = exports.addDiagnostic = exports.clearDiagnosticCollection = exports.DEFINE_ATTRIBUTE = exports.NOT_YET_IMPLEMENTED = exports.ALREADY_DEFINED = exports.DECLARE_ACTION = exports.CHANGE_TYPE = void 0;
const vscode = __webpack_require__(1);
const extension_1 = __webpack_require__(0);
exports.CHANGE_TYPE = "changeType";
exports.DECLARE_ACTION = "declareAction";
exports.ALREADY_DEFINED = "alreadyDefined";
exports.NOT_YET_IMPLEMENTED = "notYetImplemented";
exports.DEFINE_ATTRIBUTE = "defineAttribute";
const mapForDiag = new Map();
const clearDiagnosticCollection = () => {
    extension_1.diagnosticCollection.clear();
    mapForDiag.clear();
};
exports.clearDiagnosticCollection = clearDiagnosticCollection;
const addDiagnostic = (initialLineNumber, initialCharacter, finalLineNumber, finalCharacter, diagnosticMessage, severity, code) => {
    let severityType;
    switch (severity) {
        case "error":
            severityType = vscode.DiagnosticSeverity.Error;
            break;
        case "warning":
            severityType = vscode.DiagnosticSeverity.Warning;
            break;
        case "info":
            severityType = vscode.DiagnosticSeverity.Information;
            break;
        case "hint":
            severityType = vscode.DiagnosticSeverity.Hint;
            break;
    }
    const diagnostic = new vscode.Diagnostic(new vscode.Range(new vscode.Position(initialLineNumber, initialCharacter), new vscode.Position(finalLineNumber, finalCharacter)), diagnosticMessage, severityType);
    diagnostic.code = code ? code : "";
    const currentUri = vscode.window.activeTextEditor.document.uri;
    if (!mapForDiag.has(currentUri)) {
        mapForDiag.set(currentUri, []);
    }
    if (!mapForDiag.get(currentUri)?.filter((diag) => {
        return diag.range.isEqual(diagnostic.range);
    }).length) {
        mapForDiag.get(currentUri).push(diagnostic);
    }
    extension_1.diagnosticCollection.set(currentUri, mapForDiag.get(currentUri));
};
exports.addDiagnostic = addDiagnostic;
/* function responsible for adding diagnostics to the attributes when they are in the conditions
  if any given axiom */
const addDiagnosticToRelation = (type, textInfo, attribute, value, message, severity, attOffset, valOffset, errorOffset, code) => {
    let stringToCompare = "";
    let offsetToCompare = 0;
    if (type === "att") {
        stringToCompare = attribute;
        offsetToCompare = attOffset;
    }
    else if (type === "val") {
        stringToCompare = value;
        offsetToCompare = valOffset;
    }
    (0, exports.addDiagnostic)(textInfo.lineNumber, errorOffset + offsetToCompare, textInfo.lineNumber, errorOffset + offsetToCompare + stringToCompare.length, message, severity, code);
    const scOfValue = textInfo.el.indexOf(attribute) + attribute.length;
    return [
        {
            offset: attOffset,
            value: attribute,
            tokenType: stringToCompare === attribute ? "regexp" : "variable",
        },
        {
            offset: valOffset,
            value: value,
            tokenType: stringToCompare === value ? "regexp" : "macro",
        },
    ];
};
exports.addDiagnosticToRelation = addDiagnosticToRelation;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getInteractorByLine = exports.clearStoredValues = exports.isInsideInteractor = exports.isSubSection = exports.updateSection = exports.aggregates = exports.interactorLimits = exports.actionsToAttributes = exports.arrays = exports.ranges = exports.enums = exports.defines = exports.actions = exports.attributes = exports.currentInteractor = exports.attributesStartingLine = exports.actionsStartingLine = exports.previousSection = exports.sections = void 0;
exports.sections = new Map();
exports.previousSection = "";
exports.actionsStartingLine = new Array();
exports.attributesStartingLine = new Array();
exports.currentInteractor = "";
exports.attributes = new Map();
exports.actions = new Map();
exports.defines = new Map();
exports.enums = new Map();
exports.ranges = new Map();
exports.arrays = new Map();
exports.actionsToAttributes = new Map();
exports.interactorLimits = new Map();
exports.aggregates = new Map();
exports.sections.set("attributes", false);
exports.sections.set("types", false);
exports.sections.set("defines", false);
exports.sections.set("interactor", false);
exports.sections.set("actions", false);
exports.sections.set("axioms", false);
exports.sections.set("test", false);
exports.sections.set("aggregates", false);
const updateSection = (line, lineNumber) => {
    if (line.trim() === "actions") {
        exports.actionsStartingLine.push(lineNumber);
    }
    else if (line.trim() === "attributes") {
        exports.attributesStartingLine.push(lineNumber);
    }
    let x;
    x = /^\s*interactor\s+[a-zA-Z]+[a-zA-Z\_0-9]*/.exec(line);
    let trimmed;
    if (x) {
        if (exports.currentInteractor !== "") {
            exports.interactorLimits.set(exports.currentInteractor, {
                start: exports.interactorLimits.get(exports.currentInteractor).start,
                end: lineNumber - 1,
            });
        }
        trimmed = "interactor";
        exports.currentInteractor = x[0].split(" ").filter((el) => el.trim() !== "")[1];
        exports.interactorLimits.set(exports.currentInteractor, { start: lineNumber, end: undefined });
    }
    else {
        trimmed = line.trim();
    }
    if (exports.sections.has(trimmed)) {
        exports.sections.forEach((value, key) => {
            if (value) {
                exports.previousSection = key;
            }
            exports.sections.set(key, false);
        });
        exports.sections.set(trimmed, true);
        return true;
    }
    else {
        return false;
    }
};
exports.updateSection = updateSection;
const isSubSection = (line) => {
    if (line.trim() === "attributes" ||
        line.trim() === "actions" ||
        line.trim() === "axioms" ||
        line.trim() === "test" ||
        line.trim() === "aggregates") {
        return true;
    }
    else {
        return false;
    }
};
exports.isSubSection = isSubSection;
const isInsideInteractor = () => {
    return (exports.sections.get("interactor") ||
        exports.sections.get("attributes") ||
        exports.sections.get("actions") ||
        exports.sections.get("axioms") ||
        exports.sections.get("aggregates") ||
        exports.sections.get("test"));
};
exports.isInsideInteractor = isInsideInteractor;
const clearStoredValues = () => {
    exports.actionsStartingLine = [];
    exports.attributesStartingLine = [];
    exports.actionsToAttributes.clear();
    exports.attributes.clear();
    exports.actions.clear();
    exports.aggregates.clear();
    exports.defines.clear();
    exports.enums.clear();
    exports.attributes.clear();
    exports.sections.forEach((_v, key) => {
        exports.sections.set(key, false);
    });
};
exports.clearStoredValues = clearStoredValues;
const getInteractorByLine = (lineNumber) => {
    for (let x of exports.interactorLimits) {
        if (x[1].start <= lineNumber && (x[1].end === undefined || x[1].end >= lineNumber)) {
            return x[0];
        }
    }
    return "error";
};
exports.getInteractorByLine = getInteractorByLine;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ParseSection = void 0;
class ParseSection {
    /* Constructor with the findTokens, separationSymbols and the tokenTypeCondition function */
    constructor(fTokens, sSymbols, ttc) {
        this.findTokens = fTokens;
        this.separationSymbols = sSymbols;
        this.tokenTypeCondition = ttc;
    }
    /* Method to find the index where a given occurance of a substring starts in the main string */
    static getPosition(line, subString, index) {
        // special characters that need to be escaped in regular expressions
        const toEscape = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
        // see if there are any characters in the line that need to be escaped and if so, do it
        const escapedSub = subString
            .split("")
            .map((el) => {
            if (toEscape.test(el)) {
                return "\\" + el;
            }
            else {
                return el;
            }
        })
            .join("");
        // check if the regular expression contains escaped characters, and in case it does
        // there is no need to add the \b (bounded) symbol to the regular expression 
        const regex = !toEscape.test(escapedSub) ? "\\b" + subString + "\\b" : escapedSub;
        return line.split(new RegExp(regex), index).join(subString).length;
    }
    getTokens(line, lineNumber, offset, aggregatedTokens, separateTokens) {
        let x;
        // check if any match can be found the sliced line with the findTokens RegExp
        if ((x = this.findTokens.exec(line))) {
            // In case there was a match:
            if (x) {
                //alias for separationSymbols
                let ss = this.separationSymbols;
                // separate the matched line into de different elements through the separationSymbols
                let offsetForEl = x.index;
                let separatedLine = x[0].split(ss).map(el => { offsetForEl += el.length; return { value: el, offset: offsetForEl - el.length }; });
                // to return the tokens found in the line
                let tokens = [];
                // map that holds as key the string correspondent to an element and as value the occurance number,
                // so that we can later tell the token where the attribute is, even if it has multiple occurences
                let mapTokens = new Map();
                // loop through each element
                separatedLine.forEach((el) => {
                    const textInfo = { line: line, lineNumber: lineNumber, el: el.value };
                    // check if the element is not an operator or just spaces
                    if (!ss.test(el.value.trim()) && el.value.trim() !== "") {
                        const trimmedEl = el.value.trim();
                        const tokenForMap = trimmedEl[trimmedEl.length - 1] === "'"
                            ? trimmedEl.slice(0, trimmedEl.length - 1)
                            : trimmedEl.indexOf("=") > 0
                                ? trimmedEl.slice(0, trimmedEl.indexOf("=") + 1)
                                : trimmedEl;
                        // if the element is not already in the map, then we put it
                        if (!mapTokens.has(tokenForMap)) {
                            mapTokens.set(tokenForMap, 1);
                        }
                        if (!aggregatedTokens) {
                            tokens.push({
                                line: lineNumber,
                                startCharacter: el.offset,
                                length: el.value.length,
                                // to had the token type we check if the element is in the attributes and is a boolean
                                tokenType: this.tokenTypeCondition(el.value, el.offset),
                                tokenModifiers: [""],
                            });
                        }
                        else {
                            const sepTokens = separateTokens(textInfo, el.offset);
                            if (sepTokens !== undefined) {
                                for (let t of sepTokens) {
                                    this.tokenTypeCondition(t.value + ":" + t.nextState + ":" + t.interactor, el.offset);
                                    tokens.push({
                                        line: lineNumber,
                                        startCharacter: el.offset + t.offset,
                                        length: t.value.length,
                                        tokenType: t.tokenType,
                                        tokenModifiers: [""],
                                    });
                                    ;
                                }
                            }
                        }
                        // update the index in the mapTokens
                        mapTokens.set(tokenForMap, mapTokens.get(tokenForMap) + 1);
                    }
                });
                return { tokens: tokens, size: x[0].length };
            }
            else {
                return undefined;
            }
        }
    }
}
exports.ParseSection = ParseSection;


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.provider3 = exports.provider2 = exports.provider1 = void 0;
const vscode = __webpack_require__(1);
const globalParserInfo_1 = __webpack_require__(4);
const typeFindes_1 = __webpack_require__(7);
exports.provider1 = vscode.languages.registerCompletionItemProvider("mal", {
    provideCompletionItems(document, position, token, context) {
        // a simple completion item which inserts `Hello World!`
        const simpleCompletion = new vscode.CompletionItem("Hello World!");
        const attributesCompletion = globalParserInfo_1.attributes.has((0, globalParserInfo_1.getInteractorByLine)(position.line))
            ? Array.from(globalParserInfo_1.attributes.get((0, globalParserInfo_1.getInteractorByLine)(position.line))).map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable))
            : [];
        const actionsCompletion = globalParserInfo_1.actions.has((0, globalParserInfo_1.getInteractorByLine)(position.line))
            ? Array.from(globalParserInfo_1.actions.get((0, globalParserInfo_1.getInteractorByLine)(position.line))).map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function))
            : [];
        const definesCompletion = Array.from(globalParserInfo_1.defines).map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Constant));
        const aggregatesCompletion = Array.from(globalParserInfo_1.aggregates)
            .filter(([key, value]) => value.current === (0, globalParserInfo_1.getInteractorByLine)(position.line))
            .map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Interface));
        // return all completion items as array
        return [...attributesCompletion, ...definesCompletion, ...actionsCompletion, ...aggregatesCompletion];
    },
});
exports.provider2 = vscode.languages.registerCompletionItemProvider("mal", {
    provideCompletionItems(document, position) {
        // get all text until the `position` and check if it reads `console.`
        // and if so then complete if `log`, `warn`, and `error`
        let match;
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (linePrefix.charAt(linePrefix.length - 1) === "[") {
            return Array.from(globalParserInfo_1.actions.get((0, globalParserInfo_1.getInteractorByLine)(position.line))).map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function));
        }
        else if (linePrefix.charAt(linePrefix.length - 1) === "=" &&
            (match = linePrefix.match(/(\w+)\s*\=/)) !== null) {
            if (globalParserInfo_1.enums.has((0, typeFindes_1.findValueType)(match[1]))) {
                return globalParserInfo_1.enums
                    .get((0, typeFindes_1.findValueType)(match[1]))
                    .values.map((v) => new vscode.CompletionItem(v, vscode.CompletionItemKind.EnumMember));
            }
            else {
                return undefined;
            }
        }
        else {
            return undefined;
        }
    },
}, "[", "=" // triggered whenever a '.' is being typed
);
exports.provider3 = vscode.languages.registerCompletionItemProvider("mal", {
    provideCompletionItems(document, position) {
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
                }
                else {
                    if (!toTake) {
                        break;
                    }
                    result.unshift(lineSep[i]);
                    toTake = false;
                }
            }
            let current = (0, globalParserInfo_1.getInteractorByLine)(position.line);
            for (let aggregated of result) {
                if (globalParserInfo_1.aggregates.has(aggregated) && globalParserInfo_1.aggregates.get(aggregated).current === current) {
                    current = globalParserInfo_1.aggregates.get(aggregated).included;
                }
                else {
                    break;
                }
            }
            return [
                ...Array.from(globalParserInfo_1.aggregates)
                    .filter(([key, value]) => value.current === current)
                    .map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Interface)),
                ...Array.from(globalParserInfo_1.actions.get(current)).map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Function)),
                ...Array.from(globalParserInfo_1.attributes.get(current)).map(([key, value]) => new vscode.CompletionItem(key, vscode.CompletionItemKind.Variable)),
            ];
        }
        else {
            return undefined;
        }
    },
}, "." // triggered whenever a '.' is being typed
);


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isAttributeSameAsValue = exports.findValueType = exports.findTemporaryType = exports.findAggregatedValueType = void 0;
const arrayRelations_1 = __webpack_require__(8);
const axiomParser_1 = __webpack_require__(9);
const globalParserInfo_1 = __webpack_require__(4);
const findAggregatedValueType = (s) => {
    let offsetPoints = 0;
    const splitByPoints = s
        .split(/(\.)/)
        .map((el) => {
        offsetPoints += el.length;
        return { value: el, offset: offsetPoints - el.length };
    })
        .filter((el) => el.value.trim() !== "" && !el.value.includes("."));
    let current = globalParserInfo_1.currentInteractor;
    let typeToRet = "";
    if (splitByPoints.length > 1) {
        for (let x of splitByPoints) {
            const xt = x.value.trim();
            if (globalParserInfo_1.aggregates.has(xt) && globalParserInfo_1.aggregates.get(xt).current === current) {
                current = globalParserInfo_1.aggregates.get(xt).included;
            }
            else if (globalParserInfo_1.attributes.has(current) && globalParserInfo_1.attributes.get(current).has(xt)) {
                typeToRet = globalParserInfo_1.attributes.get(current).get(xt).type;
                break;
            }
            else {
                typeToRet = undefined;
                break;
            }
        }
        return typeToRet;
    }
    return undefined;
};
exports.findAggregatedValueType = findAggregatedValueType;
const findTemporaryType = (s) => {
    let ta = undefined;
    for (let i = 0; i < axiomParser_1.temporaryAttributes.length; i++) {
        if (axiomParser_1.temporaryAttributes[i].value === s) {
            const args = globalParserInfo_1.actions.get(globalParserInfo_1.currentInteractor).get(axiomParser_1.temporaryAttributes[i].action).arguments;
            ta = args[axiomParser_1.temporaryAttributes[i].index];
            if (globalParserInfo_1.ranges.has(ta) ||
                (globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(ta) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(ta).type === "number")) {
                return "number";
            }
            else {
                return ta;
            }
        }
    }
    return undefined;
};
exports.findTemporaryType = findTemporaryType;
const findValueType = (value) => {
    const correctValue = value[value.length - 1] === "'" ? value.slice(0, value.length - 1) : value;
    if (value === "true" || value === "false") {
        return "boolean";
    }
    else if (!isNaN(+value) && value !== "") {
        // check if value is a number
        return "number";
    }
    else if (globalParserInfo_1.defines.has(value)) {
        return globalParserInfo_1.defines.get(value).type;
    }
    else if (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) &&
        globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(value) &&
        globalParserInfo_1.ranges.has(globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(value).type)) {
        return "number";
    }
    else if (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(correctValue)) {
        return globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(correctValue).type;
    }
    else {
        for (var [k, v] of globalParserInfo_1.enums) {
            if (v.values.includes(value)) {
                return k;
            }
        }
    }
    return (0, exports.findTemporaryType)(value.trim());
};
exports.findValueType = findValueType;
const isAttributeSameAsValue = (attribute, value) => {
    if (attribute.includes(".")) {
        const aggAttType = (0, exports.findAggregatedValueType)(attribute);
        let aggValType;
        if (value.includes(".")) {
            aggValType = (0, exports.findAggregatedValueType)(value);
        }
        else {
            aggValType = (0, exports.findValueType)(value);
        }
        if (aggAttType && aggValType) {
            return aggAttType === aggValType;
        }
        else {
            return false;
        }
    }
    else if (attribute.charAt(0) === "_") {
        return (axiomParser_1.temporaryAttributes.map((el) => el.value).includes(attribute) && (0, exports.findValueType)(attribute) === (0, exports.findValueType)(value));
    }
    else if (attribute.includes("]") || attribute.includes("[")) {
        const { arrayName } = (0, arrayRelations_1.getArrayWrittenInfo)(attribute);
        const { type } = (0, arrayRelations_1.getArrayInStore)(arrayName);
        return type === (0, exports.findValueType)(value);
    }
    else {
        return (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) &&
            globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(attribute) &&
            (globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(attribute).type === (0, exports.findValueType)(value) ||
                (globalParserInfo_1.ranges.has(globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(attribute).type) && (0, exports.findValueType)(value) === "number")));
    }
};
exports.isAttributeSameAsValue = isAttributeSameAsValue;


/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseArray = exports.getArrayInStore = exports.isDeclaredButIsNotAnArray = exports.getArrayWrittenInfo = void 0;
const diagnostics_1 = __webpack_require__(3);
const axiomParser_1 = __webpack_require__(9);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
const typeFindes_1 = __webpack_require__(7);
/* From a given attribute declared as an array, get it's name and the number of arguments
present when the array is being used in an axiom */
const getArrayWrittenInfo = (arrayUsage) => {
    let openBrackets = 0;
    let numberOfArguments = 0;
    for (let c of arrayUsage.split("")) {
        if (c === "[") {
            openBrackets++;
        }
        if (c === "]" && openBrackets > 0) {
            numberOfArguments++;
            openBrackets--;
        }
    }
    return {
        arrayName: arrayUsage.slice(0, arrayUsage.indexOf("[")).trim(),
        numberOfArguments: numberOfArguments,
    };
};
exports.getArrayWrittenInfo = getArrayWrittenInfo;
const isDeclaredButIsNotAnArray = (arrayName) => {
    return (0, exports.getArrayInStore)((0, exports.getArrayWrittenInfo)(arrayName).arrayName).type === "";
};
exports.isDeclaredButIsNotAnArray = isDeclaredButIsNotAnArray;
/* From an attribute declared as an array, get the information present about
that type of array from the data structures present in the extension, in this case
the dimensions and the type */
const getArrayInStore = (arrayName) => {
    let numberOfDimensions = 1;
    let type = "";
    if (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(arrayName) && globalParserInfo_1.arrays.has(globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(arrayName).type)) {
        let arrayType = globalParserInfo_1.arrays.get(globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(arrayName).type).type;
        while (globalParserInfo_1.arrays.has(arrayType)) {
            arrayType = globalParserInfo_1.arrays.get(arrayType).type;
            numberOfDimensions++;
        }
        type = arrayType;
    }
    return { dimensions: numberOfDimensions, type: type };
};
exports.getArrayInStore = getArrayInStore;
const assignTokenType = (s) => {
    if (axiomParser_1.temporaryAttributes.map(el => el.value).includes(s)) {
        return "keyword";
    }
    else if (globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(s)) {
        return "variable";
    }
    else if (!isNaN(+s)) {
        return "number";
    }
    else {
        return "nothing";
    }
};
const tokenAndDiag = (actionName, elemIndex, lineNumber, offset, s) => {
    if ((globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(s) && elemIndex === 0) ||
        (0, typeFindes_1.findTemporaryType)(s) === "number" ||
        (globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(s) && (0, typeFindes_1.findValueType)(s) === "number") ||
        !isNaN(+s)) {
        return { offset: offset, value: s, tokenType: assignTokenType(s) };
    }
    else {
        (0, diagnostics_1.addDiagnostic)(lineNumber, offset, lineNumber, offset + s.length, s + " must be of type number", "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + s);
        return { offset: offset, value: s, tokenType: "regexp" };
    }
};
const parseArray = (line, lineNumber, element) => {
    if (element.includes("[") && element.includes("]")) {
        const { arrayName, numberOfArguments } = (0, exports.getArrayWrittenInfo)(element);
        const { dimensions, type } = (0, exports.getArrayInStore)(arrayName);
        if (dimensions !== numberOfArguments) {
            const sc = ParseSection_1.ParseSection.getPosition(line, element, 1);
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + element.length, arrayName + " does not have the right amount of arguments", "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + arrayName);
            return [{ offset: sc, value: element, tokenType: "regexp" }];
        }
        else {
            let offsetForArgs = 0;
            let toRet = [];
            const opRex = /(\+|\-|\*|\/|\(|\))/;
            const separatedArray = element
                .split(/(\[|\])/)
                .map((el) => {
                offsetForArgs += el.length;
                return { value: el, offset: offsetForArgs - el.length };
            })
                .filter((el) => !(el.value.trim() === "]" || el.value.trim() === "[" || el.value.trim() === ""));
            for (let i = 0; i < separatedArray.length; i++) {
                const { offset: o, value: v } = separatedArray[i];
                if (!opRex.test(v)) {
                    if (globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(v)) {
                        const preAtt = globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(v);
                        globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).set(v, { ...preAtt, used: true });
                    }
                    toRet.push(tokenAndDiag(separatedArray[0].value.trim(), i, lineNumber, o, v));
                }
                else {
                    let offToks = o;
                    toRet.push(...v
                        .split(opRex)
                        .map((el) => {
                        offToks += el.length;
                        if (opRex.test(el.trim())) {
                            return { offset: 0, tokenType: "regexp", value: "" };
                        }
                        else {
                            return tokenAndDiag(separatedArray[0].value.trim(), i, lineNumber, offToks - el.length, el);
                        }
                    })
                        .filter((el) => el.value.trim().length > 0));
                }
            }
            return toRet;
        }
    }
    return undefined;
};
exports.parseArray = parseArray;


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseAxioms = exports.temporaryAttributes = exports.triggerAction = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const includesParser_1 = __webpack_require__(10);
const ParseSection_1 = __webpack_require__(5);
const relationParser_1 = __webpack_require__(11);
exports.triggerAction = [];
const setOfAttributesAttended = new Set();
exports.temporaryAttributes = [];
const parseConditions = (line, lineNumber) => {
    const toFindTokens = /^.*(?=\s*\<?\-\>\s*\[)/;
    const toSeparateTokens = /(\&|\||\)|\(|\!)/;
    const parseConditionsSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        return "cantprint";
    });
    return parseConditionsSection.getTokens(line, lineNumber, 0, true, relationParser_1.compareRelationTokens);
};
const parseActionWithArguments = (line, lineNumber, action, numberOfArgs, startingChar) => {
    const rx = /(\)|\(|\,)/;
    const rx2 = new RegExp(action + "\\(\\s*(\\w*\\s*,?\\s*)*\\)");
    const slicedLine = line.slice(startingChar + action.length);
    const args = slicedLine.slice(0, slicedLine.indexOf(")") + 1);
    const splitedArgs = args.split(rx).filter((el) => !rx.test(el) && el.trim() !== "");
    if (rx2.test(line) && splitedArgs.length !== numberOfArgs) {
        (0, diagnostics_1.addDiagnostic)(lineNumber, startingChar, lineNumber, startingChar + action.length, action + " doest not have the right amount of arguments", "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + action);
        return false;
    }
    else {
        return true;
    }
};
const parseTemporaryArgument = (lineNumber, sc, el, currentAction, actionArgumentIndex, interactor) => {
    const correctType = globalParserInfo_1.actions.get(interactor).get(currentAction).arguments[actionArgumentIndex];
    if (el.charAt(0) === "_") {
        exports.temporaryAttributes.push({ action: currentAction, value: el, index: actionArgumentIndex });
        return "keyword";
    }
    else if (globalParserInfo_1.attributes.get(interactor).has(el.trim()) &&
        globalParserInfo_1.attributes.get(interactor).get(el.trim()).type === correctType) {
        return "variable";
    }
    else {
        (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " needs to start with an underscore (_) or be an attribute with type " + correctType, "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + el);
        return "regexp";
    }
};
const submitAction = (textInfo, interactor, sc) => {
    let isOkay = true;
    let numberOfArgumentsInAction = 0;
    const { el, line, lineNumber } = { ...textInfo };
    const prevAction = globalParserInfo_1.actions.get(interactor).get(el.trim());
    if (!parseActionWithArguments(line, lineNumber, el, prevAction.arguments.length, sc)) {
        isOkay = false;
    }
    else {
        numberOfArgumentsInAction = prevAction.arguments.length;
    }
    const currentAction = el.trim();
    exports.triggerAction.push(interactor + ":" + el.trim());
    globalParserInfo_1.actions.get(interactor).set(currentAction, { ...prevAction, used: true });
    return {
        numberOfArgumentsInAction: numberOfArgumentsInAction,
        tokenType: isOkay ? "function" : "regexp",
        currentAction: currentAction,
    };
};
const parseTriggerAction = (line, lineNumber) => {
    let numberOfArgumentsInAction = 0;
    let actionArgumentIndex = 0;
    let currentAction = "";
    let isIncluded = false;
    let includedInteractor = "";
    let interactorForTemps = globalParserInfo_1.currentInteractor;
    let actionsInIncluded;
    const toFindTokens = /((\<?\s*\-\>\s*)|^\s*)\[[^\[]+\]/;
    const toSeparateTokens = /(\(|\)|\-|\>|\<|\&|\||\!|\[|\]|\,|\.)/;
    const parseTriggerActions = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        if (isIncluded) {
            if ((0, includesParser_1.isIncludedDinamically)(includedInteractor, el.trim())) {
                includedInteractor = globalParserInfo_1.aggregates.get(el.trim()).included;
                actionsInIncluded = globalParserInfo_1.actions.get(includedInteractor);
                return "variable";
            }
            isIncluded = false;
            if (actionsInIncluded.has(el.trim())) {
                const { numberOfArgumentsInAction: naia, tokenType, currentAction: ca, } = { ...submitAction({ el: el, line: line, lineNumber: lineNumber }, includedInteractor, sc) };
                numberOfArgumentsInAction = naia;
                currentAction = ca;
                interactorForTemps = includedInteractor;
                return tokenType;
            }
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is not an action from " + includedInteractor, "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + el);
            return "regexp";
        }
        else if (numberOfArgumentsInAction > 0) {
            numberOfArgumentsInAction--;
            const toRet = parseTemporaryArgument(lineNumber, sc, el, currentAction, actionArgumentIndex, interactorForTemps);
            actionArgumentIndex++;
            return toRet;
        }
        else if (globalParserInfo_1.aggregates.has(el.trim()) && globalParserInfo_1.aggregates.get(el.trim()).current === globalParserInfo_1.currentInteractor) {
            isIncluded = true;
            includedInteractor = globalParserInfo_1.aggregates.get(el.trim()).included;
            actionsInIncluded = globalParserInfo_1.actions.get(includedInteractor);
            return "variable";
        }
        else if (globalParserInfo_1.actions.get(globalParserInfo_1.currentInteractor).has(el.trim())) {
            const { numberOfArgumentsInAction: naia, tokenType, currentAction: ca, } = { ...submitAction({ el: el, line: line, lineNumber: lineNumber }, globalParserInfo_1.currentInteractor, sc) };
            interactorForTemps = globalParserInfo_1.currentInteractor;
            numberOfArgumentsInAction = naia;
            currentAction = ca;
            return tokenType;
        }
        else {
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an action", "error", diagnostics_1.DECLARE_ACTION + ":" + el);
            return "regexp";
        }
    });
    return parseTriggerActions.getTokens(line, lineNumber, line.search(toFindTokens));
};
const parseNextState = (line, lineNumber) => {
    const toFindTokens = /(?<=((?<=(\-\s*\>.*|^\s*\[.*))\]|^\s*per\s*\(.*\)\s*\<?\-\>)).*/;
    const toSeparateTokens = /(\&|\||\)|\(|\,|\<?\s*\-\s*\>)/;
    let isInKeep = false;
    let addToAttributes = [];
    const parseNextStateSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        const [attName, isNextState, interactor] = el.split(":");
        if (interactor !== "undefined") {
            addToAttributes.push((0, relationParser_1.removeExclamation)(attName.trim()).value + ".");
        }
        else {
            addToAttributes = [];
            addToAttributes.push((0, relationParser_1.removeExclamation)(attName.trim()).value + ".");
        }
        if (attName === "keep") {
            isInKeep = true;
            return "";
        }
        if (isInKeep || isNextState === "true") {
            setOfAttributesAttended.add(addToAttributes.join("").slice(0, addToAttributes.join("").length - 1));
            addToAttributes = [];
        }
        else if (interactor === "undefined") {
            addToAttributes = [];
        }
        if (addToAttributes.length !== 0) {
            console.log(el);
            console.log(addToAttributes.length === 0 ? "nothing" : addToAttributes);
        }
        return "cantprint";
    });
    return parseNextStateSection.getTokens(line, lineNumber, 0, true, relationParser_1.compareRelationTokens);
};
const _parseAxioms = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [parseTriggerAction, parseConditions, parseNextState];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    exports.triggerAction = [];
    setOfAttributesAttended.clear();
    for (const parser of sectionsToParseParsers) {
        const matchedPiece = parser(lineWithoutComments, lineNumber);
        if (matchedPiece && matchedPiece.size > 0) {
            toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
            size += matchedPiece.size;
            currentOffset += matchedPiece.size;
        }
        if (setOfAttributesAttended.size > 0) {
            for (let act of exports.triggerAction) {
                const [interactorName, actName] = act.split(":");
                if (globalParserInfo_1.actionsToAttributes.has(globalParserInfo_1.currentInteractor) &&
                    globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).has(interactorName)) {
                    if (globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).get(interactorName).has(actName)) {
                        const actionsRecorded = globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).get(interactorName);
                        actionsRecorded.set(actName, new Set([...actionsRecorded.get(actName), ...setOfAttributesAttended]));
                    }
                }
            }
        }
    }
    if (size === 0) {
        return undefined;
    }
    else {
        return { tokens: toRetTokens, size: size };
    }
};
exports._parseAxioms = _parseAxioms;


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseIncludes = exports.isIncludedDinamically = exports.parseAggregatesValue = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
const relationParser_1 = __webpack_require__(11);
const parseAggregatesValue = (textInfo, offset, val) => {
    let offsetPoints = 0;
    const splitByPoints = val.value
        .split(/(\.)/)
        .map((el) => {
        offsetPoints += el.length;
        return { value: el, offset: offsetPoints - el.length };
    })
        .filter((el) => el.value.trim() !== "" && !el.value.includes("."));
    let current = globalParserInfo_1.currentInteractor;
    const toks = [];
    let typeToRet = "";
    let i = 0;
    if (splitByPoints.length > 1) {
        for (let x of splitByPoints) {
            const xt = i === 0 ? (0, relationParser_1.removeExclamation)(x.value.trim()).value : x.value.trim();
            i++;
            if (globalParserInfo_1.aggregates.has(xt) && globalParserInfo_1.aggregates.get(xt).current === current) {
                current = globalParserInfo_1.aggregates.get(xt).included;
                toks.push({ offset: x.offset, value: x.value, tokenType: "variable" });
            }
            else if (globalParserInfo_1.attributes.has(current) && globalParserInfo_1.attributes.get(current).has((0, relationParser_1.removeExclamation)(xt.trim()).value)) {
                toks.push({ offset: x.offset, value: x.value, tokenType: "variable" });
                typeToRet = globalParserInfo_1.attributes.get(current).get((0, relationParser_1.removeExclamation)(xt).value).type;
                break;
            }
            else {
                (0, diagnostics_1.addDiagnostic)(textInfo.lineNumber, offset + x.offset, textInfo.lineNumber, offset + x.offset + x.value.length, xt + " is not aggregated", "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + xt);
                toks.push({ offset: x.offset, value: x.value, tokenType: "regexp" });
                typeToRet = undefined;
                break;
            }
        }
        return {
            tokens: toks,
            type: typeToRet,
            lastInteractor: current,
            attributeName: splitByPoints[splitByPoints.length - 1].value,
        };
    }
    return undefined;
};
exports.parseAggregatesValue = parseAggregatesValue;
const isIncludedDinamically = (interactorToCheck, includedToCheck) => {
    let current = includedToCheck;
    let interactor = interactorToCheck;
    if (globalParserInfo_1.aggregates.has(current) && globalParserInfo_1.aggregates.get(current).current === interactor) {
        return true;
    }
    else {
        return false;
    }
};
exports.isIncludedDinamically = isIncludedDinamically;
const parseInclude = (line, lineNumber) => {
    let elIndex = 0;
    let intName = "";
    const toFindTokens = /^\s*[a-zA-Z]+\w*\s+via\s+[a-zA-Z]+\w*/;
    const toSeparateTokens = /(\s|via)/;
    const parseConditionsSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        if (elIndex === 0) {
            intName = el.trim();
            elIndex++;
            return "macro";
        }
        else {
            globalParserInfo_1.aggregates.set(el.trim(), { current: globalParserInfo_1.currentInteractor, included: intName });
            if (!globalParserInfo_1.actionsToAttributes.has(globalParserInfo_1.currentInteractor)) {
                globalParserInfo_1.actionsToAttributes.set(globalParserInfo_1.currentInteractor, new Map());
            }
            globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).set(intName, new Map());
            if (globalParserInfo_1.actions.has(intName)) {
                for (let act of globalParserInfo_1.actions.get(intName)) {
                    globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).get(intName).set(act[0], new Set());
                }
            }
            return "variable";
        }
    });
    return parseConditionsSection.getTokens(line, lineNumber, 0);
};
const _parseIncludes = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [parseInclude];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    for (const parser of sectionsToParseParsers) {
        const matchedPiece = parser(lineWithoutComments, lineNumber);
        if (matchedPiece && matchedPiece.size > 0) {
            toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
            size += matchedPiece.size;
            currentOffset += matchedPiece.size;
        }
    }
    if (size === 0) {
        return undefined;
    }
    else {
        return { tokens: toRetTokens, size: size };
    }
};
exports._parseIncludes = _parseIncludes;


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.compareRelationTokens = exports.removeExclamation = exports.processExpressions = exports.separateRangeTokens = void 0;
const diagnostics_1 = __webpack_require__(3);
const arrayRelations_1 = __webpack_require__(8);
const globalParserInfo_1 = __webpack_require__(4);
const includesParser_1 = __webpack_require__(10);
const relationErrors_1 = __webpack_require__(12);
const typeFindes_1 = __webpack_require__(7);
const attributeExists = (attribute) => {
    return ((globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(attribute)) ||
        (attribute.charAt(attribute.length - 1) === "'" &&
            globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(attribute.substring(0, attribute.length - 1))));
};
const parseRangeInput = (preV) => {
    let v;
    let isANumber = true;
    v = 0;
    const trimmedv = preV.trim();
    if (!isNaN(+trimmedv)) {
        v = trimmedv;
    }
    else if (globalParserInfo_1.defines.has(trimmedv) && globalParserInfo_1.defines.get(trimmedv).type === "number") {
        v = globalParserInfo_1.defines.get(trimmedv).value;
        isANumber = false;
        globalParserInfo_1.defines.set(trimmedv, { used: true, type: "number", value: v });
    }
    return { value: +v, isANumber: isANumber };
};
const separateRangeTokens = (textInfo, offset) => {
    let indexOfOp = 0;
    const afterAndBefore = textInfo.el.split("=");
    if ((indexOfOp = afterAndBefore[1].search(/\.\./)) > 0) {
        const min = afterAndBefore[1].slice(0, indexOfOp);
        const max = afterAndBefore[1].slice(indexOfOp + 2);
        const minimum = parseRangeInput(min.trim());
        const maximum = parseRangeInput(max.trim());
        if (minimum.value >= maximum.value) {
            return (0, diagnostics_1.addDiagnosticToRelation)("att", { ...textInfo, el: afterAndBefore[1] }, min.trim(), max.trim(), minimum.value + " is equal or greater than " + maximum.value, "warning", 0, indexOfOp + 2, offset, diagnostics_1.NOT_YET_IMPLEMENTED + ":" + textInfo.lineNumber);
        }
        globalParserInfo_1.ranges.set(afterAndBefore[0].trim(), {
            used: false,
            minimum: minimum.value,
            maximum: maximum.value,
        });
        return [
            {
                offset: textInfo.el.indexOf(min),
                value: min,
                tokenType: minimum.isANumber ? "number" : "variable",
            },
            {
                offset: textInfo.el.indexOf(max),
                value: max,
                tokenType: maximum.isANumber ? "number" : "variable",
            },
        ];
    }
    return undefined;
};
exports.separateRangeTokens = separateRangeTokens;
const processExpressions = (textInfo, att, val, implies, isNextState) => {
    const specialChars = /(\+|\!|\-|\&|\*|\,|\)|\(|\/|\||\>|\<)/;
    let offsetForSplitted = 0;
    const splittedValue = val
        .split(specialChars)
        .map((el) => {
        offsetForSplitted += el.length;
        return { value: el, offset: offsetForSplitted - el.length };
    })
        .filter((el) => el.value.trim() !== "" && !specialChars.test(el.value));
    let currentType = "";
    let i = 0;
    let toks = [];
    if (att.trim() === "" || val.trim() === "") {
        return undefined;
    }
    if (((0, typeFindes_1.isAttributeSameAsValue)(att, splittedValue[0].value.trim()) && splittedValue.length > 1) || implies) {
        toks.push({
            offset: 0,
            value: att,
            tokenType: "variable",
            nextState: isNextState,
        });
        for (i = 0; i < splittedValue.length; i++) {
            const trimmedV = splittedValue[i].value.trim();
            if (splittedValue[i].value.includes("=")) {
                const fromCompare = (0, exports.compareRelationTokens)({ ...textInfo, el: splittedValue[i].value }, splittedValue[i].offset);
                if (fromCompare !== undefined) {
                    for (let x of fromCompare) {
                        toks.push({
                            offset: splittedValue[i].offset + x.offset,
                            value: x.value,
                            tokenType: x.tokenType,
                        });
                    }
                }
            }
            else {
                if (i === 0) {
                    currentType = (0, typeFindes_1.findValueType)(trimmedV);
                }
                else {
                    const newType = (0, typeFindes_1.findValueType)(trimmedV);
                    if (currentType !== newType) {
                        break;
                    }
                }
                toks.push({
                    offset: splittedValue[i].offset,
                    value: splittedValue[i].value,
                    tokenType: !isNaN(+trimmedV) ? splittedValue[i].value : (0, typeFindes_1.findTemporaryType)(trimmedV) ? "keyword" : "macro",
                });
            }
        }
        if (i === splittedValue.length) {
            return toks;
        }
        return undefined;
    }
    return undefined;
};
exports.processExpressions = processExpressions;
const removeExclamation = (att) => {
    let nextState = false;
    const we = att.trim().charAt(0) === "!" ? att.trim().slice(1) : att.trim();
    let ret;
    if (we.charAt(we.length - 1) === "'") {
        ret = we.slice(0, we.length - 1);
        nextState = true;
    }
    else {
        ret = we;
    }
    return { value: ret, isNextState: nextState };
};
exports.removeExclamation = removeExclamation;
const updateAttributeUsage = (att, interactor) => {
    const attCleared = (0, exports.removeExclamation)(att.trim()).value;
    if (globalParserInfo_1.attributes.has(interactor) && globalParserInfo_1.attributes.get(interactor).has(attCleared.trim())) {
        const attAux = globalParserInfo_1.attributes.get(interactor).get(attCleared);
        globalParserInfo_1.attributes.get(interactor).set(attCleared, { ...attAux, used: true });
    }
};
const compareRelationTokens = (textInfo, offset) => {
    let tp;
    let indexOfOp;
    const comparationSymbols = /(\<\s*\=|\>\s*\=|(?<!\-)\s*\>|\<\s*(?!\-)|\=|\!\s*\=)/;
    if (textInfo.el === "keep") {
        return [{ offset: 0, value: textInfo.el, tokenType: "keyword" }];
    }
    // Check if there is any symbol that might indicate a relation
    if ((indexOfOp = textInfo.el.match(comparationSymbols)) !== null) {
        let offsetForComparation = 0;
        const separated = textInfo.el
            .split(comparationSymbols)
            .map((el) => {
            offsetForComparation += el.length;
            return { value: el, offset: offsetForComparation - el.length };
        })
            .filter((el) => !comparationSymbols.test(el.value.trim()) && el.value.trim() !== "");
        if (separated.length === 2) {
            //separate the attribute and the value
            //const preAtt = textInfo.el.slice(0, textInfo.el.indexOf(indexOfOp[0])).trim();
            const preAtt = separated[0];
            // take out the ' that simbolizes the next state in case it exists, and if so
            // set the nextState to true
            let { value: att, isNextState } = (0, exports.removeExclamation)(preAtt.value.trim());
            //get the value
            const preVal = separated[1];
            let { value: val } = (0, exports.removeExclamation)(preVal.value.trim());
            let expressionsParsed;
            //process multiple expressions when connected i.e. var1' = var2 + 4 * var3[2]
            expressionsParsed = (0, exports.processExpressions)(textInfo, att, val, textInfo.el.includes("->"), isNextState);
            if (expressionsParsed !== undefined) {
                return expressionsParsed;
            }
            /*
          IsUsedAsAnArrayButIsNot - Checks if either the value or the attribute are being used as an array when they are not declared as such
          isValueInvalid - Checks if the type of the value can not be found
           */
            let errors;
            if ((errors = (0, relationErrors_1.processErrors)(textInfo, offset, preAtt, preVal, [
                relationErrors_1.isUsedAsAnArrayButIsNot,
                relationErrors_1.isValueInvalid,
                relationErrors_1.isAttributeNotDefined,
                relationErrors_1.isAttributeSameTypeAsValue,
            ]))) {
                return errors;
            }
            let agValues;
            if ((agValues = (0, includesParser_1.parseAggregatesValue)(textInfo, offset, preAtt))) {
                updateAttributeUsage(agValues.attributeName.trim(), agValues.lastInteractor.trim());
                return [
                    ...agValues.tokens.map((x) => {
                        return { ...x, offset: preAtt.offset + x.offset, nextState: (0, exports.removeExclamation)(x.value.trim()).isNextState, interactor: agValues.lastInteractor.trim() };
                    }),
                    {
                        offset: preVal.offset,
                        value: preVal.value,
                        tokenType: !isNaN(+val) ? "number" : (0, typeFindes_1.findTemporaryType)(val) ? "keyword" : "macro",
                    },
                ];
            }
            else {
                updateAttributeUsage(att, globalParserInfo_1.currentInteractor);
            }
            let attTokens = [];
            if (/(\[|\])/.test(att)) {
                attTokens = (0, arrayRelations_1.parseArray)(textInfo.line, textInfo.lineNumber, att);
            }
            else {
                attTokens = [{ offset: preAtt.offset, value: preAtt.value, tokenType: "variable", nextState: isNextState }];
            }
            return [
                ...attTokens,
                {
                    offset: preVal.offset,
                    value: preVal.value,
                    tokenType: !isNaN(+val) ? "number" : (0, typeFindes_1.findTemporaryType)(val) ? "keyword" : "macro",
                },
            ];
        }
    }
    else {
        // without exclamation
        const clearedOfSymbols = (0, exports.removeExclamation)(textInfo.el.trim());
        let agValues;
        let preAtt = { value: textInfo.el, offset: 0 };
        if ((agValues = (0, includesParser_1.parseAggregatesValue)(textInfo, offset, preAtt))) {
            if (clearedOfSymbols.value !== textInfo.el.trim()) {
                if (agValues.type === "boolean") {
                    updateAttributeUsage(agValues.attributeName.trim(), agValues.lastInteractor.trim());
                    return agValues.tokens.map((x) => {
                        return { ...x, offset: preAtt.offset + x.offset };
                    });
                }
                else {
                    const clearedValue = (0, exports.removeExclamation)(agValues.attributeName.trim()).value;
                    if (globalParserInfo_1.attributes.get((0, exports.removeExclamation)(agValues.lastInteractor).value).has(clearedValue)) {
                        (0, diagnostics_1.addDiagnostic)(textInfo.lineNumber, offset, textInfo.lineNumber, offset + textInfo.el.length, clearedOfSymbols.value + " is not a boolean", "error", diagnostics_1.CHANGE_TYPE +
                            ":" +
                            "boolean" +
                            ":" +
                            globalParserInfo_1.attributes.get((0, exports.removeExclamation)(agValues.lastInteractor).value).get(clearedValue).line +
                            ":" +
                            clearedValue);
                    }
                }
            }
        }
        else if (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(clearedOfSymbols.value)) {
            if (clearedOfSymbols.value !== textInfo.el.trim() &&
                globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(clearedOfSymbols.value)?.type !== "boolean") {
                (0, diagnostics_1.addDiagnostic)(textInfo.lineNumber, offset, textInfo.lineNumber, offset + textInfo.el.length, clearedOfSymbols.value + " is not a boolean", "error", diagnostics_1.CHANGE_TYPE +
                    ":" +
                    "boolean" +
                    ":" +
                    globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(clearedOfSymbols.value.trim()).line +
                    ":" +
                    clearedOfSymbols.value);
            }
            else {
                updateAttributeUsage(textInfo.el.trim(), globalParserInfo_1.currentInteractor);
                return [
                    {
                        offset: 0,
                        value: textInfo.el,
                        tokenType: "variable",
                        nextState: new RegExp("keep\\s*\\(.*\\b" + clearedOfSymbols.value + "\\b.*\\)").test(textInfo.line) ||
                            clearedOfSymbols.isNextState,
                    },
                ];
            }
        }
        else {
            if (globalParserInfo_1.defines.has(textInfo.el.trim())) {
                return [
                    {
                        offset: 0,
                        value: textInfo.el,
                        tokenType: "function",
                        nextState: false,
                    },
                ];
            }
            else if ((tp = (0, arrayRelations_1.getArrayInStore)((0, arrayRelations_1.getArrayWrittenInfo)(textInfo.el.trim()).arrayName).type.trim()) !== "") {
                if (tp === "boolean") {
                    return (0, arrayRelations_1.parseArray)(textInfo.line, textInfo.lineNumber, textInfo.el.trim());
                }
                else {
                    (0, diagnostics_1.addDiagnostic)(textInfo.lineNumber, 0, textInfo.lineNumber, textInfo.el.trim().length, textInfo.el.trim() + " must be a boolean in order to be alone in the condition", "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + textInfo.el.trim());
                    //TODO deal with arrays when they are in the keep tag
                    return [{ offset: 0, value: textInfo.el, tokenType: "regexp", nextState: false }];
                }
            }
        }
    }
    return undefined;
};
exports.compareRelationTokens = compareRelationTokens;


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isAttributeSameTypeAsValue = exports.isAttributeNotDefined = exports.isUsedAsAnArrayButIsNot = exports.isValueInvalid = exports.processErrors = void 0;
const diagnostics_1 = __webpack_require__(3);
const arrayRelations_1 = __webpack_require__(8);
const axiomParser_1 = __webpack_require__(9);
const globalParserInfo_1 = __webpack_require__(4);
const includesParser_1 = __webpack_require__(10);
const relationParser_1 = __webpack_require__(11);
const typeFindes_1 = __webpack_require__(7);
const hasSquareBrackets = (s) => {
    return s.includes("]") || s.includes("[");
};
const attributeExists = (textInfo, offset, att) => {
    const attvt = (0, relationParser_1.removeExclamation)(att.value.trim()).value;
    return ((globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(attvt)) ||
        (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) &&
            globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has((0, arrayRelations_1.getArrayWrittenInfo)(attvt).arrayName)) ||
        axiomParser_1.temporaryAttributes.map((el) => el.value).includes(attvt) ||
        ((0, includesParser_1.parseAggregatesValue)(textInfo, offset, att) !== undefined &&
            (0, includesParser_1.parseAggregatesValue)(textInfo, offset, att).type !== undefined));
};
const processErrors = (textInfo, offset, att, val, exceptionsErrors) => {
    for (let parseError of exceptionsErrors) {
        let errorFound;
        if ((errorFound = parseError(textInfo, offset, att, val))) {
            return errorFound;
        }
    }
    return undefined;
};
exports.processErrors = processErrors;
const isValueInvalid = (textInfo, offset, att, val) => {
    const valt = (0, relationParser_1.removeExclamation)(val.value.trim()).value;
    if (valt !== "" && (0, typeFindes_1.findValueType)(valt) === undefined) {
        return (0, diagnostics_1.addDiagnosticToRelation)("val", textInfo, att.value, val.value, valt + " is not a valid value", "error", att.offset, val.offset, offset, diagnostics_1.NOT_YET_IMPLEMENTED + ":" + textInfo.lineNumber);
    }
    return undefined;
};
exports.isValueInvalid = isValueInvalid;
const isUsedAsAnArrayButIsNot = (textInfo, offset, att, val) => {
    const attt = (0, relationParser_1.removeExclamation)(att.value.trim()).value;
    const valt = (0, relationParser_1.removeExclamation)(val.value.trim()).value;
    let isAtt;
    if ((isAtt =
        (hasSquareBrackets(attt) && (0, arrayRelations_1.isDeclaredButIsNotAnArray)(attt)) ||
            (hasSquareBrackets(valt) && (0, arrayRelations_1.isDeclaredButIsNotAnArray)(valt)))) {
        return (0, diagnostics_1.addDiagnosticToRelation)(isAtt ? "att" : "val", textInfo, att.value, val.value, (isAtt ? attt : valt) + " is not an array", "error", att.offset, val.offset, offset, diagnostics_1.NOT_YET_IMPLEMENTED + ":" + textInfo.lineNumber);
    }
    return undefined;
};
exports.isUsedAsAnArrayButIsNot = isUsedAsAnArrayButIsNot;
const isAttributeNotDefined = (textInfo, offset, att, val) => {
    const attt = (0, relationParser_1.removeExclamation)(att.value.trim()).value;
    const valt = (0, relationParser_1.removeExclamation)(val.value.trim()).value;
    //check if the attribute exists in the already processed attributes
    if (!attributeExists(textInfo, offset, att)) {
        return (0, diagnostics_1.addDiagnosticToRelation)("att", textInfo, att.value, val.value, attt + " is not defined", "error", att.offset, val.offset, offset, diagnostics_1.DEFINE_ATTRIBUTE + ":" + (0, typeFindes_1.findValueType)(valt) + ":" + attt);
    }
    else {
        return undefined;
    }
};
exports.isAttributeNotDefined = isAttributeNotDefined;
const getLineWhereAttIsDefined = (att) => {
    if (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(att)) {
        return { value: att, line: globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).get(att).line };
    }
    else if (att.includes(".")) {
        const sPoints = att.split(".");
        let current = globalParserInfo_1.currentInteractor;
        for (let i = 0; i < sPoints.length; i++) {
            const tsp = sPoints[i].trim();
            if (globalParserInfo_1.aggregates.has(tsp) && globalParserInfo_1.aggregates.get(tsp).current === current) {
                current = globalParserInfo_1.aggregates.get(tsp).included;
            }
            else if (globalParserInfo_1.attributes.has(current) && globalParserInfo_1.attributes.get(current).has(tsp)) {
                return { value: tsp, line: globalParserInfo_1.attributes.get(current).get(tsp).line };
            }
        }
    }
    else {
        return undefined;
    }
};
const isAttributeSameTypeAsValue = (textInfo, offset, att, val) => {
    const { value: valt } = (0, relationParser_1.removeExclamation)(val.value.trim());
    const { value: attt } = (0, relationParser_1.removeExclamation)(att.value.trim());
    if (valt !== "" && attt !== "" && !(0, typeFindes_1.isAttributeSameAsValue)(attt, valt)) {
        let attForGet = attt;
        if (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && !globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(attt)) {
            attForGet = (0, arrayRelations_1.getArrayWrittenInfo)(attt).arrayName;
        }
        const { value: attValue, line: lineN } = getLineWhereAttIsDefined(attt);
        return (0, diagnostics_1.addDiagnosticToRelation)("att", textInfo, att.value, val.value, attt + " is not of type " + (0, typeFindes_1.findValueType)(valt), "warning", att.offset, val.offset, offset, diagnostics_1.CHANGE_TYPE +
            ":" +
            (0, typeFindes_1.findValueType)(valt) +
            ":" +
            lineN +
            ":" +
            attValue);
    }
    else {
        return undefined;
    }
};
exports.isAttributeSameTypeAsValue = isAttributeSameTypeAsValue;


/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.commandHandler = void 0;
const vscode = __webpack_require__(1);
const globalParserInfo_1 = __webpack_require__(4);
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


/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseText = void 0;
const axiomParser_1 = __webpack_require__(9);
const definesParser_1 = __webpack_require__(15);
const globalParserInfo_1 = __webpack_require__(4);
const diagnostics_1 = __webpack_require__(3);
const typesParser_1 = __webpack_require__(16);
const actionsParser_1 = __webpack_require__(17);
const attributesParser_1 = __webpack_require__(18);
const checkIfUsed_1 = __webpack_require__(19);
const includesParser_1 = __webpack_require__(10);
/* Simple method to check if a line is an expression or a simple line,
 by checking if it is a number,true or false */
const isNotAnExpression = (line) => {
    // get the index of the equal sign, then splitting the line in case there are any comments
    const afterEquals = line
        .slice(line.indexOf("=") + 1)
        .split("#")[0]
        .trim();
    if (!isNaN(+afterEquals) || afterEquals === "true" || afterEquals === "false") {
        return true;
    }
    return false;
};
// Method for parsing a specific line of the text given the correct parser to use
const parseSpecificPart = (parser, tokenArray, line, lineNumber, currentOffset) => {
    const parsedDefines = parser(line.slice(currentOffset), lineNumber);
    if (parsedDefines !== undefined) {
        parsedDefines.tokens.forEach((el) => {
            tokenArray.push(el);
        });
        currentOffset += parsedDefines.size;
        return currentOffset;
    }
    return undefined;
};
// Method that loops through all sections and checks which one is currently set to true
// meaning that that section is the one active
// ex: x[0] = "attributes" & x[1] = true => return "attributes"
const getActiveSection = () => {
    for (let x of globalParserInfo_1.sections) {
        if (x[1]) {
            return x[0];
        }
    }
    return "none";
};
function _parseText(text) {
    getActiveSection();
    // Array of the parsed tokens
    /* These tokens are objects such as:
    {line: lineNumber, startCharacter: index,length: number,tokenType: string,tokenModifiers: [""]} */
    const r = [];
    // structure to save some lines for post process, in case the information written ahead is relevant
    // the key, is a string that represents the section in from where the lines come
    // the value, is an object composed by the line text itself as well as the line number.
    const lineHolder = new Map();
    // in case there is any information in the data structures, these get erased before the text is parsed again
    (0, diagnostics_1.clearDiagnosticCollection)();
    (0, globalParserInfo_1.clearStoredValues)();
    // splitting the lines
    const lines = text.split(/\r\n|\r|\n/);
    //loopn through all lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        //variable to represent the current offset to be considered when parsing the line
        let currentOffset = 0;
        do {
            // Checking if the line represents a special section (ex: actions, axioms...), but its not inside an interactor
            // so that an error can be emitted to the user
            // TODO: currently only change the color of the text, need to add error
            // TODO: being able to check if attributes and actions are used anywhere on the text
            if ((0, globalParserInfo_1.isSubSection)(line.trim()) && !(0, globalParserInfo_1.isInsideInteractor)()) {
                r.push({
                    line: i,
                    startCharacter: 0,
                    length: line.length,
                    tokenType: "regexp",
                    tokenModifiers: [""],
                });
                break;
            }
            else {
                // the update section is called in order to specificy in which part of the text we are currently in,
                // as well as giving the information if the current line represent a change of section
                const isNewSection = (0, globalParserInfo_1.updateSection)(line, i);
                // in case there is a change of section
                if (isNewSection) {
                    /* If the previous section is "attributes" than, the defines can be processed,
                    atleast those that are not simple, and require the information of which attributes where defined
                    inside the interactors */
                    if (globalParserInfo_1.previousSection === "attributes") {
                        const definesLinesHeld = lineHolder.get("defines");
                        if (definesLinesHeld !== undefined) {
                            for (let x = 0; x < definesLinesHeld.length; x++) {
                                const { line, lineNumber } = definesLinesHeld[x];
                                currentOffset = 0;
                                if ((currentOffset = parseSpecificPart(definesParser_1._parseDefines, r, line.slice(currentOffset), lineNumber, currentOffset))) {
                                }
                                else {
                                    break;
                                }
                            }
                            // clearing the lines held for defines
                            lineHolder.set("defines", []);
                            currentOffset = 0;
                        }
                    }
                    break;
                }
                else {
                    // A simple to switch for dealing with different sections
                    switch (getActiveSection()) {
                        case "types":
                            if ((currentOffset = parseSpecificPart(typesParser_1._parseTypes, r, line, i, currentOffset))) {
                            }
                            else {
                                break;
                            }
                            break;
                        case "defines":
                            if (isNotAnExpression(line)) {
                                if ((currentOffset = parseSpecificPart(definesParser_1._parseDefines, r, line, i, currentOffset))) {
                                }
                                else {
                                    break;
                                }
                            }
                            else {
                                if (!lineHolder.has("defines")) {
                                    lineHolder.set("defines", []);
                                }
                                lineHolder.get("defines").push({ line: line, lineNumber: i });
                                break;
                            }
                            break;
                        case "axioms":
                            if ((currentOffset = parseSpecificPart(axiomParser_1._parseAxioms, r, line, i, currentOffset))) {
                            }
                            else {
                                break;
                            }
                            break;
                        case "actions":
                            if ((currentOffset = parseSpecificPart(actionsParser_1._parseActions, r, line, i, currentOffset))) {
                            }
                            else {
                                break;
                            }
                            break;
                        case "attributes":
                            if ((currentOffset = parseSpecificPart(attributesParser_1._parseAttributes, r, line, i, currentOffset))) {
                            }
                            else {
                                break;
                            }
                            break;
                        case "aggregates":
                            if ((currentOffset = parseSpecificPart(includesParser_1._parseIncludes, r, line, i, currentOffset))) {
                            }
                            else {
                                break;
                            }
                            break;
                        default: break;
                    }
                    break;
                }
            }
        } while (true);
    }
    (0, checkIfUsed_1.checkIfUsed)(lines);
    return r;
}
exports._parseText = _parseText;


/***/ }),
/* 15 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseDefines = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
const relationParser_1 = __webpack_require__(11);
const parseTokensForITokens = (toParseTokens, lineNumber, line) => {
    const tokens = [];
    if (toParseTokens !== undefined) {
        for (let t of toParseTokens) {
            tokens.push({
                line: lineNumber,
                startCharacter: line.indexOf(t.value),
                length: t.value.length,
                tokenType: t.tokenType,
                tokenModifiers: [""],
            });
        }
    }
    return { tokens: tokens, size: line.length };
};
const parseDefinesBeforeValue = (line, lineNumber) => {
    const beforeEquals = line.slice(0, line.indexOf("="));
    const afterEquals = line.slice(line.indexOf("=") + 1, line.length);
    if (globalParserInfo_1.defines.has(beforeEquals.trim())) {
        const retFromDiag = (0, diagnostics_1.addDiagnosticToRelation)("att", { line: line, lineNumber: lineNumber, el: line }, beforeEquals, afterEquals, beforeEquals.trim() + " is already defined!", "warning", 0, line.indexOf("=") + 1, 0, diagnostics_1.ALREADY_DEFINED + ":" + lineNumber + ":" + beforeEquals.trim());
        return parseTokensForITokens(retFromDiag, lineNumber, line);
    }
    else {
        let arrayToTokenize = [];
        if (beforeEquals.trim() !== "") {
            if (!isNaN(+afterEquals.trim())) {
                globalParserInfo_1.defines.set(beforeEquals.trim(), {
                    used: false,
                    type: "number",
                    value: afterEquals.trim(),
                });
                arrayToTokenize = [
                    { value: beforeEquals.trim(), tokenType: "keyword" },
                    { value: afterEquals.trim(), tokenType: "number" },
                ];
            }
            else {
                globalParserInfo_1.defines.set(beforeEquals.trim(), { used: false, type: "expression", value: afterEquals.trim() });
                const toFindTokens = /(?<=^\s*\w+\s*\=).*/;
                const toSeparateTokens = /(\&|\||\(|\)|\-\>)/;
                const parseExpressions = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
                    return "comment";
                });
                return parseExpressions.getTokens(line, lineNumber, 0, true, relationParser_1.compareRelationTokens);
            }
            return parseTokensForITokens(arrayToTokenize, lineNumber, line);
        }
    }
};
const _parseDefines = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [parseDefinesBeforeValue];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    let foundMatch = false;
    for (const parser of sectionsToParseParsers) {
        const matchedPiece = parser(lineWithoutComments.slice(currentOffset), lineNumber);
        if (matchedPiece && matchedPiece.size > 0) {
            foundMatch = true;
            toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
            size += matchedPiece.size;
            currentOffset += matchedPiece.size;
        }
    }
    if (size === 0) {
        return undefined;
    }
    else {
        return { tokens: toRetTokens, size: size };
    }
};
exports._parseDefines = _parseDefines;


/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseTypes = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
const relationParser_1 = __webpack_require__(11);
const getNumericalValue = (s) => {
    if (!isNaN(+s)) {
        return +s;
    }
    else if (globalParserInfo_1.defines.has(s) && globalParserInfo_1.defines.get(s).type === "number") {
        return +globalParserInfo_1.defines.get(s).value;
    }
};
const parseArray = (line, lineNumber) => {
    let indexOfElement = 0;
    let arrayName = "";
    let firstIndex = 0;
    let lastIndex = 0;
    let arrayType = "";
    const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*array\s+\w+\s*\.\.\s*\w+\s+of\s+\w+/;
    //const toFindTokens = /.*/;
    const toSeparateTokens = /(\=|\barray\b|\.\.|of)/;
    const parseRanges = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        switch (indexOfElement) {
            case 0:
                arrayName = el.trim();
                indexOfElement++;
                return "type";
            case 1:
                firstIndex = getNumericalValue(el.trim());
                indexOfElement++;
                return "number";
            case 2:
                lastIndex = getNumericalValue(el.trim());
                indexOfElement++;
                return "number";
            case 3:
                arrayType = el.trim();
                indexOfElement++;
                if (arrayType === "number" || arrayType === "boolean" || globalParserInfo_1.ranges.has(arrayType) || globalParserInfo_1.enums.has(arrayType) || globalParserInfo_1.arrays.has(arrayType)) {
                    return "type";
                }
                else {
                    (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, "error", arrayType + " is not a valid type", diagnostics_1.NOT_YET_IMPLEMENTED);
                }
        }
        return "cantprint";
    });
    const toReturnRanges = parseRanges.getTokens(line, lineNumber, 0);
    if (arrayName !== "") {
        globalParserInfo_1.arrays.set(arrayName, { firstIndex: firstIndex, lastIndex: lastIndex, type: arrayType });
    }
    return toReturnRanges;
};
const parseRangeTypes = (line, lineNumber) => {
    const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*([a-zA-Z][a-zA-Z0-9\_]*|[0-9]+)\s*\.\.\s*([a-zA-Z][a-zA-Z0-9\_]*|[0-9]+)/;
    const toSeparateTokens = /(\,|\{|\})/;
    const parseRanges = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        return "cantprint";
    });
    const toReturnRanges = parseRanges.getTokens(line, lineNumber, 0, true, relationParser_1.separateRangeTokens);
    return toReturnRanges;
};
const parseEnumTypes = (line, lineNumber) => {
    const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*\{.*\}/;
    const toSeparateTokens = /(\=|\,|\{|\})/;
    let elementIndex = 0;
    let typeName = "";
    const parseEnums = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        const et = el.trim();
        if (elementIndex === 0) {
            elementIndex++;
            if (globalParserInfo_1.enums.has(et) || globalParserInfo_1.ranges.has(et)) {
                (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, et + " is already declared", "warning", diagnostics_1.ALREADY_DEFINED + ":" + lineNumber + ":" + et);
                return "function";
            }
            else {
                typeName = et;
                globalParserInfo_1.enums.set(et, { used: false, values: [] });
                return "enum";
            }
        }
        else {
            elementIndex++;
            globalParserInfo_1.enums.get(typeName)?.values.push(et);
            return "macro";
        }
    });
    return parseEnums.getTokens(line, lineNumber, 0);
};
const _parseTypes = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [parseArray, parseEnumTypes, parseRangeTypes];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    let foundMatch = false;
    for (const parser of sectionsToParseParsers) {
        const matchedPiece = parser(lineWithoutComments.slice(currentOffset), lineNumber);
        if (matchedPiece && matchedPiece.size > 0) {
            foundMatch = true;
            toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
            size += matchedPiece.size;
            currentOffset += matchedPiece.size;
        }
    }
    if (size === 0) {
        return undefined;
    }
    else {
        return { tokens: toRetTokens, size: size };
    }
};
exports._parseTypes = _parseTypes;


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseActions = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
/* Method responsible for parsing the vis tag that some action might have and assign the
semantic token "keyword" to it*/
const parseVis = (line, lineNumber, currentOffset) => {
    const toFindTokens = /^\s*\[\s*vis\s*\]/;
    // separate in the square brackets so that only the vis is colored
    const toSeparateTokens = /(\[|\])/;
    // Create an instance of ParseSection
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, 
    // in case there is an element keyword is returned
    (el, sc) => {
        return "keyword";
    });
    /* It is needed to pass the currentOffset so that the getTokens method can slice
    the current line to search only after the index of currentOffset as well as being aware
    of what offset previously existed to determine the start character of the tokens in the whole line
    and not only in the sliced one */
    return parseActionSection.getTokens(line, lineNumber, 0);
};
/* Very similar to the method above, where only the findTokens expression is changed as well as the
tokens to separate the main match. */
const parseAction = (line, lineNumber, currentOffset) => {
    let indexOfElement = 0;
    const toFindTokens = /(?<=(\]\s*|^\s*))(?<!\[)\s*[A-Za-z]+\w*\s*(\(((\s*\w+\s*),?)+\))?(?!\])/;
    const toSeparateTokens = /(\&|\||\)|\(|\,)/;
    let actionName = "";
    const actionArguments = [];
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        if (indexOfElement === 0) {
            // if an element is found, add it to the actions map and return function as the token type
            if (globalParserInfo_1.actions.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.actions.get(globalParserInfo_1.currentInteractor).has(el.trim())) {
                (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el.trim() + " is already defined", "error", diagnostics_1.ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim());
                indexOfElement++;
                return "regexp";
            }
            else {
                if (!globalParserInfo_1.actionsToAttributes.has(globalParserInfo_1.currentInteractor)) {
                    globalParserInfo_1.actionsToAttributes.set(globalParserInfo_1.currentInteractor, new Map());
                }
                if (!globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).has(globalParserInfo_1.currentInteractor)) {
                    globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).set(globalParserInfo_1.currentInteractor, new Map());
                }
                globalParserInfo_1.actionsToAttributes.get(globalParserInfo_1.currentInteractor).get(globalParserInfo_1.currentInteractor).set(el.trim(), new Set());
                actionName = el.trim();
                indexOfElement++;
                return "function";
            }
        }
        else {
            indexOfElement++;
            const et = el.trim();
            if (globalParserInfo_1.enums.has(et) || globalParserInfo_1.ranges.has(et) || globalParserInfo_1.arrays.has(et) || et === "boolean" || et === "number") {
                actionArguments.push(et);
                return "type";
            }
            else {
                (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, et + " is not a valid type", "error", diagnostics_1.NOT_YET_IMPLEMENTED);
                return "regexp";
            }
        }
    });
    const toReturnParseAction = parseActionSection.getTokens(line, lineNumber, 0);
    if (!globalParserInfo_1.actions.has(globalParserInfo_1.currentInteractor)) {
        globalParserInfo_1.actions.set(globalParserInfo_1.currentInteractor, new Map());
    }
    globalParserInfo_1.actions.get(globalParserInfo_1.currentInteractor).set(actionName, { used: false, line: lineNumber, arguments: actionArguments });
    return toReturnParseAction;
};
const _parseActions = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [parseVis, parseAction];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    while (currentOffset < lineWithoutComments.length) {
        let foundMatch = false;
        for (const parser of sectionsToParseParsers) {
            const matchedPiece = parser(lineWithoutComments, lineNumber, currentOffset);
            if (matchedPiece && matchedPiece.size > 0) {
                foundMatch = true;
                toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
                size += matchedPiece.size;
                currentOffset += matchedPiece.size;
            }
        }
        if (!foundMatch) {
            break;
        }
    }
    if (size === 0) {
        return undefined;
    }
    else {
        return { tokens: toRetTokens, size: size };
    }
};
exports._parseActions = _parseActions;


/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseAttributes = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
let attributesInLine = [];
const parseAttribute = (line, lineNumber, currentOffset) => {
    const toFindTokens = /(\s*[A-Za-z]+\w*\s*(\,|(?=\:)))+/;
    const toSeparateTokens = /(\,)/;
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        // if an element is found, add it to the actions map and return function as the token type
        if (globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor) && globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).has(el.trim())) {
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.trim().length, el.trim() + " is already defined", "error", diagnostics_1.ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim());
            return "regexp";
        }
        else {
            attributesInLine.push(el.trim());
            return "variable";
        }
    });
    return parseActionSection.getTokens(line, lineNumber, currentOffset);
};
const parseVis = (line, lineNumber, currentOffset) => {
    const toFindTokens = /^\s*\[\s*vis\s*\]/;
    const toSeparateTokens = /(\[|\])/;
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        return "keyword";
    });
    return parseActionSection.getTokens(line, lineNumber, currentOffset);
};
const parseType = (line, lineNumber, currentOffset) => {
    const toFindTokens = /:\s*[A-Za-z\_]+\w*\s*/;
    const toSeparateTokens = /\:/;
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        const type = el.trim();
        for (let att of attributesInLine) {
            if (!globalParserInfo_1.attributes.has(globalParserInfo_1.currentInteractor)) {
                globalParserInfo_1.attributes.set(globalParserInfo_1.currentInteractor, new Map());
            }
            globalParserInfo_1.attributes.get(globalParserInfo_1.currentInteractor).set(att, { used: false, type: type, line: lineNumber, alone: attributesInLine.length === 1 });
        }
        attributesInLine = [];
        return "type";
    });
    return parseActionSection.getTokens(line, lineNumber, currentOffset);
};
const _parseAttributes = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [
        parseVis,
        parseAttribute,
        parseType
    ];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    while (currentOffset < lineWithoutComments.length) {
        let foundMatch = false;
        for (const parser of sectionsToParseParsers) {
            const matchedPiece = parser(lineWithoutComments, lineNumber, currentOffset);
            if (matchedPiece && matchedPiece.size > 0) {
                foundMatch = true;
                toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
                size += matchedPiece.size;
                currentOffset += matchedPiece.size;
            }
        }
        if (!foundMatch) {
            break;
        }
    }
    if (size === 0) {
        return undefined;
    }
    else {
        return { tokens: toRetTokens, size: size };
    }
};
exports._parseAttributes = _parseAttributes;


/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.checkIfUsed = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(5);
const notUsed = (lines, variable, info) => {
    if (!info.used) {
        const l = info.line;
        const sc = ParseSection_1.ParseSection.getPosition(lines[l], variable, 1);
        (0, diagnostics_1.addDiagnostic)(l, sc, l, sc + variable.length, variable + " was never used!", "warning", "NOTHING");
    }
};
const checkIfUsed = (lines) => {
    for (let y of globalParserInfo_1.interactorLimits) {
        if (globalParserInfo_1.actions.has(y[0])) {
            for (let x of globalParserInfo_1.actions.get(y[0])) {
                notUsed(lines, x[0], { used: x[1].used, line: x[1].line });
            }
        }
        if (globalParserInfo_1.attributes.has(y[0])) {
            for (let x of globalParserInfo_1.attributes.get(y[0])) {
                notUsed(lines, x[0], { used: x[1].used, line: x[1].line });
            }
        }
    }
};
exports.checkIfUsed = checkIfUsed;


/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ActionsDeterminismProvider = void 0;
const vscode = __webpack_require__(1);
const globalParserInfo_1 = __webpack_require__(4);
class ActionsDeterminismProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
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
                        interactors: Array.from(globalParserInfo_1.interactorLimits).map(([key, _value]) => key),
                        actions: Array.from(globalParserInfo_1.actionsToAttributes).map(([mainInteractor, insideInteractors]) => {
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
    joinAttributesFromInteractors(main) {
        const mySet = new Set();
        for (let included of Array.from(globalParserInfo_1.aggregates)
            .filter((el) => el[1].current === main)
            .map(([key, value]) => value.included)) {
            if (globalParserInfo_1.attributes.has(included)) {
                for (let x of Array.from(globalParserInfo_1.attributes.get(included)).map(([key, value]) => key)) {
                    if (included !== main) {
                        const aggregatedName = Array.from(globalParserInfo_1.aggregates).filter((el) => el[1].current === main && el[1].included === included)[0][0];
                        mySet.add(aggregatedName + "." + x);
                    }
                    else {
                        mySet.add(x);
                    }
                }
            }
        }
        if (globalParserInfo_1.attributes.has(main)) {
            for (let x of Array.from(globalParserInfo_1.attributes.get(main)).map(([key, value]) => key)) {
                mySet.add(x);
            }
        }
        return [...mySet];
    }
    _getHtmlForWebview(webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"));
        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.css"));
        // Use a nonce to only allow a specific script to be run.
        const nonce = getNonce();
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<title>Determinism of Actions</title>
        <script src="https://kit.fontawesome.com/266aa513f6.js" crossorigin="anonymous"></script>
			</head>
			<body>
				<ul class="actions-list">
				</ul>
				<button class="actions-button">Refresh Actions</button>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}
exports.ActionsDeterminismProvider = ActionsDeterminismProvider;
ActionsDeterminismProvider.viewType = "mal-deterministic";
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map