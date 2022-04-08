/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";

const ArgumentInput = (props: {
  vscode: any;
  interactor: string;
  identifier: any;
  onValueChange: Function;
  onSelection: Function;
}) => {
  const operators: string[] = ["!=", "=", "<", ">", "in"];
  const [listOfPossibilities, setListOfPossibilities] = React.useState({ arguments: [], values: [] });
  const [, setExpressionValue] = React.useState({ first: "", operator: operators[0], second: "" });
  React.useEffect(() => {
    setListOfPossibilities({ arguments: [], values: [] });
    setExpressionValue({ first: "", operator: operators[0], second: "" });
    props.vscode.postMessage({ type: "interactor-info", key: props.identifier, interactor: props.interactor });
  }, [props.interactor]);

  const handleFirstArgumentChange = (e) => {
    props.vscode.postMessage({
      type: "get-valid-values",
      key: props.identifier,
      value: e.target.value,
      interactor: props.interactor,
    });
    setExpressionValue((oldExpVal) => {
      const newExpVal = { ...oldExpVal, first: e.target.value };
      props.onValueChange(newExpVal.first + " " + newExpVal.operator + " " + newExpVal.second, props.identifier);
      return newExpVal;
    });
  };

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    if (message.key === props.identifier) {
      switch (message.type) {
        case "interactor-info-response": {
          setExpressionValue((oldExpVal) => {
            const newVal = { ...oldExpVal, first: message.possibilities[0] };
            return newVal;
          });
          setListOfPossibilities((oldArgs) => {
            return { ...oldArgs, arguments: message.possibilities };
          });
          break;
        }
        case "valid-values-response": {
          console.log("recebeu");
          console.log(message);
          setListOfPossibilities((oldArgs) => {
            return { ...oldArgs, values: message.possibilities };
          });
          break;
        }
      }
    }
  });

  return (
    <div className="arguments">
      <select onChange={handleFirstArgumentChange} className="arg-left">
        {listOfPossibilities.arguments.map((el) => (
          <option key={el} value={el}>
            {el}
          </option>
        ))}
      </select>
      <select
        className="operator"
        onChange={(e) => {
          setExpressionValue((oldExpVal) => {
            const newExpVal = { ...oldExpVal, operator: e.target.value };
            props.onValueChange(newExpVal.first + " " + newExpVal.operator + " " + newExpVal.second, props.identifier);
            return newExpVal;
          });
        }}
      >
        {operators.map((el) => (
          <option key={el} value={el}>
            {el}
          </option>
        ))}
      </select>
      <select
        onChange={(e) => {
          setExpressionValue((oldExpVal) => {
            const newExpVal = { ...oldExpVal, second: e.target.value };
            props.onValueChange(newExpVal.first + " " + newExpVal.operator + " " + newExpVal.second, props.identifier);
            return newExpVal;
          });
        }}
        className="arg-right"
      >
        {listOfPossibilities.values.map((el) => (
          <option key={el} value={el}>
            {el}
          </option>
        ))}
      </select>
      <input
        onChange={() => props.onSelection(+props.identifier.split(".")[1])}
        type="checkbox"
        id={props.identifier}
        name={props.identifier}
      ></input>
    </div>
  );
};

export default ArgumentInput;
