/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import "./Selector.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import TabContext from "../../store/tab-context";
const Selector = (props: {
  title: string;
  info: React.ReactElement;
  tab: string;
}) => {
  const [showInfo, setShowInfo] = React.useState(false);
  const tabCtx = React.useContext(TabContext);
  return (
    <React.Fragment>
      <button
        className="selector_holder"
        onClick={() => {
          tabCtx.changeCurrent(props.tab);
        }}
      >
        {props.title}
        <FontAwesomeIcon
          onClick={(e) => {
            e.stopPropagation();
            setShowInfo((prevSI) => !prevSI);
          }}
          className="info-icon"
          icon={faCircleInfo}
        />
      </button>
      {showInfo && <div className="info">{props.info}</div>}
    </React.Fragment>
  );
};

export default Selector;
