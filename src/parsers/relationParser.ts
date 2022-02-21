import { addDiagnosticToRelation } from "../diagnostics/diagnostics";
import { attributes, defines, enums, ranges } from "./globalParserInfo";

const attributeExists = (attribute: string): boolean => {
  return attributes.has(attribute) || attribute.charAt(attribute.length - 1) === "'" && attributes.has(attribute.substring(0, attribute.length - 1));
};

const findValueType = (value: string): string | undefined => {
  console.log(value[value.length - 1]);
  if (value === "true" || value === "false") {
    return "boolean";
  } else if (!isNaN(+value) && value !== "") {
    // check if value is a number
    return "number";
  } else if (defines.has(value)) {
    return defines.get(value)!.type;
  } else if (attributes.has(value)||value[value.length-1]==="'" && attributes.has(value.slice(0,value.length-1))) {
    return attributes.get(value)!.type;
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
  console.log(ranges);
  console.log(attribute+" "+attributes.get(attribute)!.type+" "+ranges.has(attributes.get(attribute)!.type!));
  if (
    attributes.get(attribute)!.type === findValueType(value) ||
    (ranges.has(attributes.get(attribute)!.type!) &&
      findValueType(value) === "number")
  ) {
    return true;
  } else {
    return false;
  }
};

const parseRangeInput = (preV: string):{value:number,isANumber:boolean} => {
  let v;
  let isANumber = true;
  v = 0;
  const trimmedv = preV.trim();
  if (!isNaN(+trimmedv)) {
    v = trimmedv;
  } else if (
    defines.has(trimmedv) &&
    defines.get(trimmedv)!.type === "number"
  ) {
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
  console.log(el);
  let indexOfOp = 0;
  const afterAndBefore = el.split("=");
  if ((indexOfOp = afterAndBefore[1].search(/\.\./)) > 0) {
    const min = afterAndBefore[1].slice(0, indexOfOp).trim();
    const max = afterAndBefore[1].slice(indexOfOp + 2).trim();

    const minimum = parseRangeInput(min);
    const maximum = parseRangeInput(max);

    console.log(minimum.value + " " + maximum.value);

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
        offset
      );
    }
    ranges.set(afterAndBefore[0].trim(),{used:false,minimum:minimum.value,maximum:maximum.value});
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

export const compareRelationTokens = (
  el: string,
  line: string,
  lineNumber: number,
  offset: number
): { offset: number; value: string; tokenType: string }[] | undefined => {
  let indexOfOp = 0;
  if ((indexOfOp = el.search(/(\<\s*\=|\>\s*\=|\=|\>|\<(?!\s*-))/)) > 0) {
    const preAtt = el.slice(0, indexOfOp).trim();
    const att = preAtt.charAt(preAtt.length-1)==="'" ? preAtt.substring(0,preAtt.length-1) : preAtt;
    const val = el.slice(indexOfOp + 1).trim();
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
        offset
      );
    }
    if (findValueType(val) === undefined) {
      return addDiagnosticToRelation(
        "val",
        line,
        lineNumber,
        el,
        att,
        val,
        val + " is not a valid value",
        "error",
        offset
      );
    }
    if (!isAttributeSameAsValue(att, val)) {
      return addDiagnosticToRelation(
        "att",
        line,
        lineNumber,
        el,
        att,
        val,
          att +
          " is not of type " +
          findValueType(val),
        "warning",
        offset
      );
    }
    return [
      { offset: el.indexOf(att), value: att, tokenType: "variable" },
      { offset: el.indexOf(val), value: val, tokenType: "macro" },
    ];
  }
  else {
    if (attributes.has(el.trim()) && attributes.get(el.trim())?.type==="boolean")
    {
      return [{offset: 0, value: el, tokenType: "variable" }];
    }
  }
  return undefined;
};
