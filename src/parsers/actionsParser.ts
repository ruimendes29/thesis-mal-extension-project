import { addDiagnostic, ALREADY_DEFINED, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import {
  actions,
  actionsToAttributes,
  arrays,
  currentInteractor,
  enums,
  IParsedToken,
  ranges,
} from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { splitWithOffset } from "./relations/relationParser";

/* Method responsible for parsing the vis tag that some action might have and assign the 
semantic token "keyword" to it*/
const parseVis = (line: string, lineNumber: number, currentOffset: number) => {
  const toFindTokens = /^\s*\[\s*vis\s*\]/;
  // separate in the square brackets so that only the vis is colored
  const toSeparateTokens = /(\[|\]|\s)/;

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

const isAType = (line: string, position: number, element: string) => {
  let goBack = -1;
  let goForward = 1;
  while (line[position + goBack] === " ") {
    goBack--;
  }
  while (line[position + element.length + goForward] === " ") {
    goForward++;
  }
  if (line[position + goBack] === "(" || line[position + goBack] === ",") {
    return true;
  }
  if (line[position + element.length + goForward] === ")" || line[position + element.length + goForward] === ",") {
    return true;
  }
  return false;
};

/* Very similar to the method above, where only the findTokens expression is changed as well as the 
tokens to separate the main match. */
const parseAction = (line: string, lineNumber: number, currentOffset: number) => {
  let indexOfElement = 0;
  const toFindTokens = /(?<=(\]\s*|^\s*))(?<!\[)(\s*[A-Za-z]+\w*\s*(\(((\s*\w+\s*),?)+\))?)+(?!\])/;
  const toSeparateTokens = /(\)|\(|\,|\s)/;
  let hasTypes = false;
  let foundAction = false;
  let actionName: string = "";
  let actionArguments: string[] = [];

  const parseActionSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    const et = el.trim();
    // if an element is found, add it to the actions map and return function as the token type
    if (actions.has(currentInteractor) && actions.get(currentInteractor)!.has(et)) {
      addDiagnostic(
        lineNumber,
        sc,
        el,
        et + " is already defined",
        "error",
        ALREADY_DEFINED + ":" + lineNumber + ":" + et
      );
      indexOfElement++;
      return "regexp";
    } else if (foundAction && (enums.has(et) || ranges.has(et) || arrays.has(et) || et === "boolean")) {
      actionArguments.push(et);
      return "type";
    } else if (isAType(line, sc, et)) {
      addDiagnostic(lineNumber, sc, el, et + " is not a valid type", "error", NOT_YET_IMPLEMENTED + ":" + et);
      return "regexp";
    } else {
      if (!actionsToAttributes.has(currentInteractor)) {
        actionsToAttributes.set(currentInteractor, new Map());
      }
      if (!actionsToAttributes.get(currentInteractor)!.has(currentInteractor)) {
        actionsToAttributes.get(currentInteractor)!.set(currentInteractor, new Map());
      }
      actionsToAttributes.get(currentInteractor)!.get(currentInteractor)!.set(et, new Set());
      if (!actions.has(currentInteractor)) {
        actions.set(currentInteractor, new Map());
      }
      if (foundAction) {
        actions.get(currentInteractor)!.set(actionName, { used: false, line: lineNumber, arguments: actionArguments });
      }
      console.log(isAType(line, sc, et) + " " + et);
      actionArguments = [];
      actionName = et;
      foundAction = true;
      return "function";
    }
  });
  const toReturnParseAction = parseActionSection.getTokens(line, lineNumber, currentOffset);
  if (!actions.has(currentInteractor)) {
    actions.set(currentInteractor, new Map());
  }
  if (foundAction) {
    actions.get(currentInteractor)!.set(actionName, { used: false, line: lineNumber, arguments: actionArguments });
  }
  return toReturnParseAction;
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
  const separators = /(?<!\,)(\s)/;

  for (const parser of sectionsToParseParsers) {
    const matchedPiece = parser(lineWithoutComments, lineNumber, 0);
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
