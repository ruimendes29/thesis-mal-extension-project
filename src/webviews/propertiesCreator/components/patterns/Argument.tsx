/* eslint-disable @typescript-eslint/naming-convention */
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import "./Argument.css";
import ArgumentInput from "./ArgumentInput";

const Argument = (props: { interactor: string; vscode: any; name: string }) => {
  const [numOfInputs, setNumOfInputs] = React.useState(1);



  const handleAddInput = () => {
    setNumOfInputs((prevNum) => prevNum + 1);
  };

  const handleRemoveInput = () => {
    if (numOfInputs > 1) {
      setNumOfInputs((prevNum) => prevNum - 1);
    }
  };

  return (
    <React.Fragment>
      <div className="header-holder">
        <h3>{props.name}</h3>
        <div className="signs">
          <FontAwesomeIcon className="icon" onClick={handleAddInput} style={{ marginRight: "2px" }} icon={faPlus} />
          <FontAwesomeIcon className="icon" onClick={handleRemoveInput} icon={faMinus} />
        </div>
      </div>
      {[...Array(numOfInputs).keys()].map((_i) => (
        <ArgumentInput identifier={props.name+"."+_i} key={_i} interactor={props.interactor} vscode={props.vscode}/>
      ))}
    </React.Fragment>
  );
};

export default Argument;
