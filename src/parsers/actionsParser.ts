import { addDiagnostic, ALREADY_DEFINED, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { actions, actionsToAttributes, arrays, currentInteractor, enums, IParsedToken, ranges } from "./globalParserInfo";
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
  return parseActionSection.getTokens(line, lineNumber, 0);
};

/* Very similar to the method above, where only the findTokens expression is changed as well as the 
tokens to separate the main match. */
const parseAction = (line: string, lineNumber: number, currentOffset: number) => {
  let indexOfElement = 0;
  const toFindTokens = /(?<=(\]\s*|^\s*))(?<!\[)\s*[A-Za-z]+\w*\s*(\(((\s*\w+\s*),?)+\))?(?!\])/;
  const toSeparateTokens = /(\&|\||\)|\(|\,)/;
  let actionName:string = "";
  const actionArguments:string[] = [];

  const parseActionSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (indexOfElement === 0) {
      // if an element is found, add it to the actions map and return function as the token type
      if (actions.has(currentInteractor) && actions.get(currentInteractor)!.has(el.trim())) {
        addDiagnostic(
          lineNumber,
          sc,
          lineNumber,
          sc + el.length,
          el.trim() + " is already defined",
          "error",
          ALREADY_DEFINED + ":" + lineNumber + ":" + el.trim()
        );
        indexOfElement++;
        return "regexp";
      } else {
        actionsToAttributes.set(currentInteractor,new Map());
        actionsToAttributes.get(currentInteractor)!.set(el.trim(), new Set<string>());
        actionName = el.trim();
        indexOfElement++;
        return "function";
      }
    }
    else {
      indexOfElement++;
      const et = el.trim();
      if (enums.has(et) || ranges.has(et) || arrays.has(et) || et==="boolean" ||et==="number")
      {actionArguments.push(et);return "type";}
      else {
        addDiagnostic(lineNumber,sc,lineNumber,sc+el.length,et+" is not a valid type","error",NOT_YET_IMPLEMENTED);
        return "regexp";
      }
    }
  });
  const toReturnParseAction = parseActionSection.getTokens(line, lineNumber, 0);
  if (!actions.has(currentInteractor))
  {
    actions.set(currentInteractor,new Map());
  }
  actions.get(currentInteractor)!.set(actionName,{used:false,line:lineNumber,arguments:actionArguments});
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
