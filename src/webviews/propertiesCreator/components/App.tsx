/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import TypePattern from "./TypePattern/TypePattern";
import Card from "./UI/Card";
import "./App.css";
import TabContext from "../store/tab-context";
import Navigator from "./Utils/Navigator";
import { ivyPatterns } from "./patterns/patternsInfo/ivyPatterns";
import Selector from "./UI/Selector";
import Pattern from "./patterns/Pattern";
import InsidePattern from "./patterns/InsidePattern";

const loopThroughPattern = (patterns: any, tabName: string, vscode: any) => {
  if (patterns.name.toLowerCase() === tabName) {
    if (patterns.subPatterns && patterns.subPatterns.length > 0) {
      return (
        <InsidePattern
          name={patterns.name.toLowerCase()}
          elements={patterns.subPatterns}
        />
      );
    }
    return (
      <Card>
        {patterns.name}
        {patterns.patterns.map((el) => (
          <Selector
            key={el.name}
            title={el.name}
            info={el.description}
            tab={el.name.toLowerCase()}
          />
        ))}
      </Card>
    );
  } else {
    for (const pattern of patterns.patterns) {
      if (pattern.name.toLowerCase() === tabName) {
        return <Pattern pattern={pattern} vscode={vscode} />;
      }
    }
    return undefined;
  }
};

const renderTab = (tabName: string, vscode: any) => {
  for (const patternType of ivyPatterns) {
    const foundSomething = loopThroughPattern(patternType, tabName, vscode);
    if (foundSomething !== undefined) {
      return foundSomething;
    }
    for (const subPattern of patternType.subPatterns) {
      const foundSomething = loopThroughPattern(subPattern, tabName, vscode);
      if (foundSomething !== undefined) {
        return foundSomething;
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
          This view helps with the writing of properties of the model written in
          the opened file.
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
      {(tabCtx.current === "ivy" ||
        tabCtx.current === "dwyer" ||
        tabCtx.current === "scaps") && (
        <InsidePattern elements={ivyPatterns} name={tabCtx.current} />
      )}
      {renderTab(tabCtx.current, vscode)}
    </React.Fragment>
  );
};

export default App;
