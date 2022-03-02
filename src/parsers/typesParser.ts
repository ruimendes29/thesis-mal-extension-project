import { addDiagnostic, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import {  defines, enums, IParsedToken, ranges } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { separateRangeTokens } from "./relationParser";



const parseRangeTypes = (line:string,lineNumber:number) => {
  const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*([a-zA-Z][a-zA-Z0-9\_]*|[0-9]+)\s*\.\.\s*([a-zA-Z][a-zA-Z0-9\_]*|[0-9]+)/;
  const toSeparateTokens = /(\,|\{|\})/;
  const parseRanges: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    (el, sc) => {
      return "cantprint";
    }
  );
  const toReturnRanges = parseRanges.getTokens(line, lineNumber, 0,true,separateRangeTokens);
  return toReturnRanges;
};

const parseEnumTypes = (line: string, lineNumber: number) => {
  const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*\{.*\}/;
  const toSeparateTokens = /(\=|\,|\{|\})/;
  let elementIndex = 0;
  let typeName = "";
  const parseEnums: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    (el, sc) => {
        if (elementIndex === 0) {
            elementIndex++;
            if (enums.has(el) || ranges.has(el)) {
                addDiagnostic(
                  lineNumber,
                  sc,
                  lineNumber,
                  sc + el.length,
                  el + " is already declared",
                  "warning",NOT_YET_IMPLEMENTED+":"+lineNumber
                );
                return "function";
              } else {
                typeName = el;
                enums.set(el,{used:false,values:[]} );
                return "enum";
              }
        }
        else {
            elementIndex++;
            enums.get(typeName)?.values.push(el);
            return "macro";
        }   
    }
  );
  return parseEnums.getTokens(line, lineNumber, 0);
};

export const _parseTypes = (
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
    parseEnumTypes,
    parseRangeTypes
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
