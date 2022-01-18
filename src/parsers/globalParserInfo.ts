export const sections = new Map<string, boolean>();
export const attributes = new Map<
  string,
  { used: boolean; type: string | undefined }
>();
export const actions = new Map<string, boolean>();
export const defines = new Map<
  string,
  { used: boolean; type: string | undefined }
>();

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

export const updateSection = (line: string): boolean => {
  let x: RegExpExecArray | null;
  x = /^\s*interactor\s+[a-zA-Z]+[a-zA-Z\_0-9]*/.exec(line);
  const trimmed = x ? "interactor" : line.trim();
  if (sections.has(trimmed)) {
    sections.forEach((_value, key) => {
      sections.set(key, false);
    });
    sections.set(trimmed, true);
    return true;
  } else {
    return false;
  }
};

export const isSubSection = (line: string): boolean => {
  if (
    line.trim() === "attributes" ||
    line.trim() === "actions" ||
    line.trim() === "axioms" ||
    line.trim() === "test"
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
    sections.get("test")!
  );
};

export const clearStoredValues = () => {
  attributes.clear();
  sections.forEach((_v, key) => {
    sections.set(key, false);
  });
};
