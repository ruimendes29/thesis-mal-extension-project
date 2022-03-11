import {
  addDiagnostic,
  DECLARE_ACTION,
} from "../diagnostics/diagnostics";
import { actions, actionsToAttributes, attributes, enums, IParsedToken } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";
import { compareRelationTokens } from "./relationParser";

let triggerAction:string [] = [];
const setOfAttributesAttended:Set<string> = new Set();

const parseConditions = (line: string, lineNumber: number) => {
  const toFindTokens = /^.*(?=\s*\<?\-\>\s*\[)/;
  const toSeparateTokens = /(\&|\||\)|\(|\!)/;

  const parseConditionsSection: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    return "cantprint";
  });

  return parseConditionsSection.getTokens(line, lineNumber, 0, true, compareRelationTokens);
};

const parseTriggerAction = (line: string, lineNumber: number) => {
  const toFindTokens = /(\<?\s*\-\>\s*)?\[[^\[]+\]/;
  const toSeparateTokens = /(\(|\)|\-|\>|\<|\&|\||\!|\[|\])/;
  const parseTriggerActions: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (actions.has(el)) {
      triggerAction.push(el);
      const prevAction = actions.get(el)!;
      actions.set(el,{used:true,line:prevAction.line});
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
  return parseTriggerActions.getTokens(line, lineNumber, 0);
};

const parsePer = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=^\s*per\s*\().+(?=\))/;
  const toSeparateTokens = /(\(|\)|\||\&|\!)/;
  const parsePers: ParseSection = new ParseSection(toFindTokens, toSeparateTokens, (el, sc) => {
    if (actions.has(el)) {
      const prevAction = actions.get(el)!;
      actions.set(el,{used:true,line:prevAction.line});
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

const filterAttribute = (isInKeep:boolean,s:string) => {
  if (isInKeep)
  {
    if (s.indexOf("'")<0)
      {return "keep "+s;}
  }
  else {
    if (s.indexOf("!")===0)
    {
      s = s.slice(1);
    }
    if (s.indexOf("'")===s.length-1)
    {
      s = s.slice(0,s.length-1);
      return s;
    }
    return "";
  }
};

const parseNextState = (line: string, lineNumber: number) => {
  const toFindTokens = /(?<=(\]|^per\s*\(.*\)\s*\<?\-\>)).*/;
  const toSeparateTokens = /(\&|\||\)|\(|\,)/;
  let isInKeep = false;
  const parseConditionsSection: ParseSection = new ParseSection(
    toFindTokens,
    toSeparateTokens,
    (el, sc) => {
      const isNextState:boolean = el.split(":")[1]==="true";
      if (el.split(":")[0] === "keep")
      {
        isInKeep=true;
        return "";
      }
      if (isInKeep || isNextState)
      {
        if(lineNumber===68)
        {
          console.log(el);
        }
        setOfAttributesAttended.add(el.split(":")[0]);
      }

      return "cantprint";
    }
  );
  const perRegex = /^\s*per\s*\(\s*\w*\s*\)\s*\-\s*\>/;
  const correctOffset =
    line.indexOf("]") > 0 ? line.indexOf("]") : line.match(perRegex) !== null ? line.match(perRegex)![0].length : 0;
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
    parseConditions,
    parseTriggerAction,
    parsePer,
    parseNextState,
  ];

  const lineWithoutComments = line.indexOf("#") >= 0 ? line.slice(0, line.indexOf("#")) : line;
    triggerAction=[];
    setOfAttributesAttended.clear();
    for (const parser of sectionsToParseParsers) {
      const matchedPiece = parser(lineWithoutComments, lineNumber);
      if (matchedPiece && matchedPiece.size > 0) {
        toRetTokens = [...toRetTokens, ...matchedPiece.tokens];
        size += matchedPiece.size;
        currentOffset += matchedPiece.size;
      }
      if (setOfAttributesAttended.size>0)
      {
        for (let act of triggerAction)
         {
           if (!actionsToAttributes.has(act))
           {
             actionsToAttributes.set(act,new Set());
           }
          actionsToAttributes.set(act,new Set([...actionsToAttributes.get(act)!,...setOfAttributesAttended]));
         }
        
      }
    }
  if (size === 0) {
    return undefined;
  } else {
    return { tokens: toRetTokens, size: size };
  }
};
