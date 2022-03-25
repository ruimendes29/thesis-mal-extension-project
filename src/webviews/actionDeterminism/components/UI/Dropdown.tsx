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
        <div className="dropdown-icon">
          {props.totalNumberOfItems && (
            <h3>{props.totalNumberOfItems - props.items.length + "/" + props.totalNumberOfItems}</h3>
          )}
          <FontAwesomeIcon icon={faAngleDown} />
        </div>
      </div>

      <div className={`dropdown-items ${isOpen ? "" : "closed"}`}>
        {props.items.map((el) => (
          <div key={elementId++} className="dropdown-item">
            {el}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dropdown;
