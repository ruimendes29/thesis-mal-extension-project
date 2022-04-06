/* eslint-disable @typescript-eslint/naming-convention */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import "./Dropdown.css";

const Dropdown = (props: {level:number, title: string; items: any[]; totalNumberOfItems?: number }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  let elementId = 0;
  return (
    <div className="dropdown-outside" style={{marginLeft:`${props.level*0.5}rem`}}>
      <div
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className="dropdown-header"
      >
        <h3 className="dropdown-name">{props.title}</h3>
        <div className="dropdown-icon-holder">
          {props.totalNumberOfItems && (
            <h3 className="total-number">{props.totalNumberOfItems - props.items.length + "/" + props.totalNumberOfItems}</h3>
          )}
          <FontAwesomeIcon className={`dropdown-icon ${isOpen?'opened':''}`} icon={faAngleDown} />
        </div>
      </div>

      <div className={`dropdown-items`}>
        {props.items.map((el) => (
          <div key={elementId++} style={{transition:`all ${1*elementId}s ease-in-out`}} className={`dropdown-item ${isOpen ? "" : "closed"}`}>
            {el}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dropdown;
