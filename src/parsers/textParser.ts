import { _parseAxioms } from "./axiomParser";
import { _parseDefines } from "./definesParser";
import {
  clearStoredValues,
  IParsedToken,
  isInsideInteractor,
  isSubSection,
  previousSection,
  sections,
  updateSection,
} from "./globalParserInfo";
import { clearDiagnosticCollection } from "../diagnostics/diagnostics";
import { _parseTypes } from "./typesParser";
import { _parseActions } from "./actionsParser";
import { _parseAttributes } from "./attributesParser";
import { checkIfUsed } from "./checkIfUsed";
import { _parseIncludes } from "./includesParser";
import { _parseTest } from "./testParser";
import { _parseImports } from "./importParser";

const mapParsers: Map<
  string,
  (line: string, lineNumber: number) => { tokens: IParsedToken[]; size: number } | undefined
> = new Map();
mapParsers.set("attributes", _parseAttributes);
mapParsers.set("actions", _parseActions);
mapParsers.set("axioms", _parseAxioms);
mapParsers.set("defines", _parseDefines);
mapParsers.set("aggregates", _parseIncludes);
mapParsers.set("types", _parseTypes);
mapParsers.set("test", _parseTest);
mapParsers.set("importing",_parseImports);

export let lineSizes: number[] = [];

/* Simple method to check if a line is an expression or a simple line,
 by checking if it is a number,true or false */

const isNotAnExpression = (line: string) => {
  // get the index of the equal sign, then splitting the line in case there are any comments
  const afterEquals = line
    .slice(line.indexOf("=") + 1)
    .split("#")[0]
    .trim();
  if (!isNaN(+afterEquals) || afterEquals.toUpperCase() === "TRUE" || afterEquals.toUpperCase() === "FALSE") {
    return true;
  }
  return false;
};

export const getCorrectLine = (originalLineNumber: number, lineSizes: number[], offsetOfElem: number) => {
  let newLineNumber = originalLineNumber;
  let newOffset = offsetOfElem;
  for (const s of lineSizes) {
    if (newOffset >= s) {
      newLineNumber++;
      newOffset -= s;
    } else {
      break;
    }
  }
  return { correctLine: newLineNumber, correctOffset: newOffset };
};

// Method for parsing a specific line of the text given the correct parser to use
const parseSpecificPart = (
  parser: (line: string, lineNumber: number) => { tokens: IParsedToken[]; size: number } | undefined,
  tokenArray: IParsedToken[],
  line: string,
  lineNumber: number,
  lineSizes: number[],
  currentOffset: number
) => {
  const parsedSection = parser(line.slice(currentOffset), lineNumber);
  if (parsedSection !== undefined) {
    parsedSection.tokens.forEach((el: IParsedToken) => {
      const updatedWithLines = getCorrectLine(
        el.line - lineSizes.length + (lineSizes.length === 0 ? 0 : 1),
        lineSizes,
        el.startCharacter
      );
      el = { ...el, line: updatedWithLines.correctLine, startCharacter: updatedWithLines.correctOffset };
      tokenArray.push(el);
    });
    currentOffset += parsedSection.size;
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

export const countSpacesAtStart = (line: string): number => {
  let numberOfSpaces = 0;
  for (let letter of line) {
    if (letter === " ") {
      numberOfSpaces++;
    } else {
      break;
    }
  }
  return numberOfSpaces;
};

const isValidLine = (line: string) => {
  return !(line.trim().charAt(0) === "#" || sections.has(line.trim()) || /^\s*interactor/.test(line));
};

export function _parseText(text: string): IParsedToken[] {
  // Array of the parsed tokens
  /* These tokens are objects such as:
  {line: lineNumber, startCharacter: index,length: number,tokenType: string,tokenModifiers: [""]} */
  const r: IParsedToken[] = [];

  // structure to save some lines for post process, in case the information written ahead is relevant
  // the key, is a string that represents the section from which the lines comes
  // the value, is an object composed by the line text itself as well as the line number.
  const lineHolder = new Map<string, { line: string; lineNumber: number; lineSizes: number[] }[]>();

  // in case there is any information in the data structures, these get erased before the text is parsed again
  clearDiagnosticCollection();
  clearStoredValues();
  // splitting the lines
  const lines = text.split(/\r\n|\r|\n/);
  let currentIdentation: number = 0;
  let lineToParseArray: string[] = [];
  //loopn through all lines
  for (let i = 0; i < lines.length; i++) {
    const lineFromLines = lines[i];
    let line = lineFromLines;

    if (line.trim().charAt(0) === "#" || line.trim() === "") {
      r.push({
        line: i,
        startCharacter: 0,
        length: line.length,
        tokenType: "comment",
        tokenModifiers: [""],
      });
      continue;
    }

    lineToParseArray.push(line);
    lineSizes.push(line.length);
    if (i < lines.length - 1 && isValidLine(line) && isValidLine(lines[i + 1])) {
      const lineIdentation: number = countSpacesAtStart(lines[i + 1]);
      currentIdentation = countSpacesAtStart(line);
      if (lineIdentation > currentIdentation) {
        currentIdentation = lineIdentation;
        continue;
      } else {
        line = lineToParseArray.join("");
        currentIdentation = 0;
        lineToParseArray = [];
      }
    } else {
      line = lineToParseArray.join("");
      lineToParseArray = [];
      currentIdentation = 0;
    }

    //variable to represent the current offset to be considered when parsing the line
    let currentOffset = 0;

    // Checking if the line represents a special section (ex: actions, axioms...), but its not inside an interactor
    // so that an error can be emitted to the user
    // TODO: currently only change the color of the text, need to add error
    if (isSubSection(line.trim()) && !isInsideInteractor()) {
      r.push({
        line: i,
        startCharacter: 0,
        length: line.length,
        tokenType: "regexp",
        tokenModifiers: [""],
      });
      //break while
      lineSizes = [];
      continue;
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
              const { line:dl, lineNumber:dln, lineSizes:dls } = definesLinesHeld[x];
              currentOffset = 0;
              if (
                (currentOffset = parseSpecificPart(
                  _parseDefines,
                  r,
                  dl,
                  dln,
                  dls,
                  0
                )!)
              ) {
              } else {
                //break for
                break;
              }
            }
            // clearing the lines held for defines
            lineHolder.set("defines", []);
            currentOffset = 0;
          }
        }
        //break while
        lineSizes = [];
        continue;
      } else {
        // A simple to switch for dealing with different sections
        const session = getActiveSection();
        if (session === "defines" && !isNotAnExpression(line)) {
          if (!lineHolder.has("defines")) {
            lineHolder.set("defines", []);
          }
          lineHolder.get("defines")!.push({ line: line, lineNumber: i, lineSizes: [...lineSizes] });
          // break while
          lineSizes = [];
          continue;
        } else {
          currentOffset = parseSpecificPart(mapParsers.get(session.trim())!, r, line, i, lineSizes, currentOffset)!;
        }
        lineSizes = [];
        //break while
        continue;
      }
    }
  }
  checkIfUsed(lines);
  return r;
}
 