import { IParsedToken } from "./globalParserInfo";

export class ParseSection {
  private findTokens: RegExp;
  private separationSymbols: RegExp;
  private previousSymbols: string;
  private followingSymbols: string;
  private tokenTypeCondition: (s: string, sc: number) => string;
  constructor(
    fTokens: RegExp,
    sSymbols: RegExp,
    pSymbols: string,
    ttc: (s: string, sc: number) => string,
    fSymbols?: string
  ) {
    this.findTokens = fTokens;
    this.separationSymbols = sSymbols;
    this.tokenTypeCondition = ttc;
    this.previousSymbols = pSymbols;
    this.followingSymbols = fSymbols ? fSymbols : "";
  }

  private getPosition(line: string, subString: string, index: number) {
    return line
      .split(
        new RegExp(this.previousSymbols + subString + this.followingSymbols),
        index
      )
      .join(subString).length;
  }

  public getTokens(
    line: string,
    lineNumber: number,
    offset: number,
    aggregatedTokens?: boolean,
    separateTokens?: Function
  ) {
    let x: RegExpExecArray | null;
    // regular expression to check if there are conditions in the axiom
    // checking if there is only one or more variables surrounded by parentheses
    // TODO: check for variables where there are no parentheses but operators exist like "aux = 3"
    const aux = this.findTokens;
    if ((x = aux.exec(line))) {
      if (x) {
        //list of operators
        let rx = this.separationSymbols;
        // separate the matched line into de different components (operators and variables)
        let separatedLine = x[0].trim().split(rx);
        // to return the tokens found in the line
        let tokens: IParsedToken[] = [];
        // map that holds as key the string correspondent to an attribute and as value the last index in which is was seen
        // so that we can later tell the token where the attribute, even if is has multiple occurences
        let mapTokens: Map<string, number> = new Map();
        // loop through each element
        separatedLine.forEach((el) => {
          // check if it not an operator or just spaces
          if (!rx.test(el.trim()) && el.trim() !== "") {
            const trimmedEl = el.trim();
            const tokenForMap =
              trimmedEl[trimmedEl.length - 1] === "'"
                ? trimmedEl.slice(0, trimmedEl.length - 1)
                : trimmedEl;
            // if the element is not already in the map, then we put it
            if (!mapTokens.has(tokenForMap)) {
              mapTokens.set(tokenForMap, 1);
            }
            // find the next index to be considered while parsing the elements from the line
            let nextIndexLine = this.getPosition(
              line,
              tokenForMap,
              mapTokens.get(tokenForMap)!
            );
            if (!aggregatedTokens) {
              tokens.push({
                line: lineNumber,
                startCharacter: nextIndexLine + offset,
                length: trimmedEl.length,
                // to had the token type we check if the element is in the attributes and is a boolean
                tokenType: this.tokenTypeCondition(
                  trimmedEl,
                  nextIndexLine + offset
                ),
                tokenModifiers: [""],
              });
            } else {
              const sepTokens = separateTokens!(trimmedEl);
              if (sepTokens !== undefined) {
                for (let t of sepTokens) {
                  if (t.trim() !== "") {
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
