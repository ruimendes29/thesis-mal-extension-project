import { addDiagnostic, ALREADY_DEFINED } from "../diagnostics/diagnostics";
import { actions, actionsToAttributes, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

/* Method responsible for parsing the vis tag that some action might have and assign the 
semantic token "keyword" to it*/
const parseVis = (line: string, lineNumber: number, currentOffset: number) => {
  const toFindTokens = /^\s*\[\s*vis\s*\]/;
  // separate in the square brackets so that only the vis is colored
  const toSeparateTokens = /(\[|\])/;

  // Create an instance of ParseSection
  const parseActionSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    // in case there is an element keyword is returned
    (el, sc) => {
      return "keyword";
    }
  );
  /* It is needed to pass the currentOffset so that the getTokens method can slice
  the current line to search only after the index of currentOffset as well as being aware
  of what offset previously existed to determine the start character of the tokens in the whole line
  and not only in the sliced one */
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

/* Very similar to the method above, where only the findTokens expression is changed as well as the 
tokens to separate the main match. */
const parseAction = (line: string, lineNumber: number, currentOffset: number) => {
  const toFindTokens = /\s*[A-Za-z]+\w*\s*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,)/;

  const parseActionSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    // if an element is found, add it to the actions map and return function as the token type
    if (actions.has(el.trim())) {
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
      actionsToAttributes.set(el.trim(),new Set<string>());
      actions.set(el.trim(), {used:false,line:lineNumber});
      return "function";
    }
  });
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
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseVis, parseAction];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

  while (currentOffset < lineWithoutComments.length) {
    let foundMatch: boolean = false;
    for (const parser of sectionsToParseParsers) {
      const matchedPiece = parser(lineWithoutComments, lineNumber, currentOffset);
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
