import { _parseAxioms } from "./axiomParser";
import { _parseDefines } from "./definesParser";
import {
  actionsToAttributes,
  arrays,
  attributes,
  clearStoredValues,
  IParsedToken,
  isInsideInteractor,
  isSubSection,
  previousSection,
  sections,
  updateSection,
} from "./globalParserInfo";
import { addDiagnostic, clearDiagnosticCollection } from "../diagnostics/diagnostics";
import { _parseTypes } from "./typesParser";
import { _parseActions } from "./actionsParser";
import { _parseAttributes } from "./attributesParser";
import { ParseSection } from "./ParseSection";
import { checkIfUsed } from "./checkIfUsed";

/* Simple method to check if a line is an expression or a simple line,
 by checking if it is a number,true or false */

const isNotAnExpression = (line: string) => {
  // get the index of the equal sign, then splitting the line in case there are any comments
  const afterEquals = line
    .slice(line.indexOf("=") + 1)
    .split("#")[0]
    .trim();
  if (!isNaN(+afterEquals) || afterEquals === "true" || afterEquals === "false") {
    return true;
  }
  return false;
};

// Method for parsing a specific line of the text given the correct parser to use
const parseSpecificPart = (
  parser: Function,
  tokenArray: IParsedToken[],
  line: string,
  lineNumber: number,
  currentOffset: number
) => {
  const parsedDefines = parser(line.slice(currentOffset), lineNumber);
  if (parsedDefines !== undefined) {
    parsedDefines.tokens.forEach((el: IParsedToken) => {
      tokenArray.push(el);
    });
    currentOffset += parsedDefines.size;
    return currentOffset;
  }
  return undefined;
};

// Method that loops through all sections and checks which one is currently set to true
// meaning that that section is the one active
// ex: x[0] = "attributes" & x[1] = true => return "attributes"
const getActiveSection = () => {
  for (let x of sections) {
    if (x[1]) {
      return x[0];
    }
  }
  return "none";
};

export function _parseText(text: string): IParsedToken[] {
  getActiveSection();
  // Array of the parsed tokens
  /* These tokens are objects such as:
  {line: lineNumber, startCharacter: index,length: number,tokenType: string,tokenModifiers: [""]} */
  const r: IParsedToken[] = [];

  // structure to save some lines for post process, in case the information written ahead is relevant
  // the key, is a string that represents the section in from where the lines come
  // the value, is an object composed by the line text itself as well as the line number.
  const lineHolder = new Map<string, { line: string; lineNumber: number }[]>();

  // in case there is any information in the data structures, these get erased before the text is parsed again
  clearDiagnosticCollection();
  clearStoredValues();
  // splitting the lines
  const lines = text.split(/\r\n|\r|\n/);

  //loopn through all lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    //variable to represent the current offset to be considered when parsing the line
    let currentOffset = 0;

    do {
      // Checking if the line represents a special section (ex: actions, axioms...), but its not inside an interactor
      // so that an error can be emitted to the user
      // TODO: currently only change the color of the text, need to add error
      // TODO: being able to check if attributes and actions are used anywhere on the text
      if (isSubSection(line.trim()) && !isInsideInteractor()) {
        r.push({
          line: i,
          startCharacter: 0,
          length: line.length,
          tokenType: "regexp",
          tokenModifiers: [""],
        });
        break;
      } else {
        // the update section is called in order to specificy in which part of the text we are currently in,
        // as well as giving the information if the current line represent a change of section
        const isNewSection = updateSection(line, i);
        // in case there is a change of section
        if (isNewSection) {
          /* If the previous section is "attributes" than, the defines can be processed,
          atleast those that are not simple, and require the information of which attributes where defined
          inside the interactors */
          if (previousSection === "attributes") {
            const definesLinesHeld = lineHolder.get("defines");
            if (definesLinesHeld !== undefined) {
              for (let x = 0; x < definesLinesHeld.length; x++) {
                const { line, lineNumber } = definesLinesHeld[x];
                currentOffset = 0;
                if (
                  (currentOffset = parseSpecificPart(
                    _parseDefines,
                    r,
                    line.slice(currentOffset),
                    lineNumber,
                    currentOffset
                  )!)
                ) {
                } else {
                  break;
                }
              }
              // clearing the lines held for defines
              lineHolder.set("defines", []);
              currentOffset = 0;
            }
          }
          break;
        } else {
          // A simple to switch for dealing with different sections
          switch (getActiveSection()) {
            case "types":
              if ((currentOffset = parseSpecificPart(_parseTypes, r, line, i, currentOffset)!)) {
              } else {
                break;
              }
              break;
            case "defines":
              if (isNotAnExpression(line)) {
                if ((currentOffset = parseSpecificPart(_parseDefines, r, line, i, currentOffset)!)) {
                } else {
                  break;
                }
              } else {
                if (!lineHolder.has("defines")) {
                  lineHolder.set("defines", []);
                }
                lineHolder.get("defines")!.push({ line: line, lineNumber: i });
                break;
              }
              break;
              case "axioms":
                if ((currentOffset = parseSpecificPart(_parseAxioms, r, line, i, currentOffset)!)) {
                } else {
                  break;
                }
                break;
              case "actions":
              if ((currentOffset = parseSpecificPart(_parseActions, r, line, i, currentOffset)!)) {
              } else {
                break;
              }
              break;
              case "attributes":
              if ((currentOffset = parseSpecificPart(_parseAttributes, r, line, i, currentOffset)!)) {
              } else {
                break;
              }
              break;
              default: break;
          }
          break;
        }
      }
    } while (true);

  }
  console.log(arrays);
  checkIfUsed(lines);
  return r;
}
