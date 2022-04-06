/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import "./Pattern.css";
import Dropdown from "../../../common/Dropdown";
import Argument from "./Argument";

const Pattern = (props: {
  pattern: {
    name: string;
    formula: JSX.Element;
    description: JSX.Element;
    intent: JSX.Element;
    example: JSX.Element;
  };
  vscode: any;
}) => {
  const [listOfInteractors, setListOfInteractors] = React.useState([]);
  const [interactor, setInteractor] = React.useState("");
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

  React.useEffect(() => {
    props.vscode.postMessage({ type: "get-interactors" });
  }, []);
  return (
    <div>
      {console.log(interactor)}
      <h3>{props.pattern.name}</h3>
      <Dropdown
        level={1}
        title="Interactor"
        items={[
          <select
            onChange={(e) => {
              setInteractor(e.target.value);
            }}
          >
            {listOfInteractors.map((el) => (
              <option key={el.toLowerCase()} value={el.toLowerCase()}>{el}</option>
            ))}
          </select>,
        ]}
      />
      <Dropdown level={1} title="Formula" items={[<div>{props.pattern.formula}</div>]} />
      <Dropdown level={1} title="Description" items={[<div>{props.pattern.description}</div>]} />
      <Dropdown level={1} title="Intent" items={[<div>{props.pattern.intent}</div>]} />
      <Dropdown level={1} title="Example" items={[<div>{props.pattern.example}</div>]} />
      <Dropdown level={1} title="Arguments" items={[<Argument interactor={interactor} name="P" vscode={props.vscode} />]} />
    </div>
  );
};

export default Pattern;
