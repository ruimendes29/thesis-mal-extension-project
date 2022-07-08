/* eslint-disable @typescript-eslint/naming-convention */
import * as React from "react";
import Dropdown from "../../common/Dropdown";

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

  const sendMessageWithTimer = () => {
    vscode.postMessage({ type: "receiveActions" });
    setTimeout(() => {
      sendMessageWithTimer();
    }, 2500);
  };

  React.useEffect(() => {
    console.log("ran");
    sendMessageWithTimer();
  }, []);

  const handleOnClickRefreshActions = () => {
    vscode.postMessage({ type: "receiveActions" });
  };
  let mainInteractorId = 0;
  let includedInteractorId = 0;
  let actionId = 0;

  const checkIfAllActionsAreDefined = (includedInteractor: any) => {
    for (let action of includedInteractor.actions) {
      if (action.attributes.length > 0) {
        return false;
      }
    }
    return true;
  };

  return (
    <div>
      {listOfInteractors.map((mainInteractor) => (
        <Dropdown
          level={0}
          everythingOk={{
            value: checkIfAllActionsAreDefined(
              mainInteractor.insideInteractors.filter((ii) => ii.includedInteractor === "actions")[0]
            ),
          }}
          key={mainInteractorId++}
          title={mainInteractor.mainInteractor}
          items={mainInteractor.insideInteractors.map((includedInteractor) => (
            <React.Fragment>
              {includedInteractor.includedInteractor === "actions" &&
                includedInteractor.actions.map((action) => (
                  <Dropdown
                    isAction
                    level={1}
                    key={actionId++}
                    title={action.actionName}
                    items={action.attributes}
                    totalNumberOfItems={action.totalAttributes}
                  />
                ))}
              {includedInteractor.includedInteractor !== "actions" && (
                <Dropdown
                  level={1}
                  key={includedInteractorId++}
                  title={includedInteractor.includedInteractor}
                  initial={includedInteractor.includedInteractor === "actions"}
                  everythingOk={{ value: checkIfAllActionsAreDefined(includedInteractor) }}
                  items={includedInteractor.actions.map((action) => (
                    <Dropdown
                      isAction
                      level={2}
                      key={actionId++}
                      title={action.actionName}
                      items={action.attributes}
                      totalNumberOfItems={action.totalAttributes}
                    />
                  ))}
                />
              )}
            </React.Fragment>
          ))}
        />
      ))}
      <button onClick={handleOnClickRefreshActions}>refresh actions</button>
    </div>
  );
};

export default App;
