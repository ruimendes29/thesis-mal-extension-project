import { IParsedToken} from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { compareRelationTokens} from "./relations/relationParser";


const parseTests = (line: string, lineNumber: number) => {
  const toFindTokens = /.*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,|\<?\s*\-\s*\>)/;
  const parseEnums: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
      return "cantprint";
  
  });
  return parseEnums.getTokens(line, lineNumber, 0,true,compareRelationTokens);
};

export const _parseTest = (line: string, lineNumber: number): { tokens: IParsedToken[]; size: number } | undefined => {
  let currentOffset = 0;
  let toRetTokens: IParsedToken[] = [];
  let size = 0;
  const sectionsToParseParsers: ((
    line: string,
    lineNumber: number
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [];

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
