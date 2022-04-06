/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";

const ArgumentInput = (props: { vscode: any; interactor: string; identifier: any }) => {
  const operators: string[] = ["!=", "=", "<", ">", "in"];
  const [listOfPossibilities, setListOfPossibilities] = React.useState([]);
  const [listOfValues, setListOfValues] = React.useState([]);
    console.log("Correu Argument Input com "+listOfPossibilities.toString()+" "+listOfValues.toString());
  React.useEffect(() => {
    props.vscode.postMessage({ type: "interactor-info", key: props.identifier, interactor: props.interactor });
  }, [props.interactor]);

  const handleFirstArgumentChange = (e) => {
    props.vscode.postMessage({
      type: "get-valid-values",
      key: props.identifier,
      value: e.target.value,
      interactor: props.interactor,
    });
  };

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    if (message.key === props.identifier) {
      switch (message.type) {
        case "interactor-info-response": {
            console.log("recebeu");
          setListOfPossibilities(message.possibilities);
          break;
        }
        case "valid-values-response": {
            console.log("recebeu");
          console.log(message);
          setListOfValues(message.possibilities);
          break;
        }
      }
    }
  });

  return (
    <div className="arguments">
      <select onChange={handleFirstArgumentChange} className="arg-left">
        {listOfPossibilities.map((el) => (
          <option key={el} value={el}>
            {el}
          </option>
        ))}
      </select>
      <select className="operator">
        {operators.map((el) => (
          <option key={el} value={el}>
            {el}
          </option>
        ))}
      </select>
      <select className="arg-right">
        {listOfValues.map((el) => (
          <option key={el} value={el}>
            {el}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ArgumentInput;
