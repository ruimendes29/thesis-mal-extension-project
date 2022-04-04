import { addDiagnosticToRelation, ALREADY_DEFINED } from "../diagnostics/diagnostics";
import { defines, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { compareRelationTokens } from "./relations/relationParser";
import { findValueType } from "./relations/typeFindes";

let definedName: string | undefined = undefined;
let alreadyAdded = false;

const parseDefinesBeforeEquals = (line: string, lineNumber: number) => {
  const toFindTokens = /^\s*\w+\s*\=/;
  const toSeparateTokens = /(\=)/;
  const parseExpressions: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    alreadyAdded=false;
    definedName = el.trim();

    return "keyword";
  });
  return parseExpressions.getTokens(line, lineNumber, 0);
};

const parseDefinesAfterEquals = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=^\s*\w+\s*\=).*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,|\<?\s*\-\s*\>)/;
  let elementIndex=0;
  const parseExpressions: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    const definedValue = el.split(":")[0].trim();
    const definedType = !isNaN(+definedValue)
      ? "number"
      : definedValue.toUpperCase() === "FALSE" || definedValue.toUpperCase() === "TRUE"
      ? "boolean"
      : "defines";
    if (!alreadyAdded) {
      defines.set(definedName!, { used: false, type: definedType, value: definedValue });
      alreadyAdded = true;
    }
    return "cantprint";
  });
  return parseExpressions.getTokens(line, lineNumber, 0, true, compareRelationTokens);
};

export const _parseDefines = (
  line: string,
  lineNumber: number
): { tokens: IParsedToken[]; size: number } | undefined => {
  let currentOffset = 0;
  let toRetTokens: IParsedToken[] = [];
  let size = 0;
  const sectionsToParseParsers: ((
    line: string,
    lineNumber: number
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseDefinesBeforeEquals, parseDefinesAfterEquals];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

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
  if (size === 0) {
    return undefined;
  } else {
    return { tokens: toRetTokens, size: size };
  }
};
