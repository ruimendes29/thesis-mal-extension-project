import { addDiagnostic } from "../diagnostics/diagnostics";
import { actions, attributes, currentInteractor, interactorLimits } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

const notUsed = (lines: string[], variable: string, info: { used: boolean; line: number }) => {
  if (!info.used) {
    const l = info.line;
    const sc = ParseSection.getPosition(lines[l], variable, 1);
    addDiagnostic(l, sc, l, sc + variable.length, variable + " was never used!", "warning", "NOTHING");
  }
};

export const checkIfUsed = (lines: string[]) => {
  for (let y of interactorLimits) {
    if (actions.has(y[0])) {
      for (let x of actions.get(y[0])!) {
        notUsed(lines, x[0], { used: x[1].used, line: x[1].line });
      }
    }
    if (attributes.has(y[0])) {
      for (let x of attributes.get(y[0])!) {
        notUsed(lines, x[0], { used: x[1].used, line: x[1].line });
      }
    }
  }
};
