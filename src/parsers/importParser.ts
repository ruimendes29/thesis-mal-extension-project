import { addDiagnostic, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { actions, attributes, currentInteractor, interactorLimits, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

const parseImport = (line: string, lineNumber: number) => {
  const toFindTokens = /^\s*.*/;
  const toSeparateTokens = /(\s)/;
  const parseConditionsSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    const elt = el.trim();
    if (interactorLimits.has(elt)) {
      const attributesFromImported = attributes.get(elt);
      const actionsFromImported = actions.get(elt);
      if (!attributes.has(currentInteractor)) {
        attributes.set(currentInteractor, new Map());
      }
      if (attributesFromImported) {
        attributes.set(currentInteractor, new Map([...attributes.get(currentInteractor)!, ...attributesFromImported]));
      }
      if (!actions.has(currentInteractor)) {
        actions.set(currentInteractor, new Map());
      }
      if (actionsFromImported) {
        actions.set(currentInteractor, new Map([...actions.get(currentInteractor)!, ...actionsFromImported]));
      }
      return "macro";
    } else {
      addDiagnostic(
        lineNumber,
        sc,
        el,
        elt + " is not a valid interactor name",
        "error",
        NOT_YET_IMPLEMENTED + ":" + el
      );
      return "regexp";
    }
  });
  return parseConditionsSection.getTokens(line, lineNumber, 0);
};

export const _parseImports = (
  line: string,
  lineNumber: number
): { tokens: IParsedToken[]; size: number } | undefined => {
  let toRetTokens: IParsedToken[] = [];
  let size = 0;
  const sectionsToParseParsers: ((
    line: string,
    lineNumber: number
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseImport];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
  for (const parser of sectionsToParseParsers) {
    const matchedPiece = parser(lineWithoutComments, lineNumber);
    if (matchedPiece && matchedPiece.size > 0) {
      toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
      size += matchedPiece.size;
    }
  }
  if (size === 0) {
    return undefined;
  } else {
    return { tokens: toRetTokens, size: size };
  }
};
