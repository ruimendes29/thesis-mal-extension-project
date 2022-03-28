/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import Dropdown from "./UI/Dropdown";

const App = (props) => {
  const vscode = props.vscode;

  const [listOfInteractors, setListOfInteractors] = React.useState([]);

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "refreshActions": {
        setListOfInteractors(message.actions);
        break;
      }
    }
  });

  const handleOnClickRefreshActions = () => {
    vscode.postMessage({ type: "receiveActions" });
  };
  let mainInteractorId = 0;
  let includedInteractorId = 0;
  let actionId = 0;
  return (
    <div>
      {listOfInteractors.map((mainInteractor) => (
        <Dropdown
          level={0}
          key={mainInteractorId++}
          title={mainInteractor.mainInteractor}
          items={mainInteractor.insideInteractors.map((includedInteractor) => (
            <Dropdown
              level={1}
              key={includedInteractorId++}
              title={includedInteractor.includedInteractor}
              items={includedInteractor.actions.map((action) => (
                <Dropdown
                  level={2}
                  key={actionId++}
                  title={action.actionName}
                  items={action.attributes}
                  totalNumberOfItems={action.totalAttributes}
                />
              ))}
            />
          ))}
        />
      ))}
      <button onClick={handleOnClickRefreshActions}>refresh actions</button>
    </div>
  );
};

export default App;
