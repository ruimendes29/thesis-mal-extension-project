/* eslint-disable @typescript-eslint/naming-convention */
import { faArrowLeft, faArrowRight, faArrowRotateRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import TabContext from "../../store/tab-context";
import "./Navigator.css";

const Navigator = () => {
  const tabCtx = React.useContext(TabContext);
  return (
    <div className="navigator">
      <FontAwesomeIcon
        onClick={() => {
          tabCtx.goBack();
        }}
        className={`arrows ${tabCtx.back.length > 0 ? "clickable" : ""}`}
        icon={faArrowLeft}
      />
      <FontAwesomeIcon
        onClick={() => {
          tabCtx.goFront();
        }}
        className={`arrows ${tabCtx.front.length > 0 ? "clickable" : ""}`}
        icon={faArrowRight}
      />
      <FontAwesomeIcon className="arrows" icon={faArrowRotateRight} />
    </div>
  );
};

export default Navigator;
