import { temporaryAttributes } from "../axiomParser";
import { actions, ranges, attributes, defines, enums } from "../globalParserInfo";

export const findTemporaryType = (s: string,interactor: string): string | undefined => {
  let ta = undefined;
  for (let i = 0; i < temporaryAttributes.length; i++) {
    if (temporaryAttributes[i].value === s) {
      const args = actions.get(interactor)!.get(temporaryAttributes[i].action)!.arguments;
      ta = args[temporaryAttributes[i].index];
      if (
        ranges.has(ta) ||
        (attributes.get(interactor)!.has(ta) && attributes.get(interactor)!.get(ta)!.type === "number")
      ) {
        return "number";
      } else {
        return ta;
      }
    }
  }
  return undefined;
};

export const findValueType = (value: string,interactor:string): string | undefined => {
  const correctValue = value[value.length - 1] === "'" ? value.slice(0, value.length - 1) : value;
  if (value === "true" || value === "false") {
    return "boolean";
  } else if (!isNaN(+value) && value !== "") {
    // check if value is a number
    return "number";
  } else if (defines.has(value)) {
    return defines.get(value)!.type;
  } else if (
    attributes.has(interactor) &&
    attributes.get(interactor)!.has(value) &&
    ranges.has(attributes.get(interactor)!.get(value)!.type!)
  ) {
    return "number";
  } else if (attributes.has(interactor) && attributes.get(interactor)!.has(correctValue)) {
    return attributes.get(interactor)!.get(correctValue)!.type;
  } else {
    for (var [k, v] of enums) {
      if (v.values.includes(value)) {
        return k;
      }
    }
  }
  return findTemporaryType(value.trim(),interactor);
};
