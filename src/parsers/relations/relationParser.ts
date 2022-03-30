import { getArrayInStore, getArrayWrittenInfo } from "../arrayRelations";
import { aggregates, attributes, currentInteractor, defines, enums, ranges } from "../globalParserInfo";
import {
  emitNotAggregatedDiagnostic,
  emitNotANumberDiagnostic,
  emitNotArrayDiagnostic,
  parseErrorsRelationBetween,
} from "./relationErrors";
import { findValueType, findTemporaryType } from "./typeFindes";

let offsetForDiags = 0;
const attributeExists = (attribute: string): boolean => {
  return (
    (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(attribute)) ||
    (attribute.charAt(attribute.length - 1) === "'" &&
      attributes.get(currentInteractor)!.has(attribute.substring(0, attribute.length - 1)))
  );
};

export const parseRangeInput = (preV: string): { value: number; isANumber: boolean } => {
  let v;
  let isANumber = true;
  v = 0;
  const trimmedv = preV.trim();
  if (!isNaN(+trimmedv)) {
    v = trimmedv;
  } else if (defines.has(trimmedv) && defines.get(trimmedv)!.type === "number") {
    v = defines.get(trimmedv)!.value;
    isANumber = false;
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

const splitWithOffset = (rx: RegExp, element: string, offset: number) => {
  let offsetInsideMember = offset;
  const splittedMember = element
    .split(rx)
    .map((el) => {
      offsetInsideMember += el.length;
      return { value: el, offset: offsetInsideMember - el.length };
    })
    .filter((el) => !rx.test(el.value.trim()) && el.value.trim() !== "");
  return splittedMember;
};

const parseArrayMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  if (member.value.includes("[")) {
    const splittedMember = splitWithOffset(/(\[|\])/, member.value, member.offset);
    let index = 0;
    let arrayInfo: { type: any; dimensions: number };
    let toRet: any[] = [];
    const cx = /(?<!\w\s*\[.*)(\+|\-|\*|\/|\&|\||\-\s*\>)/;
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
              nextState: isNextState,
            });
          } else {
            emitNotArrayDiagnostic(textInfo.lineNumber, offsetForDiags + o, v);
            toRet.push({ offset: o, value: v, tokenType: "regexp", nextState: false });
          }
        }
        index++;
      } else {
        if (index < arrayInfo!.dimensions+1) {
          const parsedComplexArgument = parseMemberOfRelation(textInfo, sm, currentInteractor);
          if (parsedComplexArgument?.type === "number") {
            toRet = [...toRet, ...parsedComplexArgument.tokens];
          } else {
            emitNotANumberDiagnostic(textInfo.lineNumber, offsetForDiags + o, v);
            toRet = [{ offset: o, value: v, tokenType: "regexp", nextState: false }, ...parsedComplexArgument!.tokens];
          }
          index++;
        } else {
          toRet = [{ offset: member.offset, value: member.value, tokenType: "regexp", nextState: false }];
          return {tokens:toRet,type:""};
        }
      }
    }

    return { tokens: toRet, type: arrayInfo!.type };
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
        toRet.push({ offset: o, value: v, tokenType: "variable", interactor: aggregates.get(tv)!.current });
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
      tokens: [{ offset: member.offset, value: member.value, tokenType: "keyword", nextState: false }],
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
      tokens: [{ offset: member.offset, value: member.value, tokenType: "macro", nextState: false }],
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
        tokens: [{ offset: member.offset, value: member.value, tokenType: "macro", nextState: false }],
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
      type: attInfo.type,
    };
  }
  return undefined;
};

const parseBooleanMember = (
  textInfo: { line: string; lineNumber: number; el: string },
  member: { offset: number; value: string },
  interactor: string
): { tokens: any[]; type: string | undefined } | undefined => {
  if (member.value.trim() === "false" || member.value.trim() === "true") {
    return { tokens: [{ offset: member.offset, value: member.value, tokenType: "keyword" }], type: "boolean" };
  }
  return undefined;
};

export const parseMemberOfRelation = (
  textInfo: { line: string; lineNumber: number; el: string },
  preMember: { value: string; offset: number },
  interactor: string
):
  | {
      tokens: { offset: number; value: string; tokenType: string; nextState?: boolean; interactor?: string }[];
      type: string | undefined;
    }
  | undefined => {
  const rx = /(?<!\w\s*\[.*)(\+|\-|\*|\/|\&|\||\-\s*\>)/;
  const splittedMember = splitWithOffset(rx, preMember.value, preMember.offset);
  let possibleRet;
  let type: string | undefined = undefined;
  let toRetTokens: any[] = [];
  const memberParsers = [
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
    type = undefined;
    for (let memberParser of memberParsers) {
      if ((possibleRet = memberParser(textInfo, sm, interactor))) {
        type = possibleRet.type;
        toRetTokens = [...toRetTokens, ...possibleRet.tokens];
        break;
      }
    }
  }

  return { tokens: toRetTokens, type: type };
};

export const compareRelationTokens = (
  textInfo: { line: string; lineNumber: number; el: string },
  offset: number
): { offset: number; value: string; tokenType: string; nextState?: boolean; interactor?: string }[] | undefined => {
  let indexOfOp;
  offsetForDiags = offset;
  const comparationSymbols = /(\<\s*\=|\>\s*\=|(?<!\-)\s*\>|\<\s*(?!\-)|\=|\!\s*\=)/;
  if (textInfo.el.trim() === "keep") {
    return [{ offset: 0, value: textInfo.el.trim(), tokenType: "keyword" }];
  }
  // Check if there is any symbol that might indicate a relation
  if ((indexOfOp = textInfo.el.match(comparationSymbols)) !== null) {
    let offsetForComparation = 0;
    const separated = textInfo.el
      .split(comparationSymbols)
      .map((el) => {
        offsetForComparation += el.length;
        return { value: el, offset: offsetForComparation - el.length };
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
    }
  } else {
    return [...parseMemberOfRelation(textInfo, { value: textInfo.el, offset: 0 }, currentInteractor)!.tokens];
  }
  return undefined;
};
