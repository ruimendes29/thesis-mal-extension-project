/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.clearStoredValues = exports.isInsideInteractor = exports.isSubSection = exports.updateSection = exports.enums = exports.defines = exports.actions = exports.attributes = exports.sections = void 0;
exports.sections = new Map();
exports.attributes = new Map();
exports.actions = new Map();
exports.defines = new Map();
exports.enums = new Map();
exports.sections.set("attributes", false);
exports.sections.set("types", false);
exports.sections.set("defines", false);
exports.sections.set("interactor", false);
exports.sections.set("actions", false);
exports.sections.set("axioms", false);
exports.sections.set("test", false);
const updateSection = (line) => {
    let x;
    x = /^\s*interactor\s+[a-zA-Z]+[a-zA-Z\_0-9]*/.exec(line);
    const trimmed = x ? "interactor" : line.trim();
    if (exports.sections.has(trimmed)) {
        exports.sections.forEach((_value, key) => {
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
        line.trim() === "test") {
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
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseText = void 0;
const axiomParser_1 = __webpack_require__(4);
const actionAndAttribParser_1 = __webpack_require__(7);
const definesParser_1 = __webpack_require__(8);
const globalParserInfo_1 = __webpack_require__(2);
const diagnostics_1 = __webpack_require__(5);
const typesParser_1 = __webpack_require__(9);
//ToDo: need to find a way to suit the code in this function in order to reduce duplicated code
/*const parseSection = (
  section: string,
  parser: Function,
  line: string,
  currentOffset: number,
  lineNumber: number,
  tokensArray: IParsedToken[]
): boolean => {
  if (sections.get(section)) {
    const parsedSection = parser(line.slice(currentOffset), lineNumber);
    if (parsedSection !== undefined) {
      parsedSection.tokens.forEach((el: IParsedToken) => {
        tokensArray.push(el);
      });
      currentOffset += parsedSection.size;
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};*/
function _parseText(text) {
    const r = [];
    (0, diagnostics_1.clearDiagnosticCollection)();
    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let currentOffset = 0;
        do {
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
                const isNewSection = (0, globalParserInfo_1.updateSection)(line);
                if (isNewSection) {
                    break;
                }
                else if (globalParserInfo_1.sections.get("types")) {
                    const parsedTypes = (0, typesParser_1._parseTypes)(line.slice(currentOffset), i);
                    if (parsedTypes !== undefined) {
                        parsedTypes.tokens.forEach((el) => {
                            r.push(el);
                        });
                        currentOffset += parsedTypes.size;
                    }
                    else {
                        break;
                    }
                }
                else if (globalParserInfo_1.sections.get("defines")) {
                    const parsedDefines = (0, definesParser_1._parseDefines)(line.slice(currentOffset), i);
                    if (parsedDefines !== undefined) {
                        parsedDefines.tokens.forEach((el) => {
                            r.push(el);
                        });
                        currentOffset += parsedDefines.size;
                    }
                    else {
                        break;
                    }
                }
                else if (globalParserInfo_1.sections.get("attributes") || globalParserInfo_1.sections.get("actions")) {
                    const parsedVariables = (0, actionAndAttribParser_1._parseVariables)(line, currentOffset, i);
                    if (parsedVariables === undefined) {
                        break;
                    }
                    else {
                        r.push(parsedVariables.foundToken);
                        currentOffset = parsedVariables.nextOffset;
                    }
                }
                else if (globalParserInfo_1.sections.get("axioms")) {
                    const parsedAxiom = (0, axiomParser_1._parseAxioms)(line.slice(currentOffset), i);
                    if (parsedAxiom !== undefined) {
                        parsedAxiom.tokens.forEach((el) => {
                            r.push(el);
                        });
                        currentOffset += parsedAxiom.size;
                    }
                    else {
                        break;
                    }
                    break;
                }
                else {
                    break;
                }
            }
        } while (true);
    }
    return r;
}
exports._parseText = _parseText;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseAxioms = void 0;
const diagnostics_1 = __webpack_require__(5);
const globalParserInfo_1 = __webpack_require__(2);
const ParseSection_1 = __webpack_require__(6);
/* function responsible for adding diagnostics to the attributes when they are in the conditions
  if any given axiom */
const addDiagnosticToRelation = (type, line, lineNumber, fullCondition, attribute, value, message, severity) => {
    let stringToCompare = "";
    if (type === "att") {
        stringToCompare = attribute;
    }
    else if (type === "val") {
        stringToCompare = value;
    }
    (0, diagnostics_1.addDiagnostic)(lineNumber, line.indexOf(fullCondition) + fullCondition.indexOf(stringToCompare), lineNumber, line.indexOf(fullCondition) +
        fullCondition.indexOf(stringToCompare) +
        stringToCompare.length, message, severity);
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
const parseConditions = (line, lineNumber) => {
    const toFindTokens = /^.*(?=\s*\<?\-\>)/;
    const toSeparateTokens = /(\&|\||\)|\()/;
    const previousTokens = "";
    let indexOfOp = 0;
    const attributeExists = (attribute) => {
        return globalParserInfo_1.attributes.has(attribute);
    };
    const findValueType = (value) => {
        if (value === "true" || value === "false") {
            return "boolean";
        }
        else if (!isNaN(+value) && value !== "") {
            // check if value is a number
            return "number";
        }
        else if (globalParserInfo_1.attributes.has(value)) {
            return "attribute";
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
        if (globalParserInfo_1.attributes.get(attribute).type === findValueType(value)) {
            return true;
        }
        else {
            return false;
        }
    };
    const separateTokens = (el) => {
        if ((indexOfOp = el.search(/(\<\s*\=|\>\s*\=|\=|\>|\<(?!\s*-))/)) > 0) {
            const att = el.slice(0, indexOfOp).trim();
            const val = el.slice(indexOfOp + 1).trim();
            if (!attributeExists(att)) {
                return addDiagnosticToRelation("att", line, lineNumber, el, att, val, att + " is not defined", "error");
            }
            if (findValueType(val) === undefined) {
                return addDiagnosticToRelation("val", line, lineNumber, el, att, val, val + " is not a valid value", "error");
            }
            if (!isAttributeSameAsValue(att, val)) {
                return addDiagnosticToRelation("att", line, lineNumber, el, att, val, att + " is not of type " + findValueType(val), "warning");
            }
            return [
                { offset: el.indexOf(att), value: att, tokenType: "variable" },
                { offset: el.indexOf(val), value: val, tokenType: "macro" },
            ];
        }
        return undefined;
    };
    const parseConditionsSection = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, previousTokens, (el, sc) => {
        return "cantprint";
    });
    return parseConditionsSection.getTokens(line, lineNumber, 0, true, separateTokens);
};
const parseTriggerAction = (line, lineNumber) => {
    const toFindTokens = /(\<?\s*\-\>\s*)?\[[^\[]+\]/;
    const toSeparateTokens = /(\(|\)|\-|\>|\<|\&|\||\!|\[|\])/;
    const previousTokens = "";
    const parseTriggerActions = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, previousTokens, (el, sc) => {
        if (globalParserInfo_1.actions.has(el)) {
            return "function";
        }
        else {
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an action", "error");
            return "variable";
        }
    });
    return parseTriggerActions.getTokens(line, lineNumber, 0);
};
const parsePer = (line, lineNumber) => {
    const toFindTokens = /(?<=^\s*per\s*\().+(?=\))/;
    const toSeparateTokens = /(\(|\)|\||\&|\!)/;
    const previousTokens = "";
    const parsePers = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, previousTokens, (el, sc) => {
        if (globalParserInfo_1.actions.has(el)) {
            return "function";
        }
        else {
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an action", "error");
            return "variable";
        }
    });
    return parsePers.getTokens(line, lineNumber, 0);
};
const parseNextState = (line, lineNumber) => {
    const toFindTokens = /(?<=(\]|^per\s*\(.*\)\s*\<?\-\>)).*/;
    const toSeparateTokens = /(\(|\)|\&|\||\!|\[|\]|\,|\=|\#|\-|\<|\>)/;
    const previousTokens = "(?<=[&\\|\\=\\!\\]\\)\\(\\#\\,\\-\\>\\<]\\s*)";
    const followingSymbols = "(?![a-zA-Z0-9\\_]+)";
    const parseNextState = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, previousTokens, (el, sc) => {
        if (el !== "keep") {
            if (globalParserInfo_1.attributes.has(el) ||
                (globalParserInfo_1.attributes.has(el.slice(0, el.length - 1)) &&
                    el[el.length - 1] === "'")) {
                return "struct";
            }
            else {
                if (isNaN(+el.trim())) {
                    (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an attribute", "error");
                }
                return "label";
            }
        }
        else {
            return "keyword";
        }
    }, followingSymbols);
    if (line.indexOf("]") === -1) {
        return parseNextState.getTokens(line, lineNumber, 0);
    }
    else {
        return parseNextState.getTokens(line.slice(line.indexOf("]")), lineNumber, line.indexOf("]"));
    }
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
/* 5 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.addDiagnostic = exports.clearDiagnosticCollection = void 0;
const vscode = __webpack_require__(1);
const globalParserInfo_1 = __webpack_require__(2);
const mapForDiag = new Map();
const diagnosticCollection = vscode.languages.createDiagnosticCollection();
const clearDiagnosticCollection = () => {
    globalParserInfo_1.actions.clear();
    globalParserInfo_1.defines.clear();
    globalParserInfo_1.enums.clear();
    mapForDiag.clear();
};
exports.clearDiagnosticCollection = clearDiagnosticCollection;
const addDiagnostic = (initialLineNumber, initialCharacter, finalLineNumber, finalCharacter, diagnosticMessage, severity) => {
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
    const currentUri = vscode.window.activeTextEditor.document.uri;
    if (!mapForDiag.has(currentUri)) {
        mapForDiag.set(currentUri, []);
    }
    if (!mapForDiag.get(currentUri)?.filter((diag) => {
        return diag.range.isEqual(diagnostic.range);
    }).length) {
        mapForDiag.get(currentUri).push(diagnostic);
    }
    diagnosticCollection.set(currentUri, mapForDiag.get(currentUri));
};
exports.addDiagnostic = addDiagnostic;


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ParseSection = void 0;
class ParseSection {
    constructor(fTokens, sSymbols, pSymbols, ttc, fSymbols) {
        this.findTokens = fTokens;
        this.separationSymbols = sSymbols;
        this.tokenTypeCondition = ttc;
        this.previousSymbols = pSymbols;
        this.followingSymbols = fSymbols ? fSymbols : "";
    }
    getPosition(line, subString, index) {
        return line
            .split(new RegExp(this.previousSymbols + subString + this.followingSymbols), index)
            .join(subString).length;
    }
    getTokens(line, lineNumber, offset, aggregatedTokens, separateTokens) {
        let x;
        // regular expression to check if there are conditions in the axiom
        // checking if there is only one or more variables surrounded by parentheses
        // TODO: check for variables where there are no parentheses but operators exist like "aux = 3"
        const aux = this.findTokens;
        if ((x = aux.exec(line))) {
            if (x) {
                //list of operators
                let rx = this.separationSymbols;
                // separate the matched line into de different components (operators and variables)
                let separatedLine = x[0].trim().split(rx);
                // to return the tokens found in the line
                let tokens = [];
                // map that holds as key the string correspondent to an attribute and as value the last index in which is was seen
                // so that we can later tell the token where the attribute, even if is has multiple occurences
                let mapTokens = new Map();
                // loop through each element
                separatedLine.forEach((el) => {
                    // check if it not an operator or just spaces
                    if (!rx.test(el.trim()) && el.trim() !== "") {
                        const trimmedEl = el.trim();
                        const tokenForMap = trimmedEl[trimmedEl.length - 1] === "'"
                            ? trimmedEl.slice(0, trimmedEl.length - 1)
                            : trimmedEl;
                        // if the element is not already in the map, then we put it
                        if (!mapTokens.has(tokenForMap)) {
                            mapTokens.set(tokenForMap, 1);
                        }
                        // find the next index to be considered while parsing the elements from the line
                        let nextIndexLine = this.getPosition(line, tokenForMap, mapTokens.get(tokenForMap));
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
                            const sepTokens = separateTokens(trimmedEl);
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
/* 7 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseVariables = void 0;
const globalParserInfo_1 = __webpack_require__(2);
const _checkForVisTag = (line, i) => {
    let x;
    const rx = /^\s*\[\s*vis\s*\]/;
    x = rx.exec(line);
    if (x) {
        return {
            r: {
                line: i,
                startCharacter: x[0].indexOf("vis"),
                length: 3,
                tokenType: "keyword",
                tokenModifiers: [],
            },
            nextOffset: x[0].length,
        };
    }
    else {
        return undefined;
    }
};
const _parseVariables = (line, currentOffset, i) => {
    // Check if the line contains the vis tag for that variable
    const parserBracketResult = _checkForVisTag(line.slice(currentOffset), i);
    if (parserBracketResult !== undefined) {
        return {
            foundToken: parserBracketResult.r,
            nextOffset: parserBracketResult.nextOffset,
        };
    }
    else {
        // checks if we are inside the attributes or actions sub section of the interactor
        if (globalParserInfo_1.sections.get("attributes") || globalParserInfo_1.sections.get("actions")) {
            //check if there are any variables to be parsed in that line, if so
            // they are added to the attributes or actions map.
            const pv = _parseVariable(line.slice(currentOffset), globalParserInfo_1.sections.get("attributes") ? "attributes" : "actions");
            // if found something
            if (pv !== undefined) {
                if (globalParserInfo_1.sections.get("attributes")) {
                    globalParserInfo_1.attributes.set(pv.variableName, {
                        used: false,
                        type: pv.attributeType,
                    });
                }
                else {
                    globalParserInfo_1.actions.set(pv.variableName, false);
                }
                return {
                    foundToken: {
                        line: i,
                        startCharacter: currentOffset,
                        length: pv.size,
                        tokenType: pv.tokenType,
                        tokenModifiers: pv.tokenModifiers,
                    },
                    nextOffset: currentOffset + pv.size + 1,
                };
            }
            else {
                return undefined;
            }
        }
        else {
            return undefined;
        }
    }
};
exports._parseVariables = _parseVariables;
// function responsible for parsing each individual variable written in attributes or actions
const _parseVariable = (text, type) => {
    let x;
    // regex to match attributes, which means they have to have either : or , in front of them
    const forAttributes = /^\s*[a-zA-Z]+[a-zA-Z\_0-9]*\s*(?=(:|,))/;
    // get the type of the attributes
    const getAttributesType = /(?<=:)\s*[a-zA-Z]+[a-zA-Z\_0-9]*(?=\s*($|#))/;
    // get the actions, these must be separated into different lines
    const forActions = /^\s*[a-zA-Z]+[a-zA-Z\_0-9]*\s*(?=(#|$))/;
    if ((x = (type === "attributes" ? forAttributes : forActions).exec(text))) {
        if (x) {
            let attributeType;
            attributeType =
                type === "attributes" ? getAttributesType.exec(text) : null;
            return {
                size: x[0].length,
                tokenType: type === "attributes" ? "variable" : "method",
                tokenModifiers: [""],
                variableName: x[0].trim(),
                attributeType: attributeType !== null && attributeType !== undefined
                    ? attributeType[0].trim()
                    : undefined,
            };
        }
    }
    return undefined;
};


/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseDefines = void 0;
const diagnostics_1 = __webpack_require__(5);
const globalParserInfo_1 = __webpack_require__(2);
const ParseSection_1 = __webpack_require__(6);
const parseDefinesBeforeValue = (line, lineNumber) => {
    const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=/;
    const toSeparateTokens = /\=/;
    const previousTokens = "";
    const parseDefines = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, previousTokens, (el, sc) => {
        if (globalParserInfo_1.defines.has(el)) {
            (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is already declared", "warning");
            return "function";
        }
        else {
            globalParserInfo_1.defines.set(el, { used: false, type: undefined });
            return "keyword";
        }
    });
    return parseDefines.getTokens(line, lineNumber, 0);
};
const _parseDefines = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [
        parseDefinesBeforeValue,
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
exports._parseDefines = _parseDefines;


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._parseTypes = void 0;
const diagnostics_1 = __webpack_require__(5);
const globalParserInfo_1 = __webpack_require__(2);
const ParseSection_1 = __webpack_require__(6);
const parseEnumTypes = (line, lineNumber) => {
    const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*\{.*\}/;
    const toSeparateTokens = /(\=|\,|\{|\})/;
    const previousTokens = "";
    let elementIndex = 0;
    let typeName = "";
    const parseDefines = new ParseSection_1.ParseSection(toFindTokens, toSeparateTokens, previousTokens, (el, sc) => {
        if (elementIndex === 0) {
            elementIndex++;
            if (globalParserInfo_1.enums.has(el)) {
                (0, diagnostics_1.addDiagnostic)(lineNumber, sc, lineNumber, sc + el.length, el + " is already declared", "warning");
                return "function";
            }
            else {
                typeName = el;
                globalParserInfo_1.enums.set(el, { used: false, type: "enum", values: [] });
                return "enum";
            }
        }
        else {
            elementIndex++;
            globalParserInfo_1.enums.get(typeName)?.values.push(el);
            return "macro";
        }
    });
    return parseDefines.getTokens(line, lineNumber, 0);
};
const _parseTypes = (line, lineNumber) => {
    let currentOffset = 0;
    let toRetTokens = [];
    let size = 0;
    const sectionsToParseParsers = [
        parseEnumTypes,
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
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = void 0;
const vscode = __webpack_require__(1);
const globalParserInfo_1 = __webpack_require__(2);
const textParser_1 = __webpack_require__(3);
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
function activate(context) {
    vscode.window.onDidChangeActiveTextEditor(() => {
        (0, globalParserInfo_1.clearStoredValues)();
    });
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

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=extension.js.map