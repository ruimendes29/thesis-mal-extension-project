import { addDiagnostic, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { findTemporaryType, temporaryAttributes } from "./axiomParser";
import { attributes, arrays, ranges, actions } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { findValueType, processExpressions } from "./relationParser";

/* From a given attribute declared as an array, get it's name and the number of arguments
present when the array is being used in an axiom */
export const getArrayWrittenInfo = (arrayUsage: string) => {
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

export const isDeclaredButIsNotAnArray = (arrayName: string) => {
  return getArrayInStore(getArrayWrittenInfo(arrayName).arrayName).type === "";
};

/* From an attribute declared as an array, get the information present about
that type of array from the data structures present in the extension, in this case
the dimensions and the type */
export const getArrayInStore = (arrayName: string) => {
  let numberOfDimensions = 1;
  let type = "";
  if (attributes.has(arrayName) && arrays.has(attributes.get(arrayName)!.type!)) {
    let arrayType = arrays.get(attributes.get(arrayName)!.type!)!.type;
    while (arrays.has(arrayType)) {
      arrayType = arrays.get(arrayType)!.type;
      numberOfDimensions++;
    }
    type = arrayType;
  }
  return { dimensions: numberOfDimensions, type: type };
};

const assignTokenType = (s: string) => {
  if (temporaryAttributes.map(el => el.value).includes(s)) {
    return "keyword";
  } else if (attributes.has(s)) {
    return "variable";
  } else if (!isNaN(+s)) {
    return "number";
  } else {
    return "nothing";
  }
};

const tokenAndDiag = (actionName: string, elemIndex: number, lineNumber: number, offset: number, s: string) => {

  if (
    (attributes.has(s) && elemIndex === 0) ||
    findTemporaryType(s)==="number" ||
    (attributes.has(s) && findValueType(s) === "number") ||
    !isNaN(+s)
  ) {
    return { offset: offset, value: s, tokenType: assignTokenType(s) };
  } else {
    addDiagnostic(
      lineNumber,
      offset,
      lineNumber,
      offset + s.length,
      s + " must be of type number",
      "error",
      NOT_YET_IMPLEMENTED + ":" + s
    );
    return { offset: offset, value: s, tokenType: "regexp" };
  }
};

export const parseArray = (
  line: string,
  lineNumber: number,
  element: string
): { offset: number; value: string; tokenType: string; nextState?: boolean }[] | undefined => {
  if (element.includes("[") && element.includes("]")) {
    const { arrayName, numberOfArguments } = getArrayWrittenInfo(element);
    const { dimensions, type } = getArrayInStore(arrayName);
    if (dimensions !== numberOfArguments) {
      const sc = ParseSection.getPosition(line, element, 1);
      addDiagnostic(
        lineNumber,
        sc,
        lineNumber,
        sc + element.length,
        arrayName + " does not have the right amount of arguments",
        "error",
        NOT_YET_IMPLEMENTED + ":" + arrayName
      );
      return [{ offset: sc, value: element, tokenType: "regexp" }];
    } else {
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
          if (attributes.has(v)) {
            const preAtt = attributes.get(v)!;
            attributes.set(v, { ...preAtt, used: true });
          }
          toRet.push(tokenAndDiag(separatedArray[0].value.trim(), i, lineNumber, o, v));
        } else {
          let offToks = o;
          toRet.push(
            ...v
              .split(opRex)
              .map((el) => {
                offToks += el.length;
                if (opRex.test(el.trim())) {
                  return { offset: 0, tokenType: "regexp", value: "" };
                } else {
                  return tokenAndDiag(separatedArray[0].value.trim(),i, lineNumber, offToks - el.length, el);
                }
              })
              .filter((el) => el.value.trim().length > 0)
          );
        }
      }
      return toRet;
    }
  }
  return undefined;
};
