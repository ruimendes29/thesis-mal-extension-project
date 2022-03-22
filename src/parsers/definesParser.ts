import { addDiagnosticToRelation, ALREADY_DEFINED} from "../diagnostics/diagnostics";
import { defines, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { compareRelationTokens } from "./relations/relationParser";

const parseTokensForITokens = (
  toParseTokens: { value: string; tokenType: string }[],
  lineNumber: number,
  line: string
) => {
  const tokens = [];
  if (toParseTokens !== undefined) {
    for (let t of toParseTokens) {
      tokens.push({
        line: lineNumber,
        startCharacter: line.indexOf(t.value),
        length: t.value.length,
        tokenType: t.tokenType,
        tokenModifiers: [""],
      });
    }
  }
  return { tokens: tokens, size: line.length };
};

const parseDefinesBeforeValue = (line: string, lineNumber: number) => {
  const beforeEquals = line.slice(0, line.indexOf("="));
  const afterEquals = line.slice(line.indexOf("=") + 1, line.length);
  if (defines.has(beforeEquals.trim())) {
    const retFromDiag = addDiagnosticToRelation(
      "att",
      {line:line,lineNumber:lineNumber,el:line},
      beforeEquals,
      afterEquals,
      beforeEquals.trim() + " is already defined!",
      "warning",0,line.indexOf("=")+1,
      0,
      ALREADY_DEFINED + ":" + lineNumber + ":" + beforeEquals.trim()
    );
    return parseTokensForITokens(retFromDiag, lineNumber, line);
  } else {
    let arrayToTokenize: { value: string; tokenType: string }[] = [];
    if (beforeEquals.trim() !== "") {
      if (!isNaN(+afterEquals.trim())) {
        defines.set(beforeEquals.trim(), {
          used: false,
          type: "number",
          value: afterEquals.trim(),
        });
        arrayToTokenize = [
          { value: beforeEquals.trim(), tokenType: "keyword" },
          { value: afterEquals.trim(), tokenType: "number" },
        ];
      } else {
        defines.set(beforeEquals.trim(),{used:false,type:"expression",value:afterEquals.trim()});
        const toFindTokens = /(?<=^\s*\w+\s*\=).*/;
        const toSeparateTokens = /(\&|\||\(|\)|\-\>)/;
        const parseExpressions: ParseSection = new ParseSection(
          toFindTokens,
          toSeparateTokens,
          (el, sc) => {
            return "comment";
          }
        );
        return parseExpressions.getTokens(line, lineNumber,0, true, compareRelationTokens);
      }

      return parseTokensForITokens(arrayToTokenize, lineNumber, line);
    }
  }
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
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseDefinesBeforeValue];

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
