import { addDiagnostic, addDiagnosticToRelation, DECLARE_ACTION, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { actions, attributes, enums, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { compareRelationTokens } from "./relationParser";

const parseConditions = (line: string, lineNumber: number) => {
  const toFindTokens = /^.*(?=\s*\<?\-\>)/;
  const toSeparateTokens = /(\&|\||\)|\(|\!)/;
  const previousTokens = "";

  const parseConditionsSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      return "cantprint";
    }
  );

  return parseConditionsSection.getTokens(line, lineNumber, 0, true, compareRelationTokens);
};

const parseTriggerAction = (line: string, lineNumber: number) => {
  const toFindTokens = /(\<?\s*\-\>\s*)?\[[^\[]+\]/;
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
        addDiagnostic(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an action", "error", DECLARE_ACTION+":"+el);
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
  const parsePers: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, previousTokens, (el, sc) => {
    if (actions.has(el)) {
      return "function";
    } else {
      addDiagnostic(lineNumber, sc, lineNumber, sc + el.length, el + " is not declared as an action", "error",NOT_YET_IMPLEMENTED+":"+lineNumber);
      return "variable";
    }
  });
  return parsePers.getTokens(line, lineNumber, 0);
};

const parseNextState = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=(\]|^per\s*\(.*\)\s*\<?\-\>)).*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,)/;
  const previousTokens = "";

  const parseConditionsSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      return "cantprint";
    }
  );
  const perRegex = /^\s*per\s*\(\s*\w*\s*\)\s*\-\s*\>/;
  const correctOffset =
    line.indexOf("]") > 0 ? line.indexOf("]") : line.match(perRegex) !== null ? line.match(perRegex)![0].length : 0;
  return parseConditionsSection.getTokens(line, lineNumber, correctOffset, true, compareRelationTokens);
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

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

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
