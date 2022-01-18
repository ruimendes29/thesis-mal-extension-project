import { addDiagnostic } from "../diagnostics/diagnostics";
import { defines, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

const parseDefinesBeforeValue = (line: string, lineNumber: number) => {
  const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=/;
  const toSeparateTokens = /\=/;
  const previousTokens = "";
  const parseDefines: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    previousTokens,
    (el, sc) => {
      if (defines.has(el)) {
        console.log(el  +" passed twice");
        addDiagnostic(
          lineNumber,
          sc,
          lineNumber,
          sc + el.length,
          el + " is already declared",
          "warning"
        );
        return "function";
      } else {
        console.log("new defines "+el);
        defines.set(el, { used: false, type: undefined });
        return "keyword";
      }
    }
  );
  return parseDefines.getTokens(line, lineNumber, 0);
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
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [
    parseDefinesBeforeValue,
  ];

  const lineWithoutComments =
    line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

  while (currentOffset < lineWithoutComments.length) {
    let foundMatch: boolean = false;
    for (const parser of sectionsToParseParsers) {
      const matchedPiece = parser(lineWithoutComments.slice(currentOffset), lineNumber);
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
