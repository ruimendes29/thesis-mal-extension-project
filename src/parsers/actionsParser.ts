import { actions, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

const parseVis = (line: string, lineNumber: number,currentOffset:number) => {
  const toFindTokens = /^\s*\[\s*vis\s*\]/;
  const toSeparateTokens = /(\[|\])/;
  const previousTokens = "";

  const parseActionSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      console.log("parsed a vis!");
      return "keyword";
    }
  );
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

const parseAction = (line: string, lineNumber: number,currentOffset:number) => {
  const toFindTokens = /\s*[A-Za-z]+\w*\s*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,)/;
  const previousTokens = "";

  const parseActionSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
    //TODO: check if the action exists already or not
      actions.set(el.trim(),false);
      return "function";
    }
  );
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

export const _parseActions = (
  line: string,
  lineNumber: number
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
    parseAction
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
