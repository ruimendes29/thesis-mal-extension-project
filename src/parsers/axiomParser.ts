import { addDiagnostic } from "../diagnostics/diagnostics";
import { actions, attributes, enums, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

/* function responsible for adding diagnostics to the attributes when they are in the conditions
  if any given axiom */
const addDiagnosticToRelation = (
  type: string,
  line: string,
  lineNumber: number,
  fullCondition: string,
  attribute: string,
  value: string,
  message: string,
  severity: string
) => {
  let stringToCompare = "";
  if (type === "att") {
    stringToCompare = attribute;
  } else if (type === "val") {
    stringToCompare = value;
  }
  addDiagnostic(
    lineNumber,
    line.indexOf(fullCondition) + fullCondition.indexOf(stringToCompare),
    lineNumber,
    line.indexOf(fullCondition) +
      fullCondition.indexOf(stringToCompare) +
      stringToCompare.length,
    message,
    severity
  );
  return [
    {
      offset: fullCondition.indexOf(attribute),
      value: attribute,
      tokenType: stringToCompare === attribute ? "regexp" : "variable",
    },
    {
      offset: fullCondition.indexOf(value),
      value: value,
      tokenType: stringToCompare === value ? "regexp" : "macro",
    },
  ];
};

const parseConditions = (line: string, lineNumber: number) => {
  const toFindTokens = /^.*(?=\s*\<?\-\>)/;
  const toSeparateTokens = /(\&|\||\)|\()/;
  const previousTokens = "";
  let indexOfOp = 0;

  const attributeExists = (attribute: string): boolean => {
    return attributes.has(attribute);
  };

  const findValueType = (value: string): string | undefined => {
    if (value === "true" || value === "false") {
      return "boolean";
    } else if (!isNaN(+value)) {
      // check if value is a number
      return "number";
    } else if (attributes.has(value)) {
      return "attribute";
    } else {
      for (var [k, v] of enums) {
        if (v.values.includes(value)) {
          return k;
        }
      }
    }
    return undefined;
  };

  const isAttributeSameAsValue = (
    attribute: string,
    value: string
  ): boolean => {
    if (attributes.get(attribute)!.type === findValueType(value)) {
      return true;
    } else {
      return false;
    }
  };

  const separateTokens = (
    el: string
  ): { offset: number; value: string; tokenType: string }[]|undefined => {
    if ((indexOfOp = el.search(/(\<\s*\=|\>\s*\=|\=|\>|\<)/)) > 0) {
      const att = el.slice(0, indexOfOp).trim();
      const val = el.slice(indexOfOp + 1).trim();
      console.log(att + " x " + val);
      if (!attributeExists(att)) {
        return addDiagnosticToRelation(
          "att",
          line,
          lineNumber,
          el,
          att,
          val,
          att + " is not defined",
          "error"
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
          "error"
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
          att + " is not of type " + findValueType(val),
          "warning"
        );
      }
      return [
        { offset: el.indexOf(att), value: att, tokenType: "variable" },
        { offset: el.indexOf(val), value: val, tokenType: "macro" },
      ];
    }
    return undefined;
  };
  const parseConditionsSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      return "cantprint";
    }
  );
  return parseConditionsSection.getTokens(
    line,
    lineNumber,
    0,
    true,
    separateTokens
  );
};

const parseTriggerAction = (line: string, lineNumber: number) => {
  const toFindTokens = /(\s*\-\>\s*)?\[[^\[]+\]/;
  const toSeparateTokens = /(\(|\)|\-|\>|\<|\&|\||\!|\[|\])/;
  const previousTokens = "";
  const parseTriggerActions: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      if (actions.has(el)) {
        return "function";
      } else {
        addDiagnostic(
          lineNumber,
          sc,
          lineNumber,
          sc + el.length,
          el + " is not declared as an action",
          "error"
        );
        return "variable";
      }
    }
  );
  return parseTriggerActions.getTokens(line, lineNumber, 0);
};

const parsePer = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=^\s*per\s*\().+(?=\))/;
  const toSeparateTokens = /(\(|\)|\||\&|\!)/;
  const previousTokens = "";
  const parsePers: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      if (actions.has(el)) {
        return "function";
      } else {
        addDiagnostic(
          lineNumber,
          sc,
          lineNumber,
          sc + el.length,
          el + " is not declared as an action",
          "error"
        );
        return "variable";
      }
    }
  );
  return parsePers.getTokens(line, lineNumber, 0);
};

const parseNextState = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=(\]|^per\s*\(.*\)\s*\<?\-\>)).*/;
  const toSeparateTokens = /(\(|\)|\&|\||\!|\[|\]|\,|\=|\#|\-|\<|\>)/;
  const previousTokens = "(?<=[&\\|\\=\\!\\]\\)\\(\\#\\,\\-\\>\\<]\\s*)";
  const followingSymbols = "(?![a-zA-Z0-9\\_]+)";
  const parseNextState: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      if (el !== "keep") {
        if (
          attributes.has(el) ||
          (attributes.has(el.slice(0, el.length - 1)) &&
            el[el.length - 1] === "'")
        ) {
          return "struct";
        } else {
          if (isNaN(+el.trim())) {
            addDiagnostic(
              lineNumber,
              sc,
              lineNumber,
              sc + el.length,
              el + " is not declared as an attribute",
              "error"
            );
          }
          return "label";
        }
      } else {
        return "keyword";
      }
    },
    followingSymbols
  );
  if (line.indexOf("]") === -1) {
    return parseNextState.getTokens(line, lineNumber, 0);
  } else {
    return parseNextState.getTokens(
      line.slice(line.indexOf("]")),
      lineNumber,
      line.indexOf("]")
    );
  }
};

export const _parseAxioms = (
  line: string,
  lineNumber: number
): { tokens: IParsedToken[]; size: number } | undefined => {
  let currentOffset = 0;
  let toRetTokens: IParsedToken[] = [];
  let size = 0;
  const sectionsToParseParsers: ((
    line: string,
    lineNumber: number
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [
    parseConditions,
    parseTriggerAction,
    parsePer,
    parseNextState,
  ];

  const lineWithoutComments =
    line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

  while (currentOffset < lineWithoutComments.length) {
    let foundMatch: boolean = false;
    for (const parser of sectionsToParseParsers) {
      const matchedPiece = parser(lineWithoutComments, lineNumber);
      if (matchedPiece && matchedPiece.size > 0) {
        foundMatch = true;
        toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
        size += matchedPiece.size;
        currentOffset += matchedPiece.size;
      }
    }
    if (!foundMatch) {
      break;
    }
  }
  if (size === 0) {
    return undefined;
  } else {
    return { tokens: toRetTokens, size: size };
  }
};
