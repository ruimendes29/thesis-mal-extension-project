import {
  addDiagnostic,
  CHANGE_TYPE,
  CREATE_CHANGE_NUMBER,
  DEFINE_ATTRIBUTE,
  NOT_YET_IMPLEMENTED,
} from "../../diagnostics/diagnostics";
import { getArrayWrittenInfo } from "../arrayRelations";
import { aggregates, attributes, currentInteractor, ranges } from "../globalParserInfo";
import { removeExclamation } from "./relationParser";

export const emitNotAggregatedDiagnostic = (lineNumber: number, offset: number, element: string) => {
  addDiagnostic(
    lineNumber,
    offset,
    element,
    element.trim() + " is not an aggregated value",
    "error",
    NOT_YET_IMPLEMENTED + ":" + element.trim()
  );
};

export const emitNotArrayDiagnostic = (lineNumber: number, offset: number, element: string) => {
  addDiagnostic(
    lineNumber,
    offset,
    element,
    element.trim() + " is not an array",
    "error",
    NOT_YET_IMPLEMENTED + ":" + element.trim()
  );
};

export const emitNotANumberDiagnostic = (lineNumber: number, offset: number, element: string) => {
  addDiagnostic(
    lineNumber,
    offset,
    element,
    element.trim() + " is not a numeric value",
    "error",
    NOT_YET_IMPLEMENTED + ":" + element.trim()
  );
};

const emitDoesNotExistDiagnostic = (
  lineNumber: number,
  offset: number,
  element: string,
  valueTypeForAtt?: string,
  valValue?: string
) => {
  let valueType = valueTypeForAtt;
  if (valueType === "number") {
    if (ranges.size > 0) {
      valueType = Array.from(ranges)[0][0];
    } else {
      valueType = "Number";
    }
  }
  const fixString = valueTypeForAtt
    ? valValue
      ? DEFINE_ATTRIBUTE + ":" + valueType + ":" + removeExclamation(element.trim()).value + ":" + valValue
      : DEFINE_ATTRIBUTE + ":" + valueType + ":" + removeExclamation(element.trim()).value
    : NOT_YET_IMPLEMENTED + ":" + element.trim();
  addDiagnostic(lineNumber, offset, element, element.trim() + " is not defined", "error", fixString);
};

const emitNotSameTypeDiagnostic = (
  lineNumber: number,
  offset: number,
  att: string,
  valType: string,
  valValue: string
) => {
  let attName: string;
  if (att.includes("]")) {
    attName = getArrayWrittenInfo(att.trim()).arrayName;
  } else {
    attName = removeExclamation(att.trim()).value;
  }
  const { value: attValue, line: lineN } = getLineWhereAttIsDefined(attName)!;
  if (valType === "number") {
    if (ranges.size > 0) {
      addDiagnostic(
        lineNumber,
        offset,
        att,
        attValue + " is not a numeric value.",
        "error",
        CHANGE_TYPE + ":" + Array.from(ranges)[0][0] + ":" + lineN + ":" + attValue
      );
    } else {
      addDiagnostic(
        lineNumber,
        offset,
        att,
        attValue + " is not a numeric value and there are no number types defined.",
        "error",
        CREATE_CHANGE_NUMBER +
          ":" +
          lineN +
          ":" +
          attValue +
          ":" +
          Math.max(0, eval(valValue) - 10) +
          ":" +
          (eval(valValue) + 10)
      );
    }
  } else {
    addDiagnostic(
      lineNumber,
      offset,
      att,
      attValue + " is not of type " + valType,
      "error",
      CHANGE_TYPE + ":" + valType + ":" + lineN + ":" + attValue
    );
  }
};

export const parseErrorsRelationBetween = (
  lineNumber: number,
  att: { value: string; offset: number },
  val: { value: string; offset: number },
  attType: string | undefined,
  valType: string | undefined,
  offset: number
) => {
  if ((attType === "" || attType === undefined) && valType !== undefined && valType !== "") {
    emitDoesNotExistDiagnostic(lineNumber, offset + att.offset, att.value, valType, val.value);
  } else if (attType === "" || valType === "" || attType === undefined || valType === undefined) {
    emitDoesNotExistDiagnostic(lineNumber, offset + val.offset, val.value);
  } else if (
    attType !== valType &&
    !((ranges.has(attType) || attType === "number") && (valType === "number" || ranges.has(valType)))
  ) {
    emitNotSameTypeDiagnostic(lineNumber, offset + att.offset, att.value, valType, val.value);
  }
};

export const parseSingleError = (
  lineNumber: number,
  att: { value: string; offset: number },
  attType: string | undefined,
  offset: number
) => {
  if ((attType === "" || attType === undefined) && att.value!==",") {
    const correctAttValue =  removeExclamation(att.value.trim()).value;
    addDiagnostic(
      lineNumber,
      offset,
      correctAttValue,
      correctAttValue + " is not defined!",
      "error",
      DEFINE_ATTRIBUTE + ":boolean:" + removeExclamation(att.value.trim()).value + ":" + correctAttValue
    );
  }
};

const getLineWhereAttIsDefined = (att: string) => {
  if (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(att)) {
    return { value: att, line: attributes.get(currentInteractor)!.get(att)!.line };
  } else if (att.includes(".")) {
    const sPoints = att.split(".");
    let current = currentInteractor;
    for (let i = 0; i < sPoints.length; i++) {
      const tsp = sPoints[i].trim();
      if (aggregates.has(tsp) && aggregates.get(tsp)!.current === current) {
        current = aggregates.get(tsp)!.included;
      } else if (attributes.has(current) && attributes.get(current)!.has(tsp)) {
        return { value: tsp, line: attributes.get(current)!.get(tsp)!.line };
      }
    }
  } else {
    return undefined;
  }
};
