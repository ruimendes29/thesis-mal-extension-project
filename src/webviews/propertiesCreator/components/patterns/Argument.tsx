/* eslint-disable @typescript-eslint/naming-convention */
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import "./Argument.css";
import ArgumentInput from "./ArgumentInput";

const buildString = (mapForString: Map<number, string>) => {
  let s = "";
  const arrayFromMap = Array.from(mapForString);
  for (let i = 0; i < arrayFromMap.length; i++) {
    if (arrayFromMap.length === 1) {
      s = arrayFromMap[i][1];
    } else if (i === 0) {
      s += "(" + arrayFromMap[i][1];
    } else if (i === arrayFromMap.length - 1) {
      s += " & " + arrayFromMap[i][1] + ")";
    } else {
      s += " & " + arrayFromMap[i][1];
    }
  }
  return s;
};

const Argument = (props: { interactor: string; vscode: any; name: string; onValueChange: Function }) => {
  const [args, setArgs] = React.useState({ args: [0], selected: [], stringValues: new Map<number, string>() });

  const handleAddInput = () => {
    setArgs((prevArgs) => {
      const newMapForArgs = new Map([...prevArgs.stringValues]);
      const nextIdentifier = prevArgs.args[prevArgs.args.length - 1] + 1;
      const stringFromPrev = prevArgs.stringValues.get(nextIdentifier - 1);
      newMapForArgs.set(nextIdentifier, stringFromPrev);
      props.onValueChange(props.name, buildString(newMapForArgs));
      return { ...prevArgs, args: [...prevArgs.args, nextIdentifier], stringValues: newMapForArgs };
    });
  };

  const handleRemoveInput = () => {
    if (args.args.length > 1) {
      setArgs((prevArgs) => {
        const newMapForArgs = new Map([...prevArgs.stringValues]);
        for (const s of prevArgs.selected) {
          if (newMapForArgs.size > 1) {
            newMapForArgs.delete(s);
          }
        }
        props.onValueChange(props.name, buildString(newMapForArgs));
        return {
          stringValues: newMapForArgs,
          args: prevArgs.args.filter((el) => !prevArgs.selected.includes(el)),
          selected: [],
        };
      });
    }
  };

  const handleValueChange = (newValue: string, identifier: number) => {
    setArgs((prevArgs) => {
      const newMapForArgs = new Map([...prevArgs.stringValues]);
      newMapForArgs.set(identifier, newValue);
      const newArgs = { ...prevArgs, stringValues: newMapForArgs };
      props.onValueChange(props.name, buildString(newArgs.stringValues));
      return newArgs;
    });
  };

  return (
    <React.Fragment>
      <div className="header-holder">
        <h3>{props.name}</h3>
        <div className="signs">
          <FontAwesomeIcon className="icon" onClick={handleAddInput} style={{ marginRight: "10px" }} icon={faPlus} />
          <FontAwesomeIcon
            className={`${args.selected.length > 0 ? "icon" : "non-clickable"}`}
            onClick={handleRemoveInput}
            icon={faTrash}
          />
        </div>
      </div>
      {args.args.map((_i) => (
        <ArgumentInput
          onValueChange={(value: string, identifier: string) => {
            handleValueChange(value, +identifier.split(".")[1]);
          }}
          identifier={props.name + "." + _i}
          key={props.name + "." + _i}
          interactor={props.interactor}
          vscode={props.vscode}
          onSelection={(i: number) => {
            setArgs((oldS) => {
              const newS = {
                ...oldS,
                selected: oldS.selected.includes(i) ? oldS.selected.filter((el) => el !== i) : [...oldS.selected, i],
              };
              return newS;
            });
          }}
        />
      ))}
    </React.Fragment>
  );
};

export default Argument;
