import { addDiagnostic, ADD_TO_ENUM, NOT_YET_IMPLEMENTED } from "../../diagnostics/diagnostics";
import { getArrayInStore, getArrayWrittenInfo } from "../arrayRelations";
import { temporaryAttributes } from "../axiomParser";
import {
  actions,
  aggregates,
  arrays,
  attributes,
  currentInteractor,
  defines,
  enums,
  ranges,
} from "../globalParserInfo";
import { countSpacesAtStart } from "../textParser";
import {
  emitNotAggregatedDiagnostic,
  emitNotANumberDiagnostic,
  emitNotArrayDiagnostic,
  parseErrorsRelationBetween,
} from "./relationErrors";
import { findValueType, findTemporaryType } from "./typeFindes";

let offsetForDiags = 0;
let argumentsInAction: any[] = [];
let actionInExpression: string | undefined = undefined;
let totalActionArguments: number = 0;
let actionInteractor: string | undefined = undefined;

export const parseRangeInput = (preV: string): { value: number; isANumber: boolean } => {
  let v;
  let isANumber = false;
  v = 0;
  const trimmedv = preV.trim();
  if (!isNaN(+trimmedv)) {
    isANumber = true;
    v = trimmedv;
  } else if (defines.has(trimmedv) && defines.get(trimmedv)!.type === "number") {
    v = defines.get(trimmedv)!.value;
    isANumber = true;
    defines.set(trimmedv, { used: true, type: "number", value: v });
  }
  return { value: +v, isANumber: isANumber };
};

export const removeExclamation = (att: string) => {
  let nextState = false;
  const we = att.trim().charAt(0) === "!" ? att.trim().slice(1) : att.trim();
  let ret;
  if (we.charAt(we.length - 1) === "'") {
    ret = we.slice(0, we.length - 1);
    nextState = true;
  } else {
    ret = we;
  }
  return { value: ret, isNextState: nextState };
};

const updateAttributeUsage = (att: string, interactor: string) => {
  const attCleared = removeExclamation(att.trim()).value;
  if (attributes.has(interactor) && attributes.get(interactor)!.has(attCleared.trim())) {
    const attAux = attributes.get(interactor)!.get(attCleared)!;
    attributes.get(interactor)!.set(attCleared, { ...attAux, used: true });
  }
};

export const splitWithOffset = (rx: RegExp, element: string, offset: number, toNotSeparateArrays?: boolean) => {
  let offsetInsideMember = offset;
  if (toNotSeparateArrays) {
    let numberOfBrackets = 0;
    let valueHeld = "";
    const splittedMember = element.split(rx);
    const toRet = [];
    for (const el of splittedMember) {
      offsetInsideMember += el.length;
      valueHeld += el;
      if (el.includes("[")) {
        numberOfBrackets++;
      }
      if (el.includes("]")) {
        numberOfBrackets--;
      }
      if (numberOfBrackets === 0) {
        valueHeld = "";
        toRet.push({ value: valueHeld, offset: offsetInsideMember - valueHeld.length });
      }
    }
    return toRet;
  } else {
    const splittedMember = element
      .split(rx)
      .map((el) => {
        offsetInsideMember += el.length;
        return { value: el, offset: offsetInsideMember - el.length };
      })
      .filter((el) => !rx.test(el.value.trim()) && el.value.trim() !== "");
    return splittedMember;
  }
};

const parseArrayMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  let arrayNext;

  if (member.value.includes("[")) {
    arrayNext = removeExclamation(member.value.trim());
    if (arrayNext.isNextState) {
      member.value = member.value.slice(0, member.value.indexOf("'"));
    }
    const splittedMember = splitWithOffset(/(\[|\])/, member.value, member.offset);
    let index = 0;
    let arrayInfo: { type: any; dimensions: number };
    let toRet: any[] = [];
    for (let sm of splittedMember) {
      const { offset: o, value: v } = sm;
      const { value: tv, isNextState } = removeExclamation(v.trim());
      if (index === 0) {
        if (attributes.has(interactor) && attributes.get(interactor)!.has(tv)) {
          updateAttributeUsage(tv, interactor);
          arrayInfo = getArrayInStore(tv, interactor);
          if (arrayInfo.type !== "") {
            toRet.push({
              offset: o,
              value: v,
              tokenType: "variable",
              nextState: arrayNext.isNextState,
            });
          } else {
            emitNotArrayDiagnostic(textInfo.lineNumber, offsetForDiags + o, v);
            toRet.push({
              offset: o,
              value: v,
              tokenType: "regexp",
              nextState: false,
            });
          }
        } else {
          emitNotArrayDiagnostic(textInfo.lineNumber, offsetForDiags + o, v);
          toRet.push({
            offset: o,
            value: v,
            tokenType: "regexp",
            nextState: false,
          });
        }
        index++;
      } else {
        if (index < arrayInfo!.dimensions + 1) {
          const parsedComplexArgument = parseMemberOfRelation(textInfo, sm, currentInteractor);
          if (parsedComplexArgument?.type === "number") {
            toRet = [...toRet, ...parsedComplexArgument.tokens];
          } else {
            emitNotANumberDiagnostic(textInfo.lineNumber, offsetForDiags + o, v);
            toRet = [{ offset: o, value: v, tokenType: "regexp", nextState: false }, ...parsedComplexArgument!.tokens];
          }
          index++;
        } else {
          toRet = [
            {
              offset: member.offset,
              value: member.value,
              tokenType: "regexp",
              nextState: false,
            },
          ];
          return { tokens: toRet, type: "" };
        }
      }
    }

    return { tokens: toRet, type: arrayInfo!.type };
  }
  return undefined;
};

const parseGroupForInMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: {
    offset: number;
    value: string;
  },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  const rx = /(\{|\,|\})/;
  if (rx.test(member.value)) {
    const toRet = [];
    let index = 0;
    let correctType: string | undefined = "";
    const splittedMember = splitWithOffset(rx, member.value, member.offset);
    for (let sm of splittedMember) {
      const smvt = sm.value.trim();
      if (index++ === 0) {
        correctType = findValueType(smvt, interactor);
        if (correctType === undefined) {
          addDiagnostic(
            textInfo.lineNumber,
            offsetForDiags + sm.offset,
            sm.value,
            smvt + " is not a member of any enum",
            "error",
            NOT_YET_IMPLEMENTED + ":" + smvt
          );
        } else {
          toRet.push({
            offset: sm.offset,
            value: sm.value,
            tokenType: "macro",
          });
        }
      } else {
        const typeOfElem = findValueType(smvt, interactor);
        if (typeOfElem && typeOfElem !== correctType) {
          addDiagnostic(
            textInfo.lineNumber,
            offsetForDiags + sm.offset,
            sm.value,
            smvt + " is not a member of " + correctType,
            "error",
            NOT_YET_IMPLEMENTED + ":" + smvt
          );
        } else if (typeOfElem === undefined && correctType !== undefined) {
          addDiagnostic(
            textInfo.lineNumber,
            offsetForDiags + sm.offset,
            sm.value,
            smvt + " is not defined as a member of " + correctType,
            "error",
            ADD_TO_ENUM + ":" + enums.get(correctType)!.line + ":" + smvt + ":" + correctType
          );
        } else {
          toRet.push({
            offset: sm.offset,
            value: sm.value,
            tokenType: "macro",
          });
        }
      }
    }
    return { tokens: toRet, type: correctType };
  }
  return undefined;
};

const parseAggregatedMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: {
    offset: number;
    value: string;
  },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  const rx = /(?<!\w\s*\[.*)(\.)/;
  if (rx.test(member.value)) {
    const splittedMember = splitWithOffset(rx, member.value, member.offset);
    let current = interactor;
    let retType: string | undefined = undefined;
    const toRet = [];
    let arrayAttribute;
    for (let sm of splittedMember) {
      const { value: v, offset: o } = sm;
      const { value: tv, isNextState } = removeExclamation(v.trim());
      if (aggregates.has(tv) && aggregates.get(tv)!.current === current) {
        current = aggregates.get(tv)!.included;
        toRet.push({
          offset: o,
          value: v,
          tokenType: "variable",
          interactor: aggregates.get(tv)!.current,
        });
      } else if (attributes.has(current) && attributes.get(current)!.has(tv)) {
        retType = findValueType(tv, current);
        updateAttributeUsage(tv, current);
        toRet.push({
          offset: o,
          value: v,
          tokenType: "variable",
          nextState: isNextState,
          interactor: current,
        });
        break;
      } else if (actions.has(current) && actions.get(current)!.has(tv)) {
        actionInteractor = current;
        return {
          tokens: [...toRet, ...parseActionMember(textInfo, sm, current)!.tokens],
          type: "action",
        };
      } else if ((arrayAttribute = getArrayInStore(getArrayWrittenInfo(tv).arrayName, current)).type !== "") {
        return {
          tokens: [
            ...toRet,
            ...parseArrayMember(textInfo, sm, current)!.tokens.map((el) => {
              return { ...el, interactor: current };
            }),
          ],
          type: arrayAttribute.type,
        };
      } else {
        emitNotAggregatedDiagnostic(textInfo.lineNumber, offsetForDiags + o, v);
        return {
          tokens: [...toRet, { offset: o, value: v, tokenType: "regexp", nextState: false }],
          type: arrayAttribute.type,
        };
      }
    }
    return { tokens: toRet, type: retType };
  }
  return undefined;
};

const parseActionMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  const { value: v, offset: o } = member;
  const { value: tv, isNextState } = removeExclamation(v.trim());
  let actInfo;
  if ((actInfo = actions.get(interactor)?.get(tv))) {
    argumentsInAction = [...actions.get(interactor)!.get(tv)!.arguments];
    actionInExpression = tv;
    totalActionArguments = argumentsInAction.length;
    return {
      tokens: [{ offset: o, value: v, tokenType: "function", nextState: isNextState }],
      type: "action",
    };
  }
  return undefined;
};

const parseArgumentOfActionMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  const clearValues = () => {
    if (argumentsInAction.length === 0) {
      actionInExpression = undefined;
      totalActionArguments = 0;
      actionInteractor = undefined;
    }
  };
  const forActionInteractor = actionInteractor ? actionInteractor : interactor;
  const argumentType = argumentsInAction.shift();
  const { value: v, offset: o } = member;
  const { value: tv, isNextState } = removeExclamation(v.trim());
  let argType = findValueType(tv, forActionInteractor);
  if (argType === argumentType || (argType === "number" && ranges.has(argumentType.trim()))) {
    clearValues();
    return {
      tokens: [
        {
          offset: o,
          value: v,
          tokenType: !isNaN(+tv) ? "number" : "variable",
          nextState: isNextState,
        },
      ],
      type: argType,
    };
  } else {
    if (tv.charAt(0) === "_") {
      temporaryAttributes.push({
        action: actionInExpression!,
        value: tv,
        index: totalActionArguments - argumentsInAction.length - 1,
      });
      clearValues();
      return {
        tokens: [{ offset: o, value: v, tokenType: "keyword", nextState: false }],
        type: argumentType,
      };
    }
  }
  clearValues();
  return undefined;
};

const parseNumberMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: {
    offset: number;
    value: string;
  },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  const { value: v, offset: o } = member;
  const { value: tv, isNextState } = removeExclamation(v.trim());
  if (
    !isNaN(+tv) ||
    ranges.has(tv) ||
    (attributes.get(interactor)?.has(tv) && attributes.get(interactor)?.get(tv)?.type === "number") ||
    (defines.has(tv) && defines.get(tv)?.type === "number") ||
    findTemporaryType(tv, interactor) === "number"
  ) {
    updateAttributeUsage(tv, interactor);
    return {
      tokens: [
        {
          offset: o,
          value: v,
          tokenType: !isNaN(+tv) ? "number" : findTemporaryType(tv, interactor) === "number" ? "keyword" : "variable",
          nextState: isNextState,
        },
      ],
      type: "number",
    };
  }
  return undefined;
};

const parseTemporaryMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  let tempInfo;
  if ((tempInfo = findTemporaryType(member.value.trim(), interactor))) {
    return {
      tokens: [
        {
          offset: member.offset,
          value: member.value,
          tokenType: "keyword",
          nextState: false,
        },
      ],
      type: tempInfo,
    };
  }
  return undefined;
};

const parseDefinedMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  let definedInfo;
  if ((definedInfo = defines.get(member.value.trim()))) {
    return {
      tokens: [
        {
          offset: member.offset,
          value: member.value,
          tokenType: "macro",
          nextState: false,
        },
      ],
      type: definedInfo.type,
    };
  }
  return undefined;
};

const parseEnumMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  for (var [k, v] of enums) {
    if (v.values.includes(member.value.trim())) {
      return {
        tokens: [
          {
            offset: member.offset,
            value: member.value,
            tokenType: "macro",
            nextState: false,
          },
        ],
        type: k,
      };
    }
  }
  return undefined;
};

const parseAttributeMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  const { value: v, offset: o } = member;
  const { value: tv, isNextState } = removeExclamation(v.trim());
  let attInfo;
  if ((attInfo = attributes.get(interactor)?.get(tv))) {
    updateAttributeUsage(tv, interactor);
    return {
      tokens: [{ offset: o, value: v, tokenType: "variable", nextState: isNextState }],
      type: ranges.has(attInfo.type!) ? "number" : attInfo.type,
    };
  } else if (actions.has(interactor) && actions.get(interactor)!.has(tv)) {
    return {
      tokens: [{ offset: o, value: v, tokenType: "function", nextState: false }],
      type: "action",
    };
  }
  return undefined;
};

const parseBooleanMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  if (member.value.trim().toLowerCase() === "false" || member.value.trim().toLowerCase() === "true") {
    return {
      tokens: [{ offset: member.offset, value: member.value, tokenType: "keyword" }],
      type: "boolean",
    };
  }
  return undefined;
};

export const parseMemberOfRelation = (
  textInfo: { line: string; lineNumber: number; el: string },
  preMember: { value: string; offset: number },
  interactor: string
):
  | {
      tokens: {
        offset: number;
        value: string;
        tokenType: string;
        nextState?: boolean;
        interactor?: string;
      }[];
      type: string | undefined;
    }
  | undefined => {
  const rx = /(\+|\-|\*|\/|\&|\||\-\s*\>)/;
  const splittedMember = splitWithOffset(rx, preMember.value, preMember.offset);
  let possibleRet;
  let type: string | undefined = undefined;
  let toRetTokens: any[] = [];
  const memberParsers = [
    parseActionMember,
    parseGroupForInMember,
    parseAggregatedMember,
    parseArrayMember,
    parseNumberMember,
    parseTemporaryMember,
    parseDefinedMember,
    parseEnumMember,
    parseAttributeMember,
    parseBooleanMember,
  ];
  for (let sm of splittedMember) {
    if (argumentsInAction.length === 0) {
      type = undefined;
      for (let memberParser of memberParsers) {
        if ((possibleRet = memberParser(textInfo, sm, interactor))) {
          type = possibleRet.type;
          toRetTokens = [...toRetTokens, ...possibleRet.tokens];
          break;
        }
      }
    } else if ((possibleRet = parseArgumentOfActionMember(textInfo, sm, interactor))) {
      type = possibleRet.type;
      toRetTokens = [...toRetTokens, ...possibleRet.tokens];
    }
  }

  return { tokens: toRetTokens, type: type };
};

export const compareRelationTokens = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number
):
  | {
      offset: number;
      value: string;
      tokenType: string;
      nextState?: boolean;
      interactor?: string;
    }[]
  | undefined => {
  let indexOfOp;
  offsetForDiags = offset;
  const comparationSymbols = /(\<\s*\=|\>\s*\=|(?<!\-)\s*\>|\<\s*(?!\-)|\=|\!\s*\=|\bin\b)/;
  if (textInfo.el.trim() === "keep") {
    return [{ offset: 0, value: textInfo.el, tokenType: "keyword" }];
  }
  // Check if there is any symbol that might indicate a relation
  if ((indexOfOp = textInfo.el.match(comparationSymbols)) !== null) {
    let offsetForComparation = 0;
    const separated = textInfo.el
      .split(comparationSymbols)
      .map((el) => {
        offsetForComparation += el.length;
        let numberOfSpaces = countSpacesAtStart(el);
        return {
          value: el.trim(),
          offset: offsetForComparation - el.length + numberOfSpaces,
        };
      })
      .filter((el) => !comparationSymbols.test(el.value.trim()) && el.value.trim() !== "");
    if (separated.length === 2) {
      //separate the attribute and the value
      //const preAtt = textInfo.el.slice(0, textInfo.el.indexOf(indexOfOp[0])).trim();
      const preAtt = separated[0];
      const parsedAtt = parseMemberOfRelation(textInfo, preAtt, currentInteractor);
      //get the value
      const preVal = separated[1];
      const parsedVal = parseMemberOfRelation(textInfo, preVal, currentInteractor);

      parseErrorsRelationBetween(
        textInfo.lineNumber,
        preAtt,
        preVal,
        parsedAtt!.type!,
        parsedVal!.type!,
        offsetForDiags
      );

      return [...parsedAtt!.tokens, ...parsedVal!.tokens];
    } else {
      return [...parseMemberOfRelation(textInfo, separated[0], currentInteractor)!.tokens];
    }
  } else {
    return [...parseMemberOfRelation(textInfo, { value: textInfo.el, offset: 0 }, currentInteractor)!.tokens];
  }
  return undefined;
};
