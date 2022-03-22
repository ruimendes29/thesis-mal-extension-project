import { addDiagnostic, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { aggregates, attributes, currentInteractor, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { removeExclamation } from "./relations/relationParser";

export const parseAggregatesValue = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number,
  val: { value: string; offset: number }
):
  | {
      tokens: { offset: number; value: string; tokenType: string }[];
      type: string | undefined;
      lastInteractor: string;
      attributeName: string;
    }
  | undefined => {
  let offsetPoints = 0;
  const splitByPoints = val.value
    .split(/(\.)/)
    .map((el) => {
      offsetPoints += el.length;
      return { value: el, offset: offsetPoints - el.length };
    })
    .filter((el) => el.value.trim() !== "" && !el.value.includes("."));
  let current = currentInteractor;
  const toks = [];
  let typeToRet: string | undefined = "";
  let i=0;
  if (splitByPoints.length > 1) {
    for (let x of splitByPoints) {
      const xt = i===0?(removeExclamation(x.value.trim()).value):(x.value.trim());
      i++;
      if (aggregates.has(xt) && aggregates.get(xt)!.current === current) {
        current = aggregates.get(xt)!.included;
        toks.push({ offset: x.offset, value: x.value, tokenType: "variable" });
      } else if (attributes.has(current) && attributes.get(current)!.has(removeExclamation(xt.trim()).value)) {
        toks.push({ offset: x.offset, value: x.value, tokenType: "variable" });
        typeToRet = attributes.get(current)!.get(removeExclamation(xt).value)!.type;
        break;
      } else {
        addDiagnostic(
          textInfo.lineNumber,
          offset + x.offset,
          textInfo.lineNumber,
          offset + x.offset + x.value.length,
          xt + " is not aggregated",
          "error",
          NOT_YET_IMPLEMENTED + ":" + xt
        );
        toks.push({ offset: x.offset, value: x.value, tokenType: "regexp" });
        typeToRet = undefined;
        break;
      }
    }
    return {
      tokens: toks,
      type: typeToRet,
      lastInteractor: current,
      attributeName: splitByPoints[splitByPoints.length - 1].value,
    };
  }

  return undefined;
};

export const isIncludedDinamically = (interactorToCheck: string, includedToCheck: string) => {
  let current = includedToCheck;
  let interactor = interactorToCheck;
  if (aggregates.has(current) && aggregates.get(current)!.current === interactor) {
    return true;
  } else {
    return false;
  }
};

const parseInclude = (line: string, lineNumber: number) => {
  let elIndex = 0;
  let intName = "";
  const toFindTokens = /^\s*[a-zA-Z]+\w*\s+via\s+[a-zA-Z]+\w*/;
  const toSeparateTokens = /(\s|via)/;
  const parseConditionsSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (elIndex === 0) {
      intName = el.trim();
      elIndex++;
      return "macro";
    } else {
      aggregates.set(el.trim(), { current: currentInteractor, included: intName });
      return "variable";
    }
  });
  return parseConditionsSection.getTokens(line, lineNumber, 0);
};

export const _parseIncludes = (
  line: string,
  lineNumber: number
): { tokens: IParsedToken[]; size: number } | undefined => {
  let currentOffset = 0;
  let toRetTokens: IParsedToken[] = [];
  let size = 0;
  const sectionsToParseParsers: ((
    line: string,
    lineNumber: number
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseInclude];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
  for (const parser of sectionsToParseParsers) {
    const matchedPiece = parser(lineWithoutComments, lineNumber);
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
