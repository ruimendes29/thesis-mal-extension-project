/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = exports.diagnosticCollection = void 0;
const vscode = __webpack_require__(1);
const codeActionsProvider_1 = __webpack_require__(2);
const globalParserInfo_1 = __webpack_require__(4);
const textParser_1 = __webpack_require__(5);
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
    context.subscriptions.push(exports.diagnosticCollection);
    vscode.window.onDidChangeActiveTextEditor(() => {
        (0, globalParserInfo_1.clearStoredValues)();
    });
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider("mal", new codeActionsProvider_1.Emojinfo(), {
        providedCodeActionKinds: codeActionsProvider_1.Emojinfo.providedCodeActionKinds,
    }));
    context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: "mal" }, new DocumentSemanticTokensProvider(), legend));
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
const COMMAND = "mal.command";
/**
 * Provides code actions corresponding to diagnostic problems.
 */
class Emojinfo {
    provideCodeActions(document, range, context, token) {
        // for each diagnostic entry that has the matching `code`, create a code action command
        return context.diagnostics
            .map((diagnostic) => {
            switch (diagnostic.code.toString().split(":")[0]) {
                case diagnostics_1.DECLARE_ACTION:
                    return this.declareAction(document, diagnostic.code.toString().split(":")[1], diagnostic);
                case diagnostics_1.CHANGE_TYPE:
                    return this.changeToCorrectType(document, diagnostic.code?.toString().split(":")[1], +diagnostic.code?.toString().split(":")[2], diagnostic);
                default:
                    return this.changeToCorrectType(document, diagnostic.code?.toString().split(":")[1], +diagnostic.code?.toString().split(":")[2], diagnostic);
            }
        });
    }
    changeToCorrectType(document, newType, lineToFix, diagnostic) {
        const fix = new vscode.CodeAction(`Convert to ${newType}`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        const line = document.lineAt(lineToFix).text;
        const characterOfType = line.indexOf(":") + 2;
        const oldTypeRange = new vscode.Range(new vscode.Position(lineToFix, characterOfType), new vscode.Position(lineToFix, line.indexOf("#") > 0 ? line.indexOf("#") : line.length));
        fix.edit.replace(document.uri, oldTypeRange, newType + " ");
        return fix;
    }
    declareAction(document, newAction, diagnostic) {
        const fix = new vscode.CodeAction(`Declare ${newAction} as an action`, vscode.CodeActionKind.QuickFix);
        fix.diagnostics = [diagnostic];
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.insert(document.uri, new vscode.Position(globalParserInfo_1.actionsStartingLine[0] + 1, 0), "  " + newAction + "\n");
        return fix;
    }
}
exports.Emojinfo = Emojinfo;
Emojinfo.providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addDiagnosticToRelation = exports.addDiagnostic = exports.clearDiagnosticCollection = exports.NOT_YET_IMPLEMENTED = exports.DECLARE_ACTION = exports.CHANGE_TYPE = void 0;
const vscode = __webpack_require__(1);
const extension_1 = __webpack_require__(0);
const globalParserInfo_1 = __webpack_require__(4);
exports.CHANGE_TYPE = "changeType";
exports.DECLARE_ACTION = "declareAction";
exports.NOT_YET_IMPLEMENTED = "notYetImplemented";
const mapForDiag = new Map();
const clearDiagnosticCollection = () => {
    globalParserInfo_1.actions.clear();
    globalParserInfo_1.defines.clear();
    globalParserInfo_1.enums.clear();
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
const addDiagnosticToRelation = (type, line, lineNumber, fullCondition, attribute, value, message, severity, offset, code) => {
    let stringToCompare = "";
    if (type === "att") {
        stringToCompare = attribute;
    }
    else if (type === "val") {
        stringToCompare = value;
    }
    (0, exports.addDiagnostic)(lineNumber, line.indexOf(fullCondition) + fullCondition.indexOf(stringToCompare) + offset, lineNumber, line.indexOf(fullCondition) +
        fullCondition.indexOf(stringToCompare) +
        stringToCompare.length + offset, message, severity, code);
    return [
        {
            offset: fullCondition.indexOf(attribute),
            value: attribute,
            tokenType: stringToCompare === attribute ? "regexp" : "variable",
        },
        {
            offset: fullCondition.indexOf(value),
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
exports.clearStoredValues = exports.isInsideInteractor = exports.isSubSection = exports.updateSection = exports.ranges = exports.enums = exports.defines = exports.actions = exports.attributes = exports.actionsStartingLine = exports.previousSection = exports.sections = void 0;
exports.sections = new Map();
exports.previousSection = "";
exports.actionsStartingLine = new Array();
exports.attributes = new Map();
exports.actions = new Map();
exports.defines = new Map();
exports.enums = new Map();
exports.ranges = new Map();
exports.sections.set("attributes", false);
exports.sections.set("types", false);
exports.sections.set("defines", false);
exports.sections.set("interactor", false);
exports.sections.set("actions", false);
exports.sections.set("axioms", false);
exports.sections.set("test", false);
const updateSection = (line, lineNumber) => {
    if (line.trim() === "actions") {
        exports.actionsStartingLine.push(lineNumber);
    }
    let x;
    x = /^\s*interactor\s+[a-zA-Z]+[a-zA-Z\_0-9]*/.exec(line);
    const trimmed = x ? "interactor" : line.trim();
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
    if (line.trim() === "attributes" || line.trim() === "actions" || line.trim() === "axioms" || line.trim() === "test") {
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
        exports.sections.get("test"));
};
exports.isInsideInteractor = isInsideInteractor;
const clearStoredValues = () => {
    exports.attributes.clear();
    exports.sections.forEach((_v, key) => {
        exports.sections.set(key, false);
    });
};
exports.clearStoredValues = clearStoredValues;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseText = void 0;
const axiomParser_1 = __webpack_require__(6);
const definesParser_1 = __webpack_require__(9);
const globalParserInfo_1 = __webpack_require__(4);
const diagnostics_1 = __webpack_require__(3);
const typesParser_1 = __webpack_require__(10);
const actionsParser_1 = __webpack_require__(11);
const attributesParser_1 = __webpack_require__(12);
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
    // splitting the lines
    const lines = text.split(/\r\n|\r|\n/);
    //loopn through all lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        //variable to represent the current offset to be considered when parsing the line
        let currentOffset = 0;
        do {
            console.log(currentOffset + " " + line);
            // Checking if the line represents a special section (ex: actions, axioms...), but its not inside an interactor
            // so that an error can be emitted to the user
            // TODO: currently only change the color of the text
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
                        default: break;
                    }
                    break;
                }
            }
        } while (true);
    }
    return r;
}
exports._parseText = _parseText;


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseAxioms = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(7);
const relationParser_1 = __webpack_require__(8);
const parseConditions = (line, lineNumber) => {
    const toFindTokens = /^.*(?=\s*\<?\-\>)/;
    const toSeparateTokens = /(\&|\||\)|\(|\!)/;
    const parseConditionsSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        return "cantprint";
    });
    return parseConditionsSection.getTokens(line, lineNumber, 0, true, relationParser_1.compareRelationTokens);
};
const parseTriggerAction = (line, lineNumber) => {
    const toFindTokens = /(\<?\s*\-\>\s*)?\[[^\[]+\]/;
    const toSeparateTokens = /(\(|\)|\-|\>|\<|\&|\||\!|\[|\])/;
    const parseTriggerActions = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        if (globalParserInfo_1.actions.has(el)) {
            return "function";
        }
        else {
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an action", "error", diagnostics_1.DECLARE_ACTION + ":" + el);
            return "variable";
        }
    });
    return parseTriggerActions.getTokens(line, lineNumber, 0);
};
const parsePer = (line, lineNumber) => {
    const toFindTokens = /(?<=^\s*per\s*\().+(?=\))/;
    const toSeparateTokens = /(\(|\)|\||\&|\!)/;
    const parsePers = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        if (globalParserInfo_1.actions.has(el)) {
            return "function";
        }
        else {
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an action", "error", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + lineNumber);
            return "variable";
        }
    });
    return parsePers.getTokens(line, lineNumber, 0);
};
const parseNextState = (line, lineNumber) => {
    const toFindTokens = /(?<=(\]|^per\s*\(.*\)\s*\<?\-\>)).*/;
    const toSeparateTokens = /(\&|\||\)|\(|\,)/;
    const parseConditionsSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        return "cantprint";
    });
    const perRegex = /^\s*per\s*\(\s*\w*\s*\)\s*\-\s*\>/;
    const correctOffset = line.indexOf("]") > 0 ? line.indexOf("]") : line.match(perRegex) !== null ? line.match(perRegex)[0].length : 0;
    return parseConditionsSection.getTokens(line, lineNumber, correctOffset, true, relationParser_1.compareRelationTokens);
};
const _parseAxioms = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [
        parseConditions,
        parseTriggerAction,
        parsePer,
        parseNextState,
    ];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    while (currentOffset < lineWithoutComments.length) {
        let foundMatch = false;
        for (const parser of sectionsToParseParsers) {
            const matchedPiece = parser(lineWithoutComments, lineNumber);
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
exports._parseAxioms = _parseAxioms;


/***/ }),
/* 7 */
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
    getTokens(line, lineNumber, offset, aggregatedTokens, separateTokens, areTokensExpressions) {
        let x;
        // check if any match can be found the sliced line with the findTokens RegExp
        if ((x = this.findTokens.exec(line.slice(offset)))) {
            // In case there was a match:
            if (x) {
                //alias for separationSymbols
                let ss = this.separationSymbols;
                // separate the matched line into de different elements through the separationSymbols
                let separatedLine = x[0].trim().split(ss);
                // to return the tokens found in the line
                let tokens = [];
                // map that holds as key the string correspondent to an element and as value the occurance number,
                // so that we can later tell the token where the attribute is, even if it has multiple occurences
                let mapTokens = new Map();
                // loop through each element
                separatedLine.forEach((el) => {
                    // check if the element is not an operator or just spaces
                    if (!ss.test(el.trim()) && el.trim() !== "") {
                        const trimmedEl = el.trim();
                        const tokenForMap = trimmedEl[trimmedEl.length - 1] === "'"
                            ? trimmedEl.slice(0, trimmedEl.length - 1)
                            : trimmedEl.indexOf("=") > 0
                                ? trimmedEl.slice(0, trimmedEl.indexOf("=") + 1)
                                : trimmedEl;
                        // if the element is not already in the map, then we put it
                        if (!mapTokens.has(tokenForMap)) {
                            mapTokens.set(tokenForMap, 1);
                        }
                        // find the next index to be considered while parsing the elements from the line
                        let nextIndexLine = !areTokensExpressions
                            ? ParseSection.getPosition(line.slice(offset), tokenForMap, mapTokens.get(tokenForMap))
                            : line.indexOf(trimmedEl);
                        if (!aggregatedTokens) {
                            tokens.push({
                                line: lineNumber,
                                startCharacter: nextIndexLine + offset,
                                length: trimmedEl.length,
                                // to had the token type we check if the element is in the attributes and is a boolean
                                tokenType: this.tokenTypeCondition(trimmedEl, nextIndexLine + offset),
                                tokenModifiers: [""],
                            });
                        }
                        else {
                            const sepTokens = separateTokens(trimmedEl, line, lineNumber, offset);
                            if (sepTokens !== undefined) {
                                for (let t of sepTokens) {
                                    tokens.push({
                                        line: lineNumber,
                                        startCharacter: nextIndexLine + offset + t.offset,
                                        length: t.value.length,
                                        tokenType: t.tokenType,
                                        tokenModifiers: [""],
                                    });
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
/* 8 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.compareRelationTokens = exports.separateRangeTokens = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(7);
const attributeExists = (attribute) => {
    return (globalParserInfo_1.attributes.has(attribute) ||
        (attribute.charAt(attribute.length - 1) === "'" && globalParserInfo_1.attributes.has(attribute.substring(0, attribute.length - 1))));
};
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
    else if (globalParserInfo_1.attributes.has(value) && globalParserInfo_1.ranges.has(globalParserInfo_1.attributes.get(value).type)) {
        return "number";
    }
    else if (globalParserInfo_1.attributes.has(correctValue)) {
        return globalParserInfo_1.attributes.get(correctValue).type;
    }
    else {
        for (var [k, v] of globalParserInfo_1.enums) {
            if (v.values.includes(value)) {
                return k;
            }
        }
    }
    return undefined;
};
const isAttributeSameAsValue = (attribute, value) => {
    if (globalParserInfo_1.attributes.get(attribute).type === findValueType(value) ||
        (globalParserInfo_1.ranges.has(globalParserInfo_1.attributes.get(attribute).type) && findValueType(value) === "number")) {
        return true;
    }
    else {
        return false;
    }
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
const separateRangeTokens = (el, line, lineNumber, offset) => {
    let indexOfOp = 0;
    const afterAndBefore = el.split("=");
    if ((indexOfOp = afterAndBefore[1].search(/\.\./)) > 0) {
        const min = afterAndBefore[1].slice(0, indexOfOp).trim();
        const max = afterAndBefore[1].slice(indexOfOp + 2).trim();
        const minimum = parseRangeInput(min);
        const maximum = parseRangeInput(max);
        if (minimum.value >= maximum.value) {
            return (0, diagnostics_1.addDiagnosticToRelation)("att", line, lineNumber, afterAndBefore[1], min, max, minimum.value + " is equal or greater than " + maximum.value, "warning", offset, diagnostics_1.NOT_YET_IMPLEMENTED + ":" + lineNumber);
        }
        globalParserInfo_1.ranges.set(afterAndBefore[0].trim(), {
            used: false,
            minimum: minimum.value,
            maximum: maximum.value,
        });
        return [
            {
                offset: el.indexOf(min),
                value: min,
                tokenType: minimum.isANumber ? "number" : "variable",
            },
            {
                offset: el.indexOf(max),
                value: max,
                tokenType: maximum.isANumber ? "number" : "variable",
            },
        ];
    }
    return undefined;
};
exports.separateRangeTokens = separateRangeTokens;
const processExpressions = (el, att, val, implies) => {
    const specialChars = /(\+|\!|\-|\&|\*|\,|\)|\(|\/|\||\>|\<)/;
    const splittedValue = val.split(specialChars);
    let currentType = "";
    let i = 0;
    let offsetForToks = el.indexOf(val);
    let toks = [];
    if (att.trim() === "" || val.trim() === "") {
        return undefined;
    }
    if ((isAttributeSameAsValue(att, splittedValue[0].trim()) && splittedValue.length > 1) || implies) {
        toks.push({ offset: el.indexOf(att), value: att, tokenType: implies ? "variable" : "keyword" });
        for (i = 0; i < splittedValue.length; i++) {
            const trimmedV = splittedValue[i].trim();
            if (trimmedV.match(specialChars) !== null) {
                offsetForToks += splittedValue[i].length;
            }
            else {
                if (i === 0) {
                    currentType = findValueType(trimmedV);
                    offsetForToks += splittedValue[i].length;
                }
                else {
                    const newType = findValueType(trimmedV);
                    offsetForToks += splittedValue[i].length;
                    if (currentType !== newType) {
                        break;
                    }
                }
                toks.push({
                    offset: offsetForToks - splittedValue[i].length,
                    value: trimmedV,
                    tokenType: !isNaN(+trimmedV) ? "number" : "variable",
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
const compareRelationTokens = (el, line, lineNumber, offset) => {
    let indexOfOp;
    // Check if there is any symbol that might indicate a relation
    if ((indexOfOp = el.match(/(\<\s*\=|\>\s*\=|\=|\>|\<|\<?\s*\-\s*\>)/)) !== null) {
        //separate the attribute and the value
        const preAtt = el.slice(0, el.indexOf(indexOfOp[0])).trim();
        // take out the ' that simbolizes the next state
        let att = preAtt.charAt(preAtt.length - 1) === "'" ? preAtt.substring(0, preAtt.length - 1) : preAtt;
        //get the value
        let val = el.slice(el.indexOf(indexOfOp[0]) + indexOfOp[0].length).trim();
        const withoutExclamation = att.slice(att.indexOf("!") + 1).trim();
        if (att[0] === "!" &&
            globalParserInfo_1.attributes.has(withoutExclamation) &&
            globalParserInfo_1.attributes.get(withoutExclamation)?.type === "boolean") {
            att = withoutExclamation;
        }
        if (/\<?\s*\-\s*\>/.test(indexOfOp[0])) {
            //process multiple expressions when connected
            const expressionsParsedx = processExpressions(el, att, val, true);
            if (expressionsParsedx !== undefined) {
                return expressionsParsedx;
            }
        }
        //check if the attribute existe in the already processed attributes
        if (!attributeExists(att)) {
            return (0, diagnostics_1.addDiagnosticToRelation)("att", line, lineNumber, el, att, val, att + " is not defined", "error", 0, diagnostics_1.NOT_YET_IMPLEMENTED + ":" + lineNumber);
        }
        // if the value is a boolean and starts with the negation symbol, that we can take that char off
        if (val.trim()[0] === "!" && findValueType(val.slice(val.indexOf("!") + 1).trim()) === "boolean") {
            val = val.slice(val.indexOf("!") + 1).trim();
        }
        //process multiple expressions when connected
        const expressionsParsed = processExpressions(el, att, val, false);
        if (expressionsParsed !== undefined) {
            return expressionsParsed;
        }
        // if the type of the value can not be found
        if (val.trim() !== "" && findValueType(val) === undefined) {
            return (0, diagnostics_1.addDiagnosticToRelation)("val", line, lineNumber, el, att, val, val + " is not a valid value", "error", 0, diagnostics_1.NOT_YET_IMPLEMENTED + ":" + lineNumber);
        }
        // the attribute and the value are not of the same type
        if (val.trim() !== "" && att.trim() !== "" && !isAttributeSameAsValue(att, val)) {
            return (0, diagnostics_1.addDiagnosticToRelation)("att", line, lineNumber, el, att, val, att + " is not of type " + findValueType(val), "warning", 0, diagnostics_1.CHANGE_TYPE + ":" + findValueType(val) + ":" + globalParserInfo_1.attributes.get(att.trim()).line);
        }
        return [
            { offset: ParseSection_1.ParseSection.getPosition(el, att, 1), value: att, tokenType: "variable" },
            { offset: ParseSection_1.ParseSection.getPosition(el, val, 1), value: val, tokenType: "macro" },
        ];
    }
    else {
        if (globalParserInfo_1.attributes.has(el.trim()) && globalParserInfo_1.attributes.get(el.trim())?.type === "boolean") {
            return [{ offset: 0, value: el, tokenType: "variable" }];
        }
    }
    return undefined;
};
exports.compareRelationTokens = compareRelationTokens;


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseDefines = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(7);
const relationParser_1 = __webpack_require__(8);
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
        const retFromDiag = (0, diagnostics_1.addDiagnosticToRelation)("att", line, lineNumber, line, beforeEquals.trim(), afterEquals.trim(), beforeEquals.trim() + " is already defined!", "warning", 0, diagnostics_1.NOT_YET_IMPLEMENTED + ":" + lineNumber);
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
                const toFindTokens = /^.*/;
                const toSeparateTokens = /(\&|\||\(|\)|\-\>)/;
                const parseExpressions = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
                    return "comment";
                });
                return parseExpressions.getTokens(line, lineNumber, line.indexOf(afterEquals), true, relationParser_1.compareRelationTokens);
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
    while (currentOffset < lineWithoutComments.length) {
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
exports._parseDefines = _parseDefines;


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseTypes = void 0;
const diagnostics_1 = __webpack_require__(3);
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(7);
const relationParser_1 = __webpack_require__(8);
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
        if (elementIndex === 0) {
            elementIndex++;
            if (globalParserInfo_1.enums.has(el) || globalParserInfo_1.ranges.has(el)) {
                (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is already declared", "warning", diagnostics_1.NOT_YET_IMPLEMENTED + ":" + lineNumber);
                return "function";
            }
            else {
                typeName = el;
                globalParserInfo_1.enums.set(el, { used: false, values: [] });
                return "enum";
            }
        }
        else {
            elementIndex++;
            globalParserInfo_1.enums.get(typeName)?.values.push(el);
            return "macro";
        }
    });
    return parseEnums.getTokens(line, lineNumber, 0);
};
const _parseTypes = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [
        parseEnumTypes,
        parseRangeTypes
    ];
    const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    while (currentOffset < lineWithoutComments.length) {
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
exports._parseTypes = _parseTypes;


/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseActions = void 0;
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(7);
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
    return parseActionSection.getTokens(line, lineNumber, currentOffset);
};
/* Very similar to the method above, where only the findTokens expression is changed as well as the
tokens to separate the main match. */
const parseAction = (line, lineNumber, currentOffset) => {
    const toFindTokens = /\s*[A-Za-z]+\w*\s*/;
    const toSeparateTokens = /(\&|\||\)|\(|\,)/;
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        // if an element is found, add it to the actions map and return function as the token type
        //TODO: check if the action exists already or not
        globalParserInfo_1.actions.set(el.trim(), false);
        return "function";
    });
    return parseActionSection.getTokens(line, lineNumber, currentOffset);
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
/* 12 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseAttributes = void 0;
const globalParserInfo_1 = __webpack_require__(4);
const ParseSection_1 = __webpack_require__(7);
let attributesInLine = [];
const parseAttribute = (line, lineNumber, currentOffset) => {
    const toFindTokens = /(\s*[A-Za-z]+\w*\s*(\,|(?=\:)))+/;
    const toSeparateTokens = /(\,)/;
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        //TODO: check if the attribute exists already or not
        attributesInLine.push(el.trim());
        return "variable";
    });
    return parseActionSection.getTokens(line, lineNumber, currentOffset);
};
const parseVis = (line, lineNumber, currentOffset) => {
    const toFindTokens = /^\s*\[\s*vis\s*\]/;
    const toSeparateTokens = /(\[|\])/;
    const parseActionSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
        console.log("parsed a vis!");
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
            globalParserInfo_1.attributes.set(att, { used: false, type: type, line: lineNumber });
        }
        attributesInLine = [];
        return "type";
    });
    return parseActionSection.getTokens(line, lineNumber, currentOffset);
};
const _parseAttributes = (line, lineNumber) => {
    console.log("started parsing attributes");
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