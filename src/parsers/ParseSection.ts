import { IParsedToken } from "./globalParserInfo";

export class ParseSection {
  // Regular expression that represent the tokens that need to be found as a whole
  private findTokens: RegExp;
  // Regular expression through which to separate the main match
  private separationSymbols: RegExp;
  // Method that receives a string and the start character and return the token type (as defined in extension.ts)
  private tokenTypeCondition: (s: string, sc: number) => string;

  /* Constructor with the findTokens, separationSymbols and the tokenTypeCondition function */
  constructor(
    fTokens: RegExp,
    sSymbols: RegExp,
    ttc: (s: string, sc: number) => string
  ) {
    this.findTokens = fTokens;
    this.separationSymbols = sSymbols;
    this.tokenTypeCondition = ttc;
  }

  /* Method to find the index where a given occurance of a substring starts in the main string */
  public static getPosition(line: string, subString: string, index: number) {
    // special characters that need to be escaped in regular expressions
    const toEscape = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;

    // see if there are any characters in the line that need to be escaped and if so, do it
    const escapedSub = subString
      .split("")
      .map((el) => {
        if (toEscape.test(el)) {
          return "\\" + el;
        } else {
          return el;
        }
      })
      .join("");

    // check if the regular expression contains escaped characters, and in case it does
    // there is no need to add the \b (bounded) symbol to the regular expression 
    const regex = !toEscape.test(escapedSub) ? "\\b" + subString + "\\b" : escapedSub;
    return line.split(new RegExp(regex), index).join(subString).length;
  }

  public getTokens(
    line: string,
    lineNumber: number,
    offset: number,
    aggregatedTokens?: boolean,
    separateTokens?: Function
  ) {
    let x: RegExpExecArray | null;
    
    // check if any match can be found the sliced line with the findTokens RegExp
    if ((x = this.findTokens.exec(line.slice(offset)))) {
      // In case there was a match:
      if (x) {
        //alias for separationSymbols
        let ss = this.separationSymbols;
        // separate the matched line into de different elements through the separationSymbols
        let separatedLine = x[0].trim().split(ss);
        // to return the tokens found in the line
        let tokens: IParsedToken[] = [];
        // map that holds as key the string correspondent to an element and as value the occurance number,
        // so that we can later tell the token where the attribute is, even if it has multiple occurences
        let mapTokens: Map<string, number> = new Map();
        // loop through each element
        separatedLine.forEach((el) => {
          // check if the element is not an operator or just spaces
          if (!ss.test(el.trim()) && el.trim() !== "") {
            const trimmedEl = el.trim();
            const tokenForMap =
              trimmedEl[trimmedEl.length - 1] === "'"
                ? trimmedEl.slice(0, trimmedEl.length - 1)
                : trimmedEl.indexOf("=") > 0
                ? trimmedEl.slice(0, trimmedEl.indexOf("=") + 1)
                : trimmedEl;
            // if the element is not already in the map, then we put it
            if (!mapTokens.has(tokenForMap)) {
              mapTokens.set(tokenForMap, 1);
            }
            // find the next index to be considered while parsing the elements from the line
            let nextIndexLine = ParseSection.getPosition(line.slice(offset), tokenForMap, mapTokens.get(tokenForMap)!);
            if (!aggregatedTokens) {
              tokens.push({
                line: lineNumber,
                startCharacter: nextIndexLine + offset,
                length: trimmedEl.length,
                // to had the token type we check if the element is in the attributes and is a boolean
                tokenType: this.tokenTypeCondition(trimmedEl, nextIndexLine + offset),
                tokenModifiers: [""],
              });
            } else {
              const sepTokens = separateTokens!(trimmedEl, line, lineNumber, offset);
              if (sepTokens !== undefined) {
                for (let t of sepTokens) {
                  this.tokenTypeCondition(t.value+":"+t.nextState,nextIndexLine+offset);
                  tokens.push({
                    line: lineNumber,
                    startCharacter: nextIndexLine + offset + t.offset,
                    length: t.value.length,
                    tokenType: t.tokenType,
                    tokenModifiers: [""],
                  });
                }
              }
            }

            // update the index in the mapTokens
            mapTokens.set(tokenForMap, mapTokens.get(tokenForMap)! + 1);
          }
        });
        return { tokens: tokens, size: x[0].length };
      } else {
        return undefined;
      }
    }
  }
}
