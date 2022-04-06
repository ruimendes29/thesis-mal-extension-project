/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import Card from "../../UI/Card";
import Selector from "../../UI/Selector";
import { ivyPatterns } from "./ivyPatterns";

const Ivy = () => {
  return (
    <Card>
      Choose between the patterns present in Ivy:
      {ivyPatterns.map((el) => (
        <Selector key={el.name} title={el.name} info={el.info} tab={el.name.toLowerCase()} />
      ))}
    </Card>
  );
};

export default Ivy;
