/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import Card from "../UI/Card";
import Selector from "../UI/Selector";

const TypePattern = () => {
  return (
    <Card>
      Choose the source from where you want to write your pattern.
      <Selector
        title="Ivy"
        tab="ivy"
        info={<div>Usability related pattern collection of the IVY workbench tool.</div>}
      />
      <Selector
        tab="dwyer"
        title="Dwyer"
        info={
          <div>
            Information about this patterns system is available at the Specification Patterns Home Page.
            <br />
            <a href="http://patterns.projects.cis.ksu.edu/">Visit Dwyer Website!</a>
          </div>
        }
      />
      <Selector tab="scaps" title="SCAPS" info={<div>Patterns from the SCAPS project.</div>} />
    </Card>
  );
};

export default TypePattern;
