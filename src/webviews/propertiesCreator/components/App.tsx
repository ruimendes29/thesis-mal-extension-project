/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import TypePattern from "./TypePattern/TypePattern";
import Card from "./UI/Card";
import "./App.css";
import Ivy from "./patterns/Ivy/Ivy";
import TabContext from "../store/tab-context";
import Navigator from "./Utils/Navigator";
import { ivyPatterns } from "./patterns/Ivy/ivyPatterns";
import Selector from "./UI/Selector";
import Pattern from "./patterns/Pattern";

const renderTab = (tabName: string,vscode:any) => {
  for (const patternType of ivyPatterns) {
    if (patternType.name.toLowerCase() === tabName) {
      return (
        <Card>
          {patternType.name}
          {patternType.patterns.map((el) => (
            <Selector key={el.name} title={el.name} info={el.description} tab={el.name.toLowerCase()} />
          ))}
        </Card>
      );
    } else {
      for (const pattern of patternType.patterns) {
        if (pattern.name.toLowerCase() === tabName) {
          return <Pattern pattern={pattern} vscode={vscode}/>;
        }
      }
    }
  }
  return <React.Fragment></React.Fragment>;
};

const App = (props) => {
  const vscode = props.vscode;
  const tabCtx = React.useContext(TabContext);
  return (
    <React.Fragment>
      <Navigator />
      {tabCtx.current === "home" && (
        <Card>
          This view helps with the writing of properties of the model written in the opened file.
          <button
            onClick={() => {
              tabCtx.changeCurrent("type");
            }}
          >
            Get started
          </button>
        </Card>
      )}
      {tabCtx.current === "type" && <TypePattern />}
      {tabCtx.current === "ivy" && <Ivy />}
      {renderTab(tabCtx.current,vscode)}
    </React.Fragment>
  );
};

export default App;
