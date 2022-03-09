import { addDiagnosticToRelation, NOT_YET_IMPLEMENTED, CHANGE_TYPE, DEFINE_ATTRIBUTE } from "../diagnostics/diagnostics";
import { attributes, defines, enums, ranges } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

const attributeExists = (attribute: string): boolean => {
  return (
    attributes.has(attribute) ||
    (attribute.charAt(attribute.length - 1) === "'" && attributes.has(attribute.substring(0, attribute.length - 1)))
  );
};

const findValueType = (value: string): string | undefined => {
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
  return undefined;
};

const isAttributeSameAsValue = (attribute: string, value: string): boolean => {
  if (
    attributes.get(attribute)!.type === findValueType(value) ||
    (ranges.has(attributes.get(attribute)!.type!) && findValueType(value) === "number")
  ) {
    return true;
  } else {
    return false;
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

const processExpressions = (el: string, att: string, val: string, implies: boolean) => {
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

export const compareRelationTokens = (
  el: string,
  line: string,
  lineNumber: number,
  offset: number
): { offset: number; value: string; tokenType: string,nextState?: boolean }[] | undefined => {
  let indexOfOp;

  // Check if there is any symbol that might indicate a relation
  if ((indexOfOp = el.match(/(\<\s*\=|\>\s*\=|\=|\>|\<|\<?\s*\-\s*\>)/)) !== null) {
    //separate the attribute and the value
    const preAtt = el.slice(0, el.indexOf(indexOfOp[0])).trim();
    // take out the ' that simbolizes the next state
    let att = preAtt.charAt(preAtt.length - 1) === "'" ? preAtt.substring(0, preAtt.length - 1) : preAtt;

    if (attributes.has(att.trim())) {
      const attAux = attributes.get(att)!;
      attributes.set(att, { used: true, alone: attAux.alone, line: attAux.line, type: attAux.type });
    }
    //get the value
    let val = el.slice(el.indexOf(indexOfOp[0]) + indexOfOp[0].length).trim();

    const withoutExclamation = att.slice(att.indexOf("!") + 1).trim();
    if (
      att[0] === "!" &&
      attributes.has(withoutExclamation) &&
      attributes.get(withoutExclamation)?.type === "boolean"
    ) {
      att = withoutExclamation;
    }

    if (/\<?\s*\-\s*\>/.test(indexOfOp[0])) {
      //process multiple expressions when connected
      const expressionsParsedx = processExpressions(el, att, val, true);

      if (expressionsParsedx !== undefined) {
        return expressionsParsedx;
      }
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
    if (!attributeExists(att)) {
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
        DEFINE_ATTRIBUTE +":"+findValueType(val)+":"+att
      );
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



    // the attribute and the value are not of the same type
    if (val.trim() !== "" && att.trim() !== "" && !isAttributeSameAsValue(att, val)) {
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
        CHANGE_TYPE + ":" + findValueType(val) + ":" + attributes.get(att.trim())!.line + ":" + att
      );
    }
    return [
      { offset: ParseSection.getPosition(el, att, 1), value: att, tokenType: "variable", nextState:preAtt!==att },
      { offset: ParseSection.getPosition(el, val, 1), value: val, tokenType: "macro" },
    ];
  } else {
    if (attributes.has(el.trim()) && attributes.get(el.trim())?.type === "boolean") {
      return [{ offset: 0, value: el, tokenType: "variable" }];
    }
  }
  return undefined;
};
