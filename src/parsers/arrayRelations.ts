import { attributes, arrays } from "./globalParserInfo";

/* From a given attribute declared as an array, get it's name and the number of arguments
present when the array is being used in an axiom */
export const getArrayWrittenInfo = (arrayUsage: string) => {
  let openBrackets = 0;
  let numberOfArguments = 0;
  for (let c of arrayUsage.split("")) {
    if (c === "[") {
      openBrackets++;
    }
    if (c === "]" && openBrackets > 0) {
      numberOfArguments++;
      openBrackets--;
    }
  }
  return {
    arrayName: arrayUsage.slice(0, arrayUsage.indexOf("[")).trim(),
    numberOfArguments: numberOfArguments,
  };
};

/* From an attribute declared as an array, get the information present about
that type of array from the data structures present in the extension, in this case
the dimensions and the type */
export const getArrayInStore = (arrayName: string,interactor :string) => {
  let numberOfDimensions = 1;
  let type = "";
  const indexes: {firstIndex: number, lastIndex: number}[] = [];
  if (
    attributes.has(interactor) &&
    attributes.get(interactor)!.has(arrayName) &&
    arrays.has(attributes.get(interactor)!.get(arrayName)!.type!)
  ) {
    const arrayInfo = arrays.get(attributes.get(interactor)!.get(arrayName)!.type!)!;
    indexes.push({firstIndex: arrayInfo.firstIndex, lastIndex: arrayInfo.lastIndex});
    let arrayType = arrayInfo.type;
    while (arrays.has(arrayType)) {
      indexes.push({firstIndex: arrays.get(arrayType)!.firstIndex, lastIndex: arrays.get(arrayType)!.lastIndex});
      arrayType = arrays.get(arrayType)!.type;
      numberOfDimensions++;
    }
    type = arrayType;
  }
  return { dimensions: numberOfDimensions, type: type, indexes };
};

export const getArrayTypeInfo = (arrayType: string): {
    dimensions: number,
    type: string,
    indexes: {firstIndex: number, lastIndex: number}[]
  } => {
  let numberOfDimensions = 1;
  let type = "";
  const indexes: {firstIndex: number, lastIndex: number}[] = [];
  if (
    arrays.has(arrayType)
  ) {
    const arrayInfo = arrays.get(arrayType)!;
    let arrayMembersType = arrayInfo.type;
    indexes.push({firstIndex: arrayInfo.firstIndex, lastIndex: arrayInfo.lastIndex});
    while (arrays.has(arrayMembersType)) {
      const innerArrayInfo = arrays.get(arrayType)!;
      arrayMembersType = innerArrayInfo.type;
      indexes.push({firstIndex: innerArrayInfo.firstIndex, lastIndex: innerArrayInfo.lastIndex});
      numberOfDimensions++;
    }
    type = arrayMembersType;
  }
  return { dimensions: numberOfDimensions, type: type, indexes: indexes };
};

