import { _parseAxioms } from "./axiomParser";
import { _parseVariables } from "./actionAndAttribParser";
import { _parseDefines } from "./definesParser";
import {
  actions,
  attributes,
  IParsedToken,
  isInsideInteractor,
  isSubSection,
  previousSection,
  ranges,
  sections,
  updateSection,
} from "./globalParserInfo";
import { clearDiagnosticCollection } from "../diagnostics/diagnostics";
import { _parseTypes } from "./typesParser";

const isNotAnExpression = (line: string) => {
  const afterEquals = line
    .slice(line.indexOf("=") + 1)
    .split("#")[0]
    .trim();
  if (
    !isNaN(+afterEquals) ||
    afterEquals === "true" ||
    afterEquals === "false"
  ) {
    return true;
  }
  return false;
};

export function _parseText(text: string): IParsedToken[] {
  const r: IParsedToken[] = [];
  const lineHolder = new Map<string, { line: string; lineNumber: number }[]>();
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
        const isNewSection = updateSection(line,i);
        if (isNewSection) {
          if (previousSection === "attributes") {
            const definesLinesHeld = lineHolder.get("defines");
            if (definesLinesHeld !== undefined) {
              for (let x = 0; x < definesLinesHeld.length; x++) {
                currentOffset = 0;
                const parsedDefines = _parseDefines(
                  definesLinesHeld[x].line.slice(currentOffset),
                  definesLinesHeld[x].lineNumber
                );
                if (parsedDefines !== undefined) {
                  parsedDefines.tokens.forEach((el) => {
                    r.push(el);
                  });
                  currentOffset += parsedDefines.size;
                } else {
                  break;
                }
              }
              lineHolder.set("defines", []);
              currentOffset = 0;
            }
          }
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
          /* The lines need to be stored in order to process them later
          (after the attributes were defined)*/
          if (isNotAnExpression(line)) {
            const parsedDefines = _parseDefines(line.slice(currentOffset), i);
            if (parsedDefines !== undefined) {
              parsedDefines.tokens.forEach((el) => {
                r.push(el);
              });
              currentOffset += parsedDefines.size;
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
