import { addDiagnostic, DECLARE_ACTION, NOT_YET_IMPLEMENTED } from "../diagnostics/diagnostics";
import {
  actions,
  actionsToAttributes,
  aggregates,
  attributes,
  currentInteractor,
  IParsedToken,
  ranges,
} from "./globalParserInfo";
import { isIncludedDinamically } from "./includesParser";
import { ParseSection } from "./ParseSection";
import { compareRelationTokens, removeExclamation } from "./relations/relationParser";

export let triggerAction: string[] = [];
const setOfAttributesAttended: Set<string> = new Set();
export const temporaryAttributes: { action: string; value: string; index: number }[] = [];

const parseConditions = (line: string, lineNumber: number) => {
  const toFindTokens = /^.*(?=\s*\<?\-\>\s*\[)/;
  const toSeparateTokens = /(\s|\&|\||\)|\(|\!)/;

  const parseConditionsSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
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
  const rx2 = new RegExp(action + "\\(\\s*(\\w*\\s*,?\\s*)*\\)");
  const slicedLine = line.slice(startingChar + action.length);
  const args = slicedLine.slice(0, slicedLine.indexOf(")") + 1);
  const splitedArgs = args.split(rx).filter((el) => !rx.test(el) && el.trim() !== "");
  if (rx2.test(line) && splitedArgs.length !== numberOfArgs) {
    addDiagnostic(
      lineNumber,
      startingChar,
      action,
      action + " doest not have the right amount of arguments",
      "error",
      NOT_YET_IMPLEMENTED + ":" + action
    );
    return false;
  } else {
    return true;
  }
};

const parseTemporaryArgument = (
  lineNumber: number,
  sc: number,
  el: string,
  currentAction: string,
  actionArgumentIndex: number,
  interactor: string
): string => {
  const correctType = actions.get(interactor)!.get(currentAction)!.arguments[actionArgumentIndex];
  if (el.charAt(0) === "_") {
    temporaryAttributes.push({ action: currentAction, value: el, index: actionArgumentIndex });
    return "keyword";
  } else if (
    attributes.get(interactor)!.has(el.trim()) &&
    attributes.get(interactor)!.get(el.trim())!.type === correctType
  ) {
    return "variable";
  } else {
    addDiagnostic(
      lineNumber,
      sc,
      el,
      el + " needs to start with an underscore (_) or be an attribute with type " + correctType,
      "error",
      NOT_YET_IMPLEMENTED + ":" + el
    );
    return "regexp";
  }
};

const submitAction = (textInfo: { el: string; line: string; lineNumber: number }, interactor: string, sc: number) => {
  let isOkay = true;
  let numberOfArgumentsInAction = 0;
  const { el, line, lineNumber } = { ...textInfo };
  const prevAction = actions.get(interactor)!.get(el.trim())!;
  if (!parseActionWithArguments(line, lineNumber, el, prevAction.arguments.length, sc)) {
    isOkay = false;
  } else {
    numberOfArgumentsInAction = prevAction.arguments.length;
  }
  const currentAction = el.trim();
  triggerAction.push(interactor + ":" + el.trim());
  actions.get(interactor)!.set(currentAction, { ...prevAction, used: true });
  return {
    numberOfArgumentsInAction: numberOfArgumentsInAction,
    tokenType: isOkay ? "function" : "regexp",
    currentAction: currentAction,
  };
};

const parseTriggerAction = (line: string, lineNumber: number) => {
  let numberOfArgumentsInAction = 0;
  let actionArgumentIndex = 0;
  let currentAction = "";
  let isIncluded = false;
  let includedInteractor = "";
  let interactorForTemps = currentInteractor;
  let actionsInIncluded: Map<string, { used: boolean; line: number; arguments: string[] }>;
  const toFindTokens = /((\<?\s*\-\>\s*)|^\s*)\[[^\[]+\]/;
  const toSeparateTokens = /(\(|\)|\-|\>|\<|\&|\||\!|\[|\]|\,|\.|\s)/;
  const parseTriggerActions: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (isIncluded) {
      if (isIncludedDinamically(includedInteractor, el.trim())) {
        includedInteractor = aggregates.get(el.trim())!.included;

        actionsInIncluded = actions.get(includedInteractor)!;
        return "variable";
      }
      isIncluded = false;
      if (actionsInIncluded.has(el.trim())) {
        const {
          numberOfArgumentsInAction: naia,
          tokenType,
          currentAction: ca,
        } = { ...submitAction({ el: el, line: line, lineNumber: lineNumber }, includedInteractor, sc) };
        numberOfArgumentsInAction = naia;
        currentAction = ca;
        interactorForTemps = includedInteractor;
        return tokenType;
      }
      addDiagnostic(
        lineNumber,
        sc,
        el,
        el + " is not an action from " + includedInteractor,
        "error",
        NOT_YET_IMPLEMENTED + ":" + el
      );
      return "regexp";
    } else if (numberOfArgumentsInAction > 0) {
      numberOfArgumentsInAction--;
      const toRet = parseTemporaryArgument(lineNumber, sc, el, currentAction, actionArgumentIndex, interactorForTemps);
      actionArgumentIndex++;
      return toRet;
    } else if (aggregates.has(el.trim()) && aggregates.get(el.trim())!.current === currentInteractor) {
      isIncluded = true;
      includedInteractor = aggregates.get(el.trim())!.included;
      actionsInIncluded = actions.get(includedInteractor)!;
      return "variable";
    } else if (actions.get(currentInteractor)!.has(el.trim())) {
      const {
        numberOfArgumentsInAction: naia,
        tokenType,
        currentAction: ca,
      } = { ...submitAction({ el: el, line: line, lineNumber: lineNumber }, currentInteractor, sc) };
      interactorForTemps = currentInteractor;
      numberOfArgumentsInAction = naia;
      currentAction = ca;
      return tokenType;
    } else {
      addDiagnostic(
        lineNumber,
        sc,
        el,
        el + " is not declared as an action",
        "error",
        DECLARE_ACTION + ":" + el
      );
      return "regexp";
    }
  });
  return parseTriggerActions.getTokens(line, lineNumber, line.search(toFindTokens));
};

