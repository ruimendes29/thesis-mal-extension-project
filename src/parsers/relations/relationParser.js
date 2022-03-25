"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareRelationTokens = exports.removeExclamation = exports.processExpressions = exports.separateRangeTokens = void 0;
const diagnostics_1 = require("../../diagnostics/diagnostics");
const arrayRelations_1 = require("../arrayRelations");
const globalParserInfo_1 = require("../globalParserInfo");
const includesParser_1 = require("../includesParser");
const relationErrors_1 = require("./relationErrors");
const typeFindes_1 = require("./typeFindes");
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
//# sourceMappingURL=relationParser.js.map