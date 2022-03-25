"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAttributeSameAsValue = exports.findValueType = exports.findTemporaryType = exports.findAggregatedValueType = void 0;
const arrayRelations_1 = require("../arrayRelations");
const axiomParser_1 = require("../axiomParser");
const globalParserInfo_1 = require("../globalParserInfo");
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
//# sourceMappingURL=typeFindes.js.map