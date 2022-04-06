/* eslint-disable @typescript-eslint/naming-convention */
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import "./Argument.css";

const Argument = (props: { interactor: string; vscode: any; name: string }) => {
  const [listOfPossibilities, setListOfPossibilities] = React.useState([]);
  const operators: string[] = ["!=", "=", "<", ">", "in"];
  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "interactor-info-response": {
        setListOfPossibilities(message.possibilities);
        break;
      }
    }
  });

  React.useEffect(() => {
    props.vscode.postMessage({ type: "interactor-info", interactor: props.interactor });
  }, [props.interactor]);

  return (
    <React.Fragment>
      <div className="header-holder">
        <h3>{props.name}</h3>
        <div className="signs">
          <FontAwesomeIcon style={{ marginRight: "2px" }} icon={faPlus} />
          <FontAwesomeIcon icon={faMinus} />
        </div>
      </div>
      <div className="arguments">
        <select className="arg-left">
          {listOfPossibilities.map((el) => (
            <option key={el} value={el.toLowerCase()}>{el}</option>
          ))}
        </select>
        <select className="operator">
          {operators.map((el) => (
            <option key={el}  value={el.toLowerCase()}>{el}</option>
          ))}
        </select>
        <select className="arg-right">
          {listOfPossibilities.map((el) => (
            <option key={el}  value={el.toLowerCase()}>{el}</option>
          ))}
        </select>
      </div>
    </React.Fragment>
  );
};

export default Argument;
