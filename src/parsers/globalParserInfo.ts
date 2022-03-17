export const sections = new Map<string, boolean>();
export let previousSection = "";
export let actionsStartingLine = new Array<number>();
export let attributesStartingLine = new Array<number>();
export const attributes = new Map<string, { used: boolean; type: string | undefined; line: number, alone: boolean }>();
export const actions = new Map<string, {used:boolean,line:number,arguments:string[]}>();
export const defines = new Map<string, { used: boolean; type: string | undefined; value: string }>();
export const enums = new Map<string, { used: boolean; values: string[] }>();
export const ranges = new Map<string, { used: boolean; minimum: number; maximum: number }>();
export const arrays = new Map<string, {firstIndex:number;lastIndex:number;type:string} >();
export const actionsToAttributes = new Map<string,Set<string>>();

sections.set("attributes", false);
sections.set("types", false);
sections.set("defines", false);
sections.set("interactor", false);
sections.set("actions", false);
sections.set("axioms", false);
sections.set("test", false);

export interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: string;
  tokenModifiers: string[];
}

export const updateSection = (line: string, lineNumber: number): boolean => {
  if (line.trim() === "actions") {
    actionsStartingLine.push(lineNumber);
  }
  else if (line.trim()==="attributes"){
    attributesStartingLine.push(lineNumber);
  }
  let x: RegExpExecArray | null;
  x = /^\s*interactor\s+[a-zA-Z]+[a-zA-Z\_0-9]*/.exec(line);
  const trimmed = x ? "interactor" : line.trim();
  if (sections.has(trimmed)) {
    sections.forEach((value, key) => {
      if (value) {
        previousSection = key;
      }
      sections.set(key, false);
    });
    sections.set(trimmed, true);
    return true;
  } else {
    return false;
  }
};

export const isSubSection = (line: string): boolean => {
  if (line.trim() === "attributes" || line.trim() === "actions" || line.trim() === "axioms" || line.trim() === "test") {
    return true;
  } else {
    return false;
  }
};

export const isInsideInteractor = (): boolean => {
  return (
    sections.get("interactor") ||
    sections.get("attributes") ||
    sections.get("actions") ||
    sections.get("axioms") ||
    sections.get("test")!
  );
};

export const clearStoredValues = () => {
  actionsStartingLine = [];
  attributesStartingLine = [];
  actionsToAttributes.clear();
  attributes.clear();
  actions.clear();
  defines.clear();
  enums.clear();
  attributes.clear();
  sections.forEach((_v, key) => {
    sections.set(key, false);
  });
};
