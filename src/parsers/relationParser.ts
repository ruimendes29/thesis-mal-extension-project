import {
  addDiagnosticToRelation,
  NOT_YET_IMPLEMENTED,
  CHANGE_TYPE,
  DEFINE_ATTRIBUTE,
  addDiagnostic,
} from "../diagnostics/diagnostics";
import { getArrayInStore, getArrayWrittenInfo, isDeclaredButIsNotAnArray, parseArray } from "./arrayRelations";
import { findTemporaryType } from "./axiomParser";
import { arrays, attributes, defines, enums, ranges } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

const attributeExists = (attribute: string): boolean => {
  return (
    attributes.has(attribute) ||
    (attribute.charAt(attribute.length - 1) === "'" && attributes.has(attribute.substring(0, attribute.length - 1)))
  );
};

export const findValueType = (value: string): string | undefined => {
  const correctValue = value[value.length - 1] === "'" ? value.slice(0, value.length - 1) : value;
  if (value === "true" || value === "false") {
    return "boolean";
  } else if (!isNaN(+value) && value !== "") {
    // check if value is a number
    return "number";
  } else if (defines.has(value)) {
    return defines.get(value)!.type;
  } else if (attributes.has(value) && ranges.has(attributes.get(value)!.type!)) {
    return "number";
  } else if (attributes.has(correctValue)) {
    return attributes.get(correctValue)!.type;
  } else {
    for (var [k, v] of enums) {
      if (v.values.includes(value)) {
        return k;
      }
    }
  }
  return findTemporaryType(value.trim());
};

const isAttributeSameAsValue = (attribute: string, value: string): boolean => {
  if (attribute.includes("]") || attribute.includes("[")) {
    const { arrayName } = getArrayWrittenInfo(attribute);
    const { type } = getArrayInStore(arrayName);
    return type === findValueType(value);
  } else {
    return (
      attributes.has(attribute) &&
      (attributes.get(attribute)!.type === findValueType(value) ||
        (ranges.has(attributes.get(attribute)!.type!) && findValueType(value) === "number"))
    );
  }
};

const parseRangeInput = (preV: string): { value: number; isANumber: boolean } => {
  let v;
  let isANumber = true;
  v = 0;
  const trimmedv = preV.trim();
  if (!isNaN(+trimmedv)) {
    v = trimmedv;
  } else if (defines.has(trimmedv) && defines.get(trimmedv)!.type === "number") {
    v = defines.get(trimmedv)!.value;
    isANumber = false;
    defines.set(trimmedv, { used: true, type: "number", value: v });
  }
  return { value: +v, isANumber: isANumber };
};

export const separateRangeTokens = (
  el: string,
  line: string,
  lineNumber: number,
  offset: number
): { offset: number; value: string; tokenType: string }[] | undefined => {
  let indexOfOp = 0;
  const afterAndBefore = el.split("=");
  if ((indexOfOp = afterAndBefore[1].search(/\.\./)) > 0) {
    const min = afterAndBefore[1].slice(0, indexOfOp).trim();
    const max = afterAndBefore[1].slice(indexOfOp + 2).trim();

    const minimum = parseRangeInput(min);
    const maximum = parseRangeInput(max);
    if (minimum.value >= maximum.value) {
      return addDiagnosticToRelation(
        "att",
        line,
        lineNumber,
        afterAndBefore[1],
        min,
        max,
        minimum.value + " is equal or greater than " + maximum.value,
        "warning",
        offset,
        NOT_YET_IMPLEMENTED + ":" + lineNumber
      );
    }
    ranges.set(afterAndBefore[0].trim(), {
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

export const processExpressions = (
  line: string,
  lineNumber: number,
  el: string,
  att: string,
  val: string,
  implies: boolean,
  isNextState?: boolean
) => {
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
    toks.push({
      offset: el.indexOf(att),
      value: att,
      tokenType: "variable",
      nextState: isNextState,
    });
    for (i = 0; i < splittedValue.length; i++) {
      const trimmedV = splittedValue[i].trim();
      if (trimmedV.match(specialChars) !== null) {
        offsetForToks += splittedValue[i].length;
      } else {
        if (splittedValue[i].indexOf("=") > 0) {
          const fromCompare = compareRelationTokens(
            splittedValue[i],
            line,
            lineNumber,
            offsetForToks - splittedValue[i].length
          );
          if (fromCompare !== undefined) {
            for (let x of fromCompare) {
              toks.push({
                offset: offsetForToks + x.offset,
                value: x.value,
                tokenType: x.tokenType,
              });
            }
          }
        } else {
          if (i === 0) {
            currentType = findValueType(trimmedV)!;
            offsetForToks += splittedValue[i].length;
          } else {
            const newType = findValueType(trimmedV);
            offsetForToks += splittedValue[i].length;
            if (currentType !== newType) {
              break;
            }
          }
          toks.push({
            offset: offsetForToks - splittedValue[i].length,
            value: trimmedV,
            tokenType: !isNaN(+trimmedV) ? "number" : findTemporaryType(trimmedV)?"keyword":"macro",
          });
        }
      }
    }
    if (i === splittedValue.length) {
      return toks;
    }
    return undefined;
  }
  return undefined;
};

const removeExclamation = (att: string) => {
  let nextState = false;
  const we = att.trim().charAt(0) === "!" ? att.trim().slice(1) : att.trim();
  let ret;
  if (we.charAt(we.length - 1) === "'") {
    ret = we.slice(0, we.length - 1);
    nextState = true;
  } else {
    ret = we;
  }
  return { value: ret, isNextState: nextState };
};

const hasSquareBrackets = (s: string): boolean => {
  return s.includes("]") || s.includes("[");
};

export const compareRelationTokens = (
  el: string,
  line: string,
  lineNumber: number,
  offset: number
): { offset: number; value: string; tokenType: string; nextState?: boolean }[] | undefined => {
  let tp;
  let indexOfOp;
  if (el === "keep") {
    return [{ offset: 0, value: el, tokenType: "keyword" }];
  }
  // Check if there is any symbol that might indicate a relation
  if ((indexOfOp = el.match(/(\<\s*\=|\>\s*\=|\=|\>|\<|\<?\s*\-\s*\>)/)) !== null) {
    //separate the attribute and the value
    const preAtt = el.slice(0, el.indexOf(indexOfOp[0])).trim();
    // take out the ' that simbolizes the next state
    let { value: att, isNextState } = removeExclamation(preAtt);

    if (attributes.has(att.trim())) {
      const attAux = attributes.get(att)!;
      attributes.set(att, { used: true, alone: attAux.alone, line: attAux.line, type: attAux.type });
    }
    //get the value
    let val = el.slice(el.indexOf(indexOfOp[0]) + indexOfOp[0].length).trim();
    //examine when the exclamation point appears in front of the value
    if (val.charAt(0) === "!") {
      const tempVal = val.slice(1);
      if (findValueType(tempVal) === "boolean") {
        val = tempVal;
      }
    }
    att = removeExclamation(att).value;

    // if the type of the value can not be found
    let isAtt;
    if (
      (isAtt =
        (hasSquareBrackets(att) && isDeclaredButIsNotAnArray(att.trim())) ||
        (hasSquareBrackets(val) && isDeclaredButIsNotAnArray(val.trim())))
    ) {
      return addDiagnosticToRelation(
        isAtt ? "att" : "val",
        line,
        lineNumber,
        el,
        att,
        val,
        (isAtt ? att : val) + " is not an array",
        "error",
        0,
        NOT_YET_IMPLEMENTED + ":" + lineNumber
      );
    }

    if (/\<?\s*\-\s*\>/.test(indexOfOp[0])) {
      //process multiple expressions when connected
      const expressionsParsedx = processExpressions(
        line,
        lineNumber,
        el,
        removeExclamation(att).value,
        val,
        true,
        removeExclamation(att).isNextState
      );

      if (expressionsParsedx !== undefined) {
        return expressionsParsedx;
      }
    }
    //process multiple expressions when connected
    const expressionsParsed = processExpressions(line, lineNumber, el, att, val, false, isNextState);

    if (expressionsParsed !== undefined) {
      return expressionsParsed;
    }

    // if the type of the value can not be found
    if (val.trim() !== "" && findValueType(val) === undefined) {
      return addDiagnosticToRelation(
        "val",
        line,
        lineNumber,
        el,
        att,
        val,
        val + " is not a valid value",
        "error",
        0,
        NOT_YET_IMPLEMENTED + ":" + lineNumber
      );
    }

    //check if the attribute existe in the already processed attributes
    if (!attributeExists(att) && !attributes.has(getArrayWrittenInfo(att).arrayName)) {
      return addDiagnosticToRelation(
        "att",
        line,
        lineNumber,
        el,
        att,
        val,
        att + " is not defined",
        "error",
        0,
        DEFINE_ATTRIBUTE + ":" + findValueType(val) + ":" + att
      );
    }

    // if the value is a boolean and starts with the negation symbol, that we can take that char off
    if (val.trim()[0] === "!" && findValueType(val.slice(val.indexOf("!") + 1).trim()) === "boolean") {
      val = val.slice(val.indexOf("!") + 1).trim();
    }

    // the attribute and the value are not of the same type
    if (val.trim() !== "" && att.trim() !== "" && !isAttributeSameAsValue(att, val)) {
      let attForGet = att.trim();
      if (!attributes.has(att.trim())) {
        attForGet = getArrayWrittenInfo(att.trim())!.arrayName;
      }
      return addDiagnosticToRelation(
        "att",
        line,
        lineNumber,
        el,
        att,
        val,
        att + " is not of type " + findValueType(val),
        "warning",
        0,
        CHANGE_TYPE + ":" + findValueType(val) + ":" + attributes.get(attForGet)!.line + ":" + attForGet
      );
    }
    const attPos = ParseSection.getPosition(el, att, 1);

    let attTokens = [];
    if (/(\[|\])/.test(att)) {
      attTokens = parseArray(line, lineNumber, att)!;
    } else {
      attTokens = [{ offset: attPos, value: att, tokenType: "variable", nextState: isNextState }];
    }
    return [
      ...attTokens,
      {
        offset:
          attPos +
          att.length +
          ParseSection.getPosition(el.slice(attPos + att.length), val, val.trim() === att ? 2 : 1),
        value: val,
        tokenType: !isNaN(+val) ? "number" : findTemporaryType(val)?"keyword":"macro",
      },
    ];
  } else {
    // without exclamation
    const clearedOfSymbols = removeExclamation(el);

    if (attributes.has(clearedOfSymbols.value)) {
      if (clearedOfSymbols.value !== el.trim() && attributes.get(clearedOfSymbols.value)?.type !== "boolean") {
        addDiagnostic(
          lineNumber,
          ParseSection.getPosition(line, el, 1),
          lineNumber,
          ParseSection.getPosition(line, el, 1) + el.length,
          clearedOfSymbols.value + " is not a boolean",
          "error",
          CHANGE_TYPE +
            ":" +
            "boolean" +
            ":" +
            attributes.get(clearedOfSymbols.value.trim())!.line +
            ":" +
            clearedOfSymbols.value
        );
      } else {
        return [
          {
            offset: ParseSection.getPosition(el, clearedOfSymbols.value, 1),
            value: clearedOfSymbols.value,
            tokenType: "variable",
            nextState:
              new RegExp("keep\\s*\\(.*\\b" + clearedOfSymbols.value + "\\b.*\\)").test(line) ||
              clearedOfSymbols.isNextState,
          },
        ];
      }
    } else {
      if (defines.has(el.trim())) {
        return [
          {
            offset: 0,
            value: el.trim(),
            tokenType: "function",
            nextState: false,
          },
        ];
      } else if ((tp = getArrayInStore(getArrayWrittenInfo(el.trim()).arrayName).type!.trim()) !== "") {
        if (tp === "boolean") {return parseArray(line, lineNumber, el.trim());}
        else {
          const sc = ParseSection.getPosition(line, el.trim(), 1);
          addDiagnostic(
            lineNumber,
            sc,
            lineNumber,
            sc + el.trim().length,
            el.trim() + " must be a boolean in order to be alone in the condition",
            "error",
            NOT_YET_IMPLEMENTED + ":" + el.trim()
          );
          //TODO deal with arrays when they are in the keep tag
          return [{offset:0,value:el.trim(),tokenType:"regexp",nextState:false}];
        }
      }
    }
  }
  return undefined;
};
