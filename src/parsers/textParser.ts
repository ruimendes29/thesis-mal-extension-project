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
  console.log(attributes);
  console.log(actions);
  return r;
}
