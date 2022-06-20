/* eslint-disable @typescript-eslint/naming-convention */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import "./Dropdown.css";

const Dropdown = (props: {
  level: number;
  title: string;
  items: any[];
  totalNumberOfItems?: number;
  initial?: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(props.initial ? props.initial : false);
  let elementId = 0;
  return (
    <div
      className="dropdown-outside"
      style={{ paddingLeft: `${props.level * 0.5}rem` }}
    >
      <div
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className="dropdown-header"
      >
        <div className="dropdown-icon-holder">
          
        <FontAwesomeIcon className={`dropdown-icon ${isOpen ? "opened" : ""}`} icon={faAngleRight} />
          {props.totalNumberOfItems && (
            <h3 className="total-number">
              {props.items.length === 0 ? "All attributes defined" : "Missing " + props.items.length + " attributes"}
            </h3>
          )}
        </div>
        <h3 className="dropdown-name">{props.title}</h3>
      </div>

      <div className={`dropdown-items`}>
        {props.items.map((el) => (
          <div
            key={elementId++}
            style={{ transition: `all ${1 * elementId}s ease-in-out` }}
            className={`dropdown-item ${isOpen ? "" : "closed"}`}
          >
            {el}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dropdown;
