/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import "./Pattern.css";
import Dropdown from "../../../common/Dropdown";
import Argument from "./Argument";

const replaceInExpression = (values: Map<string, string>, expression: string) => {
  let toRet="";
  for (let i = 0; i < expression.length; i++) {
    if (values.has(expression[i])) {
        toRet+=values.get(expression[i]);
    }
    else {toRet+=expression[i];}
  }
  return toRet;
};

const Pattern = (props: {
  pattern: {
    name: string;
    formula: string;
    description: JSX.Element;
    intent: JSX.Element;
    example: JSX.Element;
    arguments: string[];
  };
  vscode: any;
}) => {
  const [listOfInteractors, setListOfInteractors] = React.useState([]);
  const [interactor, setInteractor] = React.useState("");
  const [valueOfArguments, setValueOfArguments] = React.useState(new Map<string, string>());

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "interactors-response": {
        setListOfInteractors(message.possibilities);
        setInteractor(message.possibilities[0]);
        break;
      }
    }
  });

  const handleValueChange = (variableName: string, variableValue: string) => {
    setValueOfArguments((oldMap) => {
      const newMap = new Map([...oldMap]);
      newMap.set(variableName, variableValue);
      return newMap;
    });
  };

  React.useEffect(() => {
    props.vscode.postMessage({ type: "get-interactors" });
  }, []);

  return (
    <div>
      <h3>{props.pattern.name}</h3>
      <Dropdown
        level={1}
        title="Interactor"
        items={[
          <select
            onChange={(e) => {
              setValueOfArguments(new Map());
              setInteractor(e.target.value);
            }}
          >
            {listOfInteractors.map((el) => (
              <option key={el.toLowerCase()} value={el.toLowerCase()}>
                {el}
              </option>
            ))}
          </select>,
        ]}
      />
      <Dropdown level={1} title="Formula" items={[<div>{props.pattern.formula}</div>]} />
      <Dropdown level={1} title="Description" items={[<div>{props.pattern.description}</div>]} />
      <Dropdown level={1} title="Intent" items={[<div>{props.pattern.intent}</div>]} />
      <Dropdown level={1} title="Example" items={[<div>{props.pattern.example}</div>]} />
      <Dropdown
        level={1}
        title="Arguments"
        items={props.pattern.arguments.map((el) => (
          <Argument
            onValueChange={handleValueChange}
            key={props.pattern.name + "." + el}
            interactor={interactor}
            name={el}
            vscode={props.vscode}
          />
        ))}
      />
      <Dropdown level={1} title="Formula Preview" items={[<div>{replaceInExpression(valueOfArguments, props.pattern.formula)}</div>]} />
      <button
        onClick={() => {
          props.vscode.postMessage({ type: "insert", value: replaceInExpression(valueOfArguments, props.pattern.formula), interactor: interactor });
        }}
      >
        Add to interactor
      </button>
    </div>
  );
};

export default Pattern;
