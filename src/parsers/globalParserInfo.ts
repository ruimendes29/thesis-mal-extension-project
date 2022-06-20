export const sections = new Map<string, boolean>();
export let previousSection = "";
export let actionsStartingLine = new Map<string, number>();
export let attributesStartingLine = new Map<string, number>();
export let currentInteractor = "";
export let typesStartingLine: number | undefined = undefined;
export const attributes = new Map<
  string,
  Map<string, { used: boolean; type: string | undefined; line: number; alone: boolean }>
>();
export const actions = new Map<string, Map<string, { used: boolean; line: number; arguments: string[] }>>();
export const defines = new Map<string, { used: boolean; type: string | undefined; value: string }>();
export const enums = new Map<string, { used: boolean; values: string[]; line: number }>();
export const ranges = new Map<string, { used: boolean; minimum: number; maximum: number }>();
export const arrays = new Map<string, { firstIndex: number; lastIndex: number; type: string }>();
export const actionsToAttributes = new Map<string, Map<string, Map<string, Set<string>>>>();
export const interactorLimits = new Map<string, { start: number; end: number | undefined }>();
export const aggregates = new Map<string, { current: string; included: string }>();

sections.set("attributes", false);
sections.set("types", false);
sections.set("defines", false);
sections.set("interactor", false);
sections.set("importing", false);
sections.set("actions", false);
sections.set("axioms", false);
sections.set("test", false);
sections.set("aggregates", false);

export interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: string;
  tokenModifiers: string[];
}

/**
 * It takes a line of text and a line number and returns a boolean. 
 * If the line is the start of a new section, it updates the current section and returns true. 
 * If the line is not the start of a new section, it returns false.
 * @param {string} line - string - the line of code that is being parsed
 * @param {number} lineNumber - number
 * @returns A boolean.
 */
export const updateSection = (line: string, lineNumber: number): boolean => {
  if (line.trim() === "actions") {
    actionsStartingLine.set(currentInteractor, lineNumber);
    actions.set(currentInteractor,new Map());
  } else if (line.trim() === "attributes") {
    attributes.set(currentInteractor,new Map());
    attributesStartingLine.set(currentInteractor, lineNumber);
  }
  let x: RegExpExecArray | null;
  x = /^\s*interactor\s+[a-zA-Z]+[a-zA-Z\_0-9]*/.exec(line);
  let trimmed;
  if (x) {
    if (currentInteractor !== "") {
      interactorLimits.set(currentInteractor, {
        start: interactorLimits.get(currentInteractor)!.start,
        end: lineNumber - 1,
      });
    }
    trimmed = "interactor";
    currentInteractor = x[0].split(" ").filter((el) => el.trim() !== "")[1];
    interactorLimits.set(currentInteractor, { start: lineNumber, end: undefined });
  } else {
    trimmed = line.trim();
  }
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

/**
 * It checks if a line is a subsection of a section
 * @param {string} line - string - the line of text that we're checking
 * @returns A function that takes a string and returns a boolean.
 */
export const isSubSection = (line: string): boolean => {
  if (
    line.trim() === "attributes" ||
    line.trim() === "actions" ||
    line.trim() === "axioms" ||
    line.trim() === "test" ||
    line.trim() === "aggregates" ||
    line.trim() === "importing"
  ) {
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
    sections.get("aggregates") ||
    sections.get("importing") ||
    sections.get("test")!
  );
};

export const changeTypesLine = (x: number): void => {
  typesStartingLine=x;
};

/**
 * It clears all the data structures that are used to store the data that is parsed from the input file
 */
export const clearStoredValues = () => {
  actionsStartingLine.clear();
  attributesStartingLine.clear();
  actionsToAttributes.clear();
  interactorLimits.clear();
  attributes.clear();
  actions.clear();
  currentInteractor = "";
  aggregates.clear();
  defines.clear();
  ranges.clear();
  arrays.clear();
  typesStartingLine = undefined;
  enums.clear();
  attributes.clear();
  sections.forEach((_v, key) => {
    sections.set(key, false);
  });
};

/**
 * It takes a line number and returns the name of the interactor that contains that line number.
 * @param {number} lineNumber - The line number of the code that you want to get the interactor for.
 * @returns The name of the interactor.
 */
export const getInteractorByLine = (lineNumber: number): string => {
  for (let x of interactorLimits) {
    if (x[1].start <= lineNumber && (x[1].end === undefined || x[1].end! >= lineNumber)) {
      return x[0];
    }
  }
  return "error";
};
