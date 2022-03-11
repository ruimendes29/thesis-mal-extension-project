import { addDiagnostic, ALREADY_DEFINED } from "../diagnostics/diagnostics";
import { actions, attributes, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

let attributesInLine: Array<string> = [];

const parseAttribute = (line: string, lineNumber: number,currentOffset: number) => {
  const toFindTokens = /(\s*[A-Za-z]+\w*\s*(\,|(?=\:)))+/;
  const toSeparateTokens = /(\,)/;

  const parseActionSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    (el, sc) => {
      // if an element is found, add it to the actions map and return function as the token type
    if (attributes.has(el.trim())) {
      addDiagnostic(
        lineNumber,
        sc,
        lineNumber,
        sc + el.trim().length,
        el.trim() + " is already defined",
        "error",
        ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
      );
      return "regexp";
    } else {
      attributesInLine.push(el.trim());
      return "variable";
    }
    }
  );
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

const parseVis = (line: string, lineNumber: number,currentOffset: number) => {
  const toFindTokens = /^\s*\[\s*vis\s*\]/;
  const toSeparateTokens = /(\[|\])/;

  const parseActionSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    (el, sc) => {
      return "keyword";
    }
  );
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

const parseType = (line: string, lineNumber: number,currentOffset: number) => {
  const toFindTokens = /:\s*[A-Za-z\_]+\w*\s*/;
  const toSeparateTokens = /\:/;

  const parseActionSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    (el, sc) => {
      const type = el.trim();
      for (let att of attributesInLine)
      {
        attributes.set(att,{used:false,type:type,line:lineNumber,alone: attributesInLine.length===1});
      }
      attributesInLine = [];
      return "type";
    }
  );
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

export const _parseAttributes = (
  line: string,
  lineNumber: number,
): { tokens: IParsedToken[]; size: number } | undefined => {
  let currentOffset = 0;
  let toRetTokens: IParsedToken[] = [];
  let size = 0;
  const sectionsToParseParsers: ((
    line: string,
    lineNumber: number,
    currentOffset: number
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [
    parseVis,
    parseAttribute,
    parseType
  ];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

  while (currentOffset < lineWithoutComments.length) {
    let foundMatch: boolean = false;
    for (const parser of sectionsToParseParsers) {
      const matchedPiece = parser(lineWithoutComments, lineNumber,currentOffset);
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