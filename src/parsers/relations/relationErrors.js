"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAttributeSameTypeAsValue = exports.isAttributeNotDefined = exports.isUsedAsAnArrayButIsNot = exports.isValueInvalid = exports.processErrors = void 0;
const diagnostics_1 = require("../../diagnostics/diagnostics");
const arrayRelations_1 = require("../arrayRelations");
const axiomParser_1 = require("../axiomParser");
const globalParserInfo_1 = require("../globalParserInfo");
const includesParser_1 = require("../includesParser");
const relationParser_1 = require("./relationParser");
const typeFindes_1 = require("./typeFindes");
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
//# sourceMappingURL=relationErrors.js.map