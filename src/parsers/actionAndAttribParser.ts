import { actions, attributes, IParsedToken, sections } from "./globalParserInfo";

const _checkForVisTag = (
    line: string,
    i: number
  ): { r: IParsedToken; nextOffset: number } | undefined => {
    let x: RegExpExecArray | null;
    const rx = /^\s*\[\s*vis\s*\]/;
    x = rx.exec(line);
    if (x) {
      return {
        r: {
          line: i,
          startCharacter: x[0].indexOf("vis"),
          length: 3,
          tokenType: "keyword",
          tokenModifiers: [],
        },
        nextOffset: x[0].length,
      };
    } else {
      return undefined;
    }
  };
  

export const _parseVariables = (
    line: string,
    currentOffset: number,
    i: number
  ): { foundToken: IParsedToken; nextOffset: number } | undefined => {
    // Check if the line contains the vis tag for that variable
    const parserBracketResult = _checkForVisTag(line.slice(currentOffset), i);
    if (parserBracketResult !== undefined) {
      return {
        foundToken: parserBracketResult.r!,
        nextOffset: parserBracketResult.nextOffset,
      };
    } else {
      // checks if we are inside the attributes or actions sub section of the interactor
      if (sections.get("attributes") || sections.get("actions")) {
        //check if there are any variables to be parsed in that line, if so
        // they are added to the attributes or actions map.
        const pv = _parseVariable(
          line.slice(currentOffset),
          sections.get("attributes") ? "attributes" : "actions"
        );
        // if found something
        if (pv !== undefined) {
          if (sections.get("attributes")) {
            attributes.set(pv.variableName, {
              used: false,
              type: pv.attributeType,
              line: i
            });
          } else {
            actions.set(pv.variableName, false);
          }
  
          return {
            foundToken: {
              line: i,
              startCharacter: currentOffset,
              length: pv.size,
              tokenType: pv.tokenType,
              tokenModifiers: pv.tokenModifiers,
            },
            nextOffset: currentOffset + pv.size + 1,
          };
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  };
  
  // function responsible for parsing each individual variable written in attributes or actions
  const _parseVariable = (
    text: string,
    type: string
  ):
    | {
        size: number; // the size of the token
        tokenType: string;
        tokenModifiers: string[];
        variableName: string; // the real name of the variable to be stored
        attributeType: string | undefined; // the type of the attribute (undefined if refering to an action)
      }
    | undefined => {
    let x: RegExpExecArray | null;
    // regex to match attributes, which means they have to have either : or , in front of them
    const forAttributes: RegExp = /^\s*[a-zA-Z]+[a-zA-Z\_0-9]*\s*(?=(:|,))/;
    // get the type of the attributes
    const getAttributesType: RegExp =
      /(?<=:)\s*[a-zA-Z]+[a-zA-Z\_0-9]*(?=\s*($|#))/;
    // get the actions, these must be separated into different lines
    const forActions: RegExp = /^\s*[a-zA-Z]+[a-zA-Z\_0-9]*\s*(?=(#|$))/;
    if ((x = (type === "attributes" ? forAttributes : forActions).exec(text))) {
      if (x) {
        let attributeType: RegExpExecArray | null;
        attributeType =
          type === "attributes" ? getAttributesType.exec(text) : null;
        return {
          size: x[0].length,
          tokenType: type === "attributes" ? "variable" : "method",
          tokenModifiers: [""],
          variableName: x[0].trim(),
          attributeType:
            attributeType !== null && attributeType !== undefined
              ? attributeType[0].trim()
              : undefined,
        };
      }
    }
    return undefined;
  };