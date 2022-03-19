import { addDiagnostic, DECLARE_ACTION, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import { actions, actionsToAttributes, attributes, IParsedToken, ranges } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { compareRelationTokens, findValueType } from "./relationParser";

export let triggerAction: string[] = [];
const setOfAttributesAttended: Set<string> = new Set();
export const temporaryAttributes: {action:string,value:string,index:number}[] = [];
let afterConditionsOffset = 0;

const parseConditions = (line: string, lineNumber: number) => {
  const toFindTokens = /^.*(?=\s*\<?\-\>\s*\[)/;
  const toSeparateTokens = /(\&|\||\)|\(|\!)/;

  const parseConditionsSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    afterConditionsOffset = sc + el.length;
    return "cantprint";
  });

  return parseConditionsSection.getTokens(line, lineNumber, 0, true, compareRelationTokens);
};

const parseActionWithArguments = (
  line: string,
  lineNumber: number,
  action: string,
  numberOfArgs: number,
  startingChar: number
) => {
  const rx = /(\)|\(|\,)/;
  const slicedLine = line.slice(startingChar + action.length);
  const args = slicedLine.slice(0, slicedLine.indexOf(")") + 1);
  const splitedArgs = args.split(rx).filter((el) => !rx.test(el) && el.trim() !== "");
  if (splitedArgs.length !== numberOfArgs) {
    addDiagnostic(
      lineNumber,
      startingChar,
      lineNumber,
      startingChar + action.length,
      action + " doest not have the right amount of arguments",
      "error",
      NOT_YET_IMPLEMENTED + ":" + action
    );
    return false;
  } else {
    return true;
  }
};

export const findTemporaryType = (s:string):string|undefined =>
{
  let ta = undefined;
  for (let i = 0;i<temporaryAttributes.length;i++)
  {
    if (temporaryAttributes[i].value===s)
    {
      const args = actions.get(temporaryAttributes[i].action)!.arguments;
      ta=args[temporaryAttributes[i].index];
      console.log(ta);
      if (ranges.has(ta) || attributes.has(ta) && attributes.get(ta)!.type==="number")
        {return "number";}
      else {return "ta";}
    }
  }
  return undefined;
};

const parseTriggerAction = (line: string, lineNumber: number) => {
  let numberOfArgumentsInAction = 0;
  let actionArgumentIndex = 0;
  let currentAction = "";
  const toFindTokens = /((\<?\s*\-\>\s*)|^\s*)\[[^\[]+\]/;
  const toSeparateTokens = /(\(|\)|\-|\>|\<|\&|\||\!|\[|\]|\,)/;
  const parseTriggerActions: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (numberOfArgumentsInAction > 0) {
      const correctType =  actions.get(currentAction)!.arguments[actionArgumentIndex];
      numberOfArgumentsInAction--;
      actionArgumentIndex++;
      if (el.charAt(0) === "_") {
        temporaryAttributes.push({action:currentAction,value:el,index:actionArgumentIndex-1});
        return "keyword";
      } else if (
        attributes.has(el.trim()) &&
        attributes.get(el.trim())!.type ===
          correctType
      ) {
        console.log(actions);
        return "variable";
      } else {
        addDiagnostic(
          lineNumber,
          sc,
          lineNumber,
          sc + el.length,
          el + " needs to start with an underscore (_) or be an attribute with type "+correctType,
          "error",
          NOT_YET_IMPLEMENTED + ":" + el
        );
        return "regexp";
      }
    } else if (actions.has(el)) {
      const prevAction = actions.get(el)!;
      if (!parseActionWithArguments(line, lineNumber, el, prevAction.arguments.length, sc)) {
        return "regexp";
      } else {
        numberOfArgumentsInAction = prevAction.arguments.length;
      }
      currentAction = el.trim();
      triggerAction.push(el);
      actions.set(el, { used: true, line: prevAction.line, arguments: prevAction.arguments });
      return "function";
    } else {
      addDiagnostic(
        lineNumber,
        sc,
        lineNumber,
        sc + el.length,
        el + " is not declared as an action",
        "error",
        DECLARE_ACTION + ":" + el
      );
      return "variable";
    }
  });
  return parseTriggerActions.getTokens(line, lineNumber, line.search(toFindTokens));
};

const parsePer = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=^\s*per\s*\().+(?=\))/;
  const toSeparateTokens = /(\(|\)|\||\&|\!)/;
  const parsePers: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (actions.has(el)) {
      const prevAction = actions.get(el)!;
      actions.set(el, { used: true, line: prevAction.line, arguments: prevAction.arguments });
      return "function";
    } else {
      addDiagnostic(
        lineNumber,
        sc,
        lineNumber,
        sc + el.length,
        el + " is not declared as an action",
        "error",
        DECLARE_ACTION + ":" + el
      );
      return "variable";
    }
  });
  return parsePers.getTokens(line, lineNumber, 0);
};

const parseNextState = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=((?<=(\-\s*\>.*|^\s*\[.*))\]|^per\s*\(.*\)\s*\<?\-\>)).*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,)/;
  let isInKeep = false;
  const parseConditionsSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    const isNextState: boolean = el.split(":")[1] === "true";
    if (el.split(":")[0] === "keep") {
      isInKeep = true;
      return "";
    }
    if (isInKeep || isNextState) {
      setOfAttributesAttended.add(el.split(":")[0]);
    }

    return "cantprint";
  });
  const perRegex = /^\s*per\s*\(\s*\w*\s*\)\s*\-\s*\>/;
  const startBySquareBrackets = afterConditionsOffset + line.slice(afterConditionsOffset).indexOf("]");
  const correctOffset =
    startBySquareBrackets > 0
      ? startBySquareBrackets
      : line.match(perRegex) !== null
      ? line.match(perRegex)![0].length
      : 0;
  return parseConditionsSection.getTokens(line, lineNumber, correctOffset, true, compareRelationTokens);
};

export const _parseAxioms = (
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
    parseTriggerAction,
    parseConditions,
    parsePer,
    parseNextState,
  ];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
  triggerAction = [];
  setOfAttributesAttended.clear();
  for (const parser of sectionsToParseParsers) {
    const matchedPiece = parser(lineWithoutComments, lineNumber);
    if (matchedPiece && matchedPiece.size > 0) {
      toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
      size += matchedPiece.size;
      currentOffset += matchedPiece.size;
    }
    if (setOfAttributesAttended.size > 0) {
      for (let act of triggerAction) {
        if (!actionsToAttributes.has(act)) {
          actionsToAttributes.set(act, new Set());
        }
        actionsToAttributes.set(act, new Set([...actionsToAttributes.get(act)!, ...setOfAttributesAttended]));
      }
    }
  }
  if (size === 0) {
    return undefined;
  } else {
    return { tokens: toRetTokens, size: size };
  }
};
