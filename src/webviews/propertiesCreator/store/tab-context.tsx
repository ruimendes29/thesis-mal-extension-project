/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";

const TabContext = React.createContext({
  current: "home",
  back: [],
  front: [],
  changeCurrent: (newTab: string) => {},
  goBack: () => {},
  goFront: () => {}
});

export default TabContext;