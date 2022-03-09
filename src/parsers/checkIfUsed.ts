import { addDiagnostic } from "../diagnostics/diagnostics";
import { actions, attributes } from "./globalParserInfo";
import { ParseSection } from "./ParseSection";

const notUsed=(lines:string[],variable:string,info:{used:boolean,line:number})=>{
    if (!info.used)
        {
          const l = info.line;
          const sc = ParseSection.getPosition(lines[l],variable,1);
          addDiagnostic(l,sc,l,sc+variable.length,variable+" was never used!","warning","NOTHING");
        }
};

export const checkIfUsed = (lines : string[]) => {
    for (let x of actions)
    {
        notUsed(lines,x[0],{used:x[1].used,line:x[1].line});
    }
    for (let x of attributes) {
        notUsed(lines,x[0],{used:x[1].used,line:x[1].line});
      }
};