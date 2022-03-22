import {
  addDiagnosticToRelation,
  NOT_YET_IMPLEMENTED,
  CHANGE_TYPE,
  addDiagnostic,
} from "../../diagnostics/diagnostics";
import { getArrayInStore, getArrayWrittenInfo, parseArray } from "../arrayRelations";
import { attributes, currentInteractor, defines, ranges } from "../globalParserInfo";
import { parseAggregatesValue } from "../includesParser";
import {
  processErrors,
  isUsedAsAnArrayButIsNot,
  isValueInvalid,
  isAttributeNotDefined,
  isAttributeSameTypeAsValue,
} from "./relationErrors";
import { isAttributeSameAsValue, findValueType, findTemporaryType } from "./typeFindes";

const attributeExists = (attribute: string): boolean => {
  return (
    (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(attribute)) ||
    (attribute.charAt(attribute.length - 1) === "'" &&
      attributes.get(currentInteractor)!.has(attribute.substring(0, attribute.length - 1)))
  );
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
  textInfo: { line: string; el: string; lineNumber: number },
  offset: number
): { offset: number; value: string; tokenType: string }[] | undefined => {
  let indexOfOp = 0;
  const afterAndBefore = textInfo.el.split("=");
  if ((indexOfOp = afterAndBefore[1].search(/\.\./)) > 0) {
    const min = afterAndBefore[1].slice(0, indexOfOp);
    const max = afterAndBefore[1].slice(indexOfOp + 2);

    const minimum = parseRangeInput(min.trim());
    const maximum = parseRangeInput(max.trim());
    if (minimum.value >= maximum.value) {
      return addDiagnosticToRelation(
        "att",
        { ...textInfo, el: afterAndBefore[1] },
        min.trim(),
        max.trim(),
        minimum.value + " is equal or greater than " + maximum.value,
        "warning",
        0,
        indexOfOp + 2,
        offset,
        NOT_YET_IMPLEMENTED + ":" + textInfo.lineNumber
      );
    }
    ranges.set(afterAndBefore[0].trim(), {
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

export const processExpressions = (
  textInfo: { line: string; lineNumber: number; el: string },
  att: string,
  val: string,
  implies: boolean,
  isNextState?: boolean
) => {
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
  if ((isAttributeSameAsValue( att, splittedValue[0].value.trim()) && splittedValue.length > 1) || implies) {
    toks.push({
      offset: 0,
      value: att,
      tokenType: "variable",
      nextState: isNextState,
    });
    for (i = 0; i < splittedValue.length; i++) {
      const trimmedV = splittedValue[i].value.trim();
      if (splittedValue[i].value.includes("=")) {
        const fromCompare = compareRelationTokens({ ...textInfo, el: splittedValue[i].value }, splittedValue[i].offset);
        if (fromCompare !== undefined) {
          for (let x of fromCompare) {
            toks.push({
              offset: splittedValue[i].offset + x.offset,
              value: x.value,
              tokenType: x.tokenType,
            });
          }
        }
      } else {
        if (i === 0) {
          currentType = findValueType(trimmedV)!;
        } else {
          const newType = findValueType(trimmedV);
          if (currentType !== newType) {
            break;
          }
        }
        toks.push({
          offset: splittedValue[i].offset,
          value: splittedValue[i].value,
          tokenType: !isNaN(+trimmedV) ? splittedValue[i].value : findTemporaryType(trimmedV) ? "keyword" : "macro",
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

export const removeExclamation = (att: string) => {
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

const updateAttributeUsage = (att: string) => {
  if (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(att.trim())) {
    const attAux = attributes.get(currentInteractor)!.get(att)!;
    attributes.get(currentInteractor)!.set(att, { ...attAux, used: true });
  }
};

export const compareRelationTokens = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number
): { offset: number; value: string; tokenType: string; nextState?: boolean }[] | undefined => {
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
      let { value: att, isNextState } = removeExclamation(preAtt.value.trim());

      // set the used flag to true of the attribute being used
      updateAttributeUsage(att);

      //get the value
      const preVal = separated[1];
      let { value: val } = removeExclamation(preVal.value.trim());

      let expressionsParsed;
      //process multiple expressions when connected i.e. var1' = var2 + 4 * var3[2]
      expressionsParsed = processExpressions(textInfo, att, val, textInfo.el.includes("->"), isNextState);

      if (expressionsParsed !== undefined) {
        return expressionsParsed;
      }
      /*
    IsUsedAsAnArrayButIsNot - Checks if either the value or the attribute are being used as an array when they are not declared as such
    isValueInvalid - Checks if the type of the value can not be found
     */
      let errors;
      if (
        (errors = processErrors(textInfo, offset, preAtt, preVal, [
          isUsedAsAnArrayButIsNot,
          isValueInvalid,
          isAttributeNotDefined,
          isAttributeSameTypeAsValue,
        ]))
      ) {
        return errors;
      }

      let agValues;
      if ((agValues = parseAggregatesValue(textInfo, offset, preAtt))) {
        return agValues.tokens.map((x) => {
          return { ...x, offset: preAtt.offset + x.offset };
        });
      }

      let attTokens = [];
      if (/(\[|\])/.test(att)) {
        attTokens = parseArray(textInfo.line, textInfo.lineNumber, att)!;
      } else {
        attTokens = [{ offset: preAtt.offset, value: preAtt.value, tokenType: "variable", nextState: isNextState }];
      }
      return [
        ...attTokens,
        {
          offset: preVal.offset,
          value: preVal.value,
          tokenType: !isNaN(+val) ? "number" : findTemporaryType(val) ? "keyword" : "macro",
        },
      ];
    }
  } else {
    // without exclamation
    const clearedOfSymbols = removeExclamation(textInfo.el.trim());

    if (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(clearedOfSymbols.value)) {
      if (
        clearedOfSymbols.value !== textInfo.el.trim() &&
        attributes.get(currentInteractor)!.get(clearedOfSymbols.value)?.type !== "boolean"
      ) {
        addDiagnostic(
          textInfo.lineNumber,
          offset,
          textInfo.lineNumber,
          offset + textInfo.el.length,
          clearedOfSymbols.value + " is not a boolean",
          "error",
          CHANGE_TYPE +
            ":" +
            "boolean" +
            ":" +
            attributes.get(currentInteractor)!.get(clearedOfSymbols.value.trim())!.line +
            ":" +
            clearedOfSymbols.value
        );
      } else {
        return [
          {
            offset: 0,
            value: textInfo.el,
            tokenType: "variable",
            nextState:
              new RegExp("keep\\s*\\(.*\\b" + clearedOfSymbols.value + "\\b.*\\)").test(textInfo.line) ||
              clearedOfSymbols.isNextState,
          },
        ];
      }
    } else {
      if (defines.has(textInfo.el.trim())) {
        return [
          {
            offset: 0,
            value: textInfo.el,
            tokenType: "function",
            nextState: false,
          },
        ];
      } else if ((tp = getArrayInStore(getArrayWrittenInfo(textInfo.el.trim()).arrayName).type!.trim()) !== "") {
        if (tp === "boolean") {
          return parseArray(textInfo.line, textInfo.lineNumber, textInfo.el.trim());
        } else {
          addDiagnostic(
            textInfo.lineNumber,
            0,
            textInfo.lineNumber,
            textInfo.el.trim().length,
            textInfo.el.trim() + " must be a boolean in order to be alone in the condition",
            "error",
            NOT_YET_IMPLEMENTED + ":" + textInfo.el.trim()
          );
          //TODO deal with arrays when they are in the keep tag
          return [{ offset: 0, value: textInfo.el, tokenType: "regexp", nextState: false }];
        }
      }
    }
  }
  return undefined;
};
