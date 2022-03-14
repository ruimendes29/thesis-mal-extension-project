import { types } from "util";
import { addDiagnostic, ALREADY_DEFINED, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { arrays, defines, enums, IParsedToken, ranges } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { separateRangeTokens } from "./relationParser";

const getNumericalValue = (s: string): number | undefined => {
  if (!isNaN(+s)) {return +s;}
  else if (defines.has(s) && defines.get(s)!.type === "number") {
    return +defines.get(s)!.value;
  }
};

const parseArray = (line: string, lineNumber: number) => {
  let indexOfElement = 0;
  let arrayName: string = "";
  let firstIndex: number = 0;
  let lastIndex: number = 0;
  let arrayType: string = "";
  const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*array\s+\w+\s*\.\.\s*\w+\s+of\s+\w+/;
  //const toFindTokens = /.*/;
  const toSeparateTokens = /(\=|\barray\b|\.\.|of)/;
  const parseRanges: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    console.log(indexOfElement + " " + el);
    switch (indexOfElement) {
      case 0:
        arrayName = el.trim();
        indexOfElement++;
        return "type";
      case 1:
        firstIndex = getNumericalValue(el.trim())!;
        indexOfElement++;
        return "number";
      case 2:
        lastIndex = getNumericalValue(el.trim())!;
        indexOfElement++;
        return "number";
      case 3:
        arrayType = el.trim();
        indexOfElement++;
        if (arrayType==="number"||arrayType==="boolean"||ranges.has(arrayType)||enums.has(arrayType))
        {
          return "type";
        }
        else
        {
          const stc = ParseSection.getPosition(line,arrayType,1);
          addDiagnostic(lineNumber,stc,lineNumber,stc+arrayType.length,"error",arrayType+" is not a valid type",NOT_YET_IMPLEMENTED);
        }
    }
    return "cantprint";
  });
  const toReturnRanges = parseRanges.getTokens(line, lineNumber, 0);
  if (arrayName!=="")
  {
    arrays.set(arrayName, { firstIndex: firstIndex, lastIndex: lastIndex, type: arrayType });
  }

  return toReturnRanges;
};

const parseRangeTypes = (line: string, lineNumber: number) => {
  const toFindTokens =
    /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*([a-zA-Z][a-zA-Z0-9\_]*|[0-9]+)\s*\.\.\s*([a-zA-Z][a-zA-Z0-9\_]*|[0-9]+)/;
  const toSeparateTokens = /(\,|\{|\})/;
  const parseRanges: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    return "cantprint";
  });
  const toReturnRanges = parseRanges.getTokens(line, lineNumber, 0, true, separateRangeTokens);
  return toReturnRanges;
};

const parseEnumTypes = (line: string, lineNumber: number) => {
  const toFindTokens = /^\s*[a-zA-Z][a-zA-Z0-9\_]*\s*\=\s*\{.*\}/;
  const toSeparateTokens = /(\=|\,|\{|\})/;
  let elementIndex = 0;
  let typeName = "";
  const parseEnums: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (elementIndex === 0) {
      elementIndex++;
      if (enums.has(el) || ranges.has(el)) {
        addDiagnostic(
          lineNumber,
          sc,
          lineNumber,
          sc + el.length,
          el + " is already declared",
          "warning",
          ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
        );
        return "function";
      } else {
        typeName = el;
        enums.set(el, { used: false, values: [] });
        return "enum";
      }
    } else {
      elementIndex++;
      enums.get(typeName)?.values.push(el);
      return "macro";
    }
  });
  return parseEnums.getTokens(line, lineNumber, 0);
};

export const _parseTypes = (line: string, lineNumber: number): { tokens: IParsedToken[]; size: number } | undefined => {
  let currentOffset = 0;
  let toRetTokens: IParsedToken[] = [];
  let size = 0;
  const sectionsToParseParsers: ((
    line: string,
    lineNumber: number
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseArray,parseEnumTypes,parseRangeTypes];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;

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
  
  if (size === 0) {
    return undefined;
  } else {
    return { tokens: toRetTokens, size: size };
  }
};
