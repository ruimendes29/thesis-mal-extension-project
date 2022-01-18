import { addDiagnostic } from "../diagnostics/diagnostics";
import { actions, attributes, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";



const parseConditions = (line: string, lineNumber: number) => {
  const toFindTokens =
    /^\s*(!?\s*[a-zA-Z]+[a-zA-Z\_0-9]*|\(((\s*!)?\s*[a-zA-Z]+[a-zA-Z\_0-9]*\s*(\&|\||[\>\<\=]{1,2})\s*)*\s*(!?\s*[a-zA-Z]+[a-zA-Z\_0-9]*)\))(?=\s*\<?\-\>)/;
  const toSeparateTokens = /(\(|\)|\&|\||\!|\=|\>|\<)/;
  const previousTokens = "(?<=((\\(|\\)|\\&|\\||\\!|\\=|\\>|\\<|\\s+)))";
  const parseConditionsSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      return attributes.has(el) && attributes.get(el)!.type === "boolean"
        ? "variable"
        : "label";
    }
  );
  return parseConditionsSection.getTokens(line, lineNumber, 0);
};

const parseTriggerAction = (line: string, lineNumber: number) => {
  const toFindTokens = /\[[^\[]+\]/;
  const toSeparateTokens = /(\(|\)|\&|\||\!|\[|\])/;
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
          if (isNaN(+el.trim()))
          {
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
    parseNextState,
    parsePer,
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
