/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import TabContext from "./tab-context";

const TabProvider = (props: { children: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal; }) => {
  const [tabInfo, setTabInfo] = React.useState({ current: "home", back: [], front: [] });
  const changeCurrentTab = (newTab: string) => {
    setTabInfo((oldTab) => {
      return { current: newTab, back: [oldTab.current, ...oldTab.back], front: oldTab.front };
    });
  };
  const goBackTab = () => {
    if (tabInfo.back.length > 0) {
      setTabInfo((oldTab) => {
        const newTab = oldTab.back.shift();
        return { current: newTab, back: oldTab.back, front: [oldTab.current, ...oldTab.front] };
      });
    }
  };
  const goFrontTab = () => {
    if (tabInfo.front.length > 0) {
      setTabInfo((oldTab) => {
        const newTab = oldTab.front.shift();
        return { current: newTab, back: [oldTab.current, ...oldTab.back], front: oldTab.front };
      });
    }
  };
  const tabContext = {
    current: tabInfo.current,
    back: tabInfo.back,
    front: tabInfo.front,
    changeCurrent: changeCurrentTab,
    goBack: goBackTab,
    goFront: goFrontTab,
  };
  return <TabContext.Provider value={tabContext}>{props.children}</TabContext.Provider>;
};

export default TabProvider;
