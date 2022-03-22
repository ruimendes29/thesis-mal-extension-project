import {
  addDiagnosticToRelation,
  CHANGE_TYPE,
  DEFINE_ATTRIBUTE,
  NOT_YET_IMPLEMENTED,
} from "../../diagnostics/diagnostics";
import { getArrayWrittenInfo, isDeclaredButIsNotAnArray } from "../arrayRelations";
import { temporaryAttributes } from "../axiomParser";
import { aggregates, attributes, currentInteractor } from "../globalParserInfo";
import { parseAggregatesValue } from "../includesParser";
import { removeExclamation } from "./relationParser";
import { findValueType, isAttributeSameAsValue } from "./typeFindes";

const hasSquareBrackets = (s: string): boolean => {
  return s.includes("]") || s.includes("[");
};

const attributeExists = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number,
  att: { value: string; offset: number }
): boolean => {
  const attvt = removeExclamation(att.value.trim()).value;
  return (
    (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(attvt)) ||
    (attributes.has(currentInteractor) &&
      attributes.get(currentInteractor)!.has(getArrayWrittenInfo(attvt).arrayName)) ||
    temporaryAttributes.map((el) => el.value).includes(attvt) ||
    (parseAggregatesValue(textInfo, offset, att) !== undefined &&
      parseAggregatesValue(textInfo, offset, att)!.type !== undefined)
  );
};

export const processErrors = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number,
  att: { value: string; offset: number },
  val: { value: string; offset: number },
  exceptionsErrors: ((
    textInfo: {
      line: string;
      lineNumber: number;
      el: string;
    },
    offset: number,
    att: { value: string; offset: number },
    val: { value: string; offset: number }
  ) => { offset: number; value: string; tokenType: string }[] | undefined)[]
) => {
  for (let parseError of exceptionsErrors) {
    let errorFound;
    if ((errorFound = parseError(textInfo, offset, att, val))) {
      return errorFound;
    }
  }
  return undefined;
};

export const isValueInvalid = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number,
  att: { value: string; offset: number },
  val: { value: string; offset: number }
): { offset: number; value: string; tokenType: string }[] | undefined => {
    
  const valt = removeExclamation(val.value.trim()).value;
  if (valt !== "" && findValueType(valt) === undefined) {
    return addDiagnosticToRelation(
      "val",
      textInfo,
      att.value,
      val.value,
      valt + " is not a valid value",
      "error",
      att.offset,
      val.offset,
      offset,
      NOT_YET_IMPLEMENTED + ":" + textInfo.lineNumber
    );
  }
  return undefined;
};

export const isUsedAsAnArrayButIsNot = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number,
  att: { value: string; offset: number },
  val: { value: string; offset: number }
): { offset: number; value: string; tokenType: string }[] | undefined => {
  const attt = removeExclamation(att.value.trim()).value;
  const valt = removeExclamation(val.value.trim()).value;
  let isAtt;
  if (
    (isAtt =
      (hasSquareBrackets(attt) && isDeclaredButIsNotAnArray(attt)) ||
      (hasSquareBrackets(valt) && isDeclaredButIsNotAnArray(valt)))
  ) {
    return addDiagnosticToRelation(
      isAtt ? "att" : "val",
      textInfo,
      att.value,
      val.value,
      (isAtt ? attt : valt) + " is not an array",
      "error",
      att.offset,
      val.offset,
      offset,
      NOT_YET_IMPLEMENTED + ":" + textInfo.lineNumber
    );
  }
  return undefined;
};

export const isAttributeNotDefined = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number,
  att: { value: string; offset: number },
  val: { value: string; offset: number }
): { offset: number; value: string; tokenType: string }[] | undefined => {
    
  const attt = removeExclamation(att.value.trim()).value;
  const valt = removeExclamation(val.value.trim()).value;
  //check if the attribute exists in the already processed attributes
  if (!attributeExists(textInfo, offset, att)) {
    return addDiagnosticToRelation(
      "att",
      textInfo,
      att.value,
      val.value,
      attt + " is not defined",
      "error",
      att.offset,
      val.offset,
      offset,
      DEFINE_ATTRIBUTE + ":" + findValueType(valt) + ":" + attt
    );
  } else {
    return undefined;
  }
};

const getLineWhereAttIsDefined = (att: string) => {
  if (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(att)) {
    return {value:att,line:attributes.get(currentInteractor)!.get(att)!.line};
  } else if (att.includes(".")) {
    const sPoints = att.split(".");
    let current = currentInteractor;
    for (let i = 0; i < sPoints.length; i++) {
      const tsp = sPoints[i].trim();
      if (aggregates.has(tsp) && aggregates.get(tsp)!.current === current) {
        current = aggregates.get(tsp)!.included;
      } else if (attributes.has(current) && attributes.get(current)!.has(tsp)) {
        return {value:tsp,line: attributes.get(current)!.get(tsp)!.line};
      }
    }
  } else {
    return undefined;
  }
};

export const isAttributeSameTypeAsValue = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number,
  att: { value: string; offset: number },
  val: { value: string; offset: number }
): { offset: number; value: string; tokenType: string }[] | undefined => {
  const { value: valt } = removeExclamation(val.value.trim());
  const { value: attt } = removeExclamation(att.value.trim());
  if (valt !== "" && attt !== "" && !isAttributeSameAsValue(attt, valt)) {
    let attForGet = attt;
    if (attributes.has(currentInteractor) && !attributes.get(currentInteractor)!.has(attt)) {
      attForGet = getArrayWrittenInfo(attt)!.arrayName;
    }
    const {value:attValue,line:lineN} = getLineWhereAttIsDefined(attt)!;
    return addDiagnosticToRelation(
      "att",
      textInfo,
      att.value,
      val.value,
      attt + " is not of type " + findValueType(valt),
      "warning",
      att.offset,
      val.offset,
      offset,
      CHANGE_TYPE +
        ":" +
        findValueType(valt) +
        ":" +
        lineN+
        ":" +
        attValue
    );
  } else {
    return undefined;
  }
};