const parseNextState = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=((?<=(\-\s*\>.*|^\s*\[.*))\]|^\s*per\s*\(.*\)\s*\<?\-\>)).*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,|\<?\s*\-\s*\>|\s)/;
  let isInKeep = false;
  let addToAttributes: string[] = [];
  const parseNextStateSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    const [attName, isNextState, interactor, lastValue] = el.split(":");
    if (isInKeep)
    {
      console.log(el);
    }
    if (attName.trim() === "keep") {
      console.log("keebp!!");
      isInKeep = true;
      return "";
    }
    if (interactor !== "undefined") {
      addToAttributes.push(removeExclamation(attName.trim()).value + ".");
    } else {
      addToAttributes = [];
      addToAttributes.push(removeExclamation(attName.trim()).value + ".");
    }
    if ((isInKeep&&isNextState!=="undefined") || isNextState === "true") {
      const toAddToSet = addToAttributes.join("").slice(0, addToAttributes.join("").length - 1);
      setOfAttributesAttended.add(toAddToSet);
      addToAttributes = [];
    } else if (interactor === "undefined") {
      addToAttributes = [];
    }
    return "cantprint";
  });
  return parseNextStateSection.getTokens(line, lineNumber, 0, true, compareRelationTokens);
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
  ) => { tokens: IParsedToken[]; size: number } | undefined)[] = [parseTriggerAction, parseConditions, parseNextState];

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
        const [interactorName, actName] = act.split(":");
        if (
          actionsToAttributes.has(currentInteractor) &&
          actionsToAttributes.get(currentInteractor)!.has(interactorName)
        ) {
          if (actionsToAttributes.get(currentInteractor)!.get(interactorName)!.has(actName)) {
            const actionsRecorded = actionsToAttributes.get(currentInteractor)!.get(interactorName)!;
            actionsRecorded.set(actName, new Set([...actionsRecorded.get(actName)!, ...setOfAttributesAttended]));
          }
        }
      }
    }
  }
  if (size === 0) {
    return undefined;
  } else {
    return { tokens: toRetTokens, size: size };
  }
};
