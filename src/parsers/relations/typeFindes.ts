import { getArrayWrittenInfo, getArrayInStore } from "../arrayRelations";
import { temporaryAttributes } from "../axiomParser";
import { actions, currentInteractor, ranges, attributes, defines, enums, aggregates } from "../globalParserInfo";
import { parseAggregatesValue } from "../includesParser";

export const findAggregatedValueType = (s: string) => {
  let offsetPoints = 0;
  const splitByPoints = s
    .split(/(\.)/)
    .map((el) => {
      offsetPoints += el.length;
      return { value: el, offset: offsetPoints - el.length };
    })
    .filter((el) => el.value.trim() !== "" && !el.value.includes("."));
  let current = currentInteractor;
  let typeToRet: string | undefined = "";
  if (splitByPoints.length > 1) {
    for (let x of splitByPoints) {
      const xt = x.value.trim();
      if (aggregates.has(xt) && aggregates.get(xt)!.current === current) {
        current = aggregates.get(xt)!.included;
      } else if (attributes.has(current) && attributes.get(current)!.has(xt)) {
        typeToRet = attributes.get(current)!.get(xt)!.type;
        break;
      } else {
        typeToRet = undefined;
        break;
      }
    }
    return typeToRet;
  }

  return undefined;
};

export const findTemporaryType = (s: string): string | undefined => {
  let ta = undefined;
  for (let i = 0; i < temporaryAttributes.length; i++) {
    if (temporaryAttributes[i].value === s) {
      const args = actions.get(currentInteractor)!.get(temporaryAttributes[i].action)!.arguments;
      ta = args[temporaryAttributes[i].index];
      if (
        ranges.has(ta) ||
        (attributes.get(currentInteractor)!.has(ta) && attributes.get(currentInteractor)!.get(ta)!.type === "number")
      ) {
        return "number";
      } else {
        return ta;
      }
    }
  }
  return undefined;
};

export const findValueType = (value: string): string | undefined => {
  const correctValue = value[value.length - 1] === "'" ? value.slice(0, value.length - 1) : value;
  if (value === "true" || value === "false") {
    return "boolean";
  } else if (!isNaN(+value) && value !== "") {
    // check if value is a number
    return "number";
  } else if (defines.has(value)) {
    return defines.get(value)!.type;
  } else if (
    attributes.has(currentInteractor) &&
    attributes.get(currentInteractor)!.has(value) &&
    ranges.has(attributes.get(currentInteractor)!.get(value)!.type!)
  ) {
    return "number";
  } else if (attributes.has(currentInteractor) && attributes.get(currentInteractor)!.has(correctValue)) {
    return attributes.get(currentInteractor)!.get(correctValue)!.type;
  } else {
    for (var [k, v] of enums) {
      if (v.values.includes(value)) {
        return k;
      }
    }
  }
  return findTemporaryType(value.trim());
};

export const isAttributeSameAsValue = (attribute: string, value: string): boolean => {
  if (attribute.includes(".")) {
    const aggAttType = findAggregatedValueType(attribute);
    let aggValType;
    if (value.includes(".")) {
      aggValType = findAggregatedValueType(value);
    } else {
      aggValType = findValueType(value);
    }
    if (aggAttType && aggValType) {
      return aggAttType === aggValType;
    } else {
      return false;
    }
  } else if (attribute.charAt(0) === "_") {
    return (
      temporaryAttributes.map((el) => el.value).includes(attribute) && findValueType(attribute) === findValueType(value)
    );
  } else if (attribute.includes("]") || attribute.includes("[")) {
    const { arrayName } = getArrayWrittenInfo(attribute);
    const { type } = getArrayInStore(arrayName);
    return type === findValueType(value);
  } else {
    return (
      attributes.has(currentInteractor) &&
      attributes.get(currentInteractor)!.has(attribute) &&
      (attributes.get(currentInteractor)!.get(attribute)!.type === findValueType(value) ||
        (ranges.has(attributes.get(currentInteractor)!.get(attribute)!.type!) && findValueType(value) === "number"))
    );
  }
};
