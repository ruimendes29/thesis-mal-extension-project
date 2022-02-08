import { _parseAxioms } from "./axiomParser";
import { _parseVariables } from "./actionAndAttribParser";
import { _parseDefines } from "./definesParser";
import {
  actions,
  attributes,
  IParsedToken,
  isInsideInteractor,
  isSubSection,
  sections,
  updateSection,
} from "./globalParserInfo";
import { clearDiagnosticCollection } from "../diagnostics/diagnostics";
import { _parseTypes } from "./typesParser";

//ToDo: need to find a way to suit the code in this function in order to reduce duplicated code
/*const parseSection = (
  section: string,
  parser: Function,
  line: string,
  currentOffset: number,
  lineNumber: number,
  tokensArray: IParsedToken[]
): boolean => {
  if (sections.get(section)) {
    const parsedSection = parser(line.slice(currentOffset), lineNumber);
    if (parsedSection !== undefined) {
      parsedSection.tokens.forEach((el: IParsedToken) => {
        tokensArray.push(el);
      });
      currentOffset += parsedSection.size;
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};*/

export function _parseText(text: string): IParsedToken[] {
  const r: IParsedToken[] = [];
  clearDiagnosticCollection();
  const lines = text.split(/\r\n|\r|\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let currentOffset = 0;
    do {
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
        const isNewSection = updateSection(line);
        if (isNewSection) {
          break;
        } else if (sections.get("types")) {
          const parsedTypes = _parseTypes(line.slice(currentOffset), i);
          if (parsedTypes !== undefined) {
            parsedTypes.tokens.forEach((el) => {
              r.push(el);
            });
            currentOffset += parsedTypes.size;
          } else {
            break;
          }
        } else if (sections.get("defines")) {
          const parsedDefines = _parseDefines(line.slice(currentOffset), i);
          if (parsedDefines !== undefined) {
            parsedDefines.tokens.forEach((el) => {
              r.push(el);
            });
            currentOffset += parsedDefines.size;
          } else {
            break;
          }
        } else if (sections.get("attributes") || sections.get("actions")) {
          const parsedVariables = _parseVariables(line, currentOffset, i);
          if (parsedVariables === undefined) {
            break;
          } else {
            r.push(parsedVariables.foundToken);
            currentOffset = parsedVariables.nextOffset;
          }
        } else if (sections.get("axioms")) {
          const parsedAxiom = _parseAxioms(line.slice(currentOffset), i);
          if (parsedAxiom !== undefined) {
            parsedAxiom.tokens.forEach((el) => {
              r.push(el);
            });
            currentOffset += parsedAxiom.size;
          } else {
            break;
          }

          break;
        } else {
          break;
        }
      }
    } while (true);
  }
  return r;
}
