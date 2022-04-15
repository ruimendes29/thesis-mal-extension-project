import { addDiagnostic, ALREADY_DEFINED, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { actions, arrays, attributes, currentInteractor, enums, IParsedToken, ranges } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

let attributesInLine: Array<string> = [];

const parseAttribute = (line: string, lineNumber: number, currentOffset: number) => {
  const toFindTokens = /(\s*[A-Za-z]+\w*\s*(\,|(?=\:)))+/;
  const toSeparateTokens = /(\,|\s)/;

  const parseActionSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    // if an element is found, add it to the actions map and return function as the token type
    if (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(el.trim())) {
      addDiagnostic(
        lineNumber,
        sc,
        el,
        el.trim() + " is already defined",
        "error",
        ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
      );
      return "regexp";
    } else {
      attributesInLine.push(el.trim());
      return "variable";
    }
  });
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

const parseVis = (line: string, lineNumber: number, currentOffset: number) => {
  const toFindTokens = /^\s*\[\s*vis\s*\]/;
  const toSeparateTokens = /(\[|\]|\s)/;

  const parseActionSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    return "keyword";
  });
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

const parseType = (line: string, lineNumber: number, currentOffset: number) => {
  const toFindTokens = /:\s*[A-Za-z\_]+\w*\s*/;
  const toSeparateTokens = /(\:|\s)/;

  const parseActionSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    const type = el.trim();
    if (enums.has(type) || ranges.has(type) || type==="boolean" || arrays.has(type))
    {
      for (let att of attributesInLine) {
        if (!attributes.has(currentInteractor)) {
          attributes.set(currentInteractor, new Map());
        }
        attributes
          .get(currentInteractor)!
          .set(att, { used: false, type: type, line: lineNumber, alone: attributesInLine.length === 1 });
      }
      attributesInLine = [];
      return "type";
    }
    else {
      addDiagnostic(lineNumber,sc,el,type+" is not a valid type","error",NOT_YET_IMPLEMENTED+":"+type);
      return "regexp";
    }

  });
  return parseActionSection.getTokens(line, lineNumber, currentOffset);
};

export const _parseAttributes = (
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
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseVis, parseAttribute, parseType];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

  for (const parser of sectionsToParseParsers) {
    const matchedPiece = parser(lineWithoutComments, lineNumber, currentOffset);
    if (matchedPiece && matchedPiece.size > 0) {
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
