/* eslint-disable no-undef */

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const oldState = vscode.getState() || { colors: [] };

  /** @type {Array<{ value: string }>} */
  let colors = oldState.colors;

  document.querySelector(".actions-button").addEventListener("click", () => {
    vscode.postMessage({ type: "receiveActions" });
  });

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data; // The json data that the extension sent
    switch (message.type) {
      case "refreshActions": {
        console.log(message.actions);
        console.log(message.attributes);
        console.log(message.totalAttributes);
        refreshActions(message.actions, message.attributes, message.totalAttributes);
        break;
      }
    }
  });

  /**
   * @param {Array<{ value: string }>} colors
   */
  function refreshActions(actions, attributes, totalAttributes) {
    const ul = document.querySelector(".actions-list");
    ul.textContent = "";
    let attributesIndex = 0;
    for (const action of actions) {
      const li = document.createElement("li");
      const flexBoxForAction = document.createElement("div");
      const listOfAttributes = document.createElement("div");
      
      listOfAttributes.classList.add("closed");
      listOfAttributes.id = action;

      for (let att of attributes[attributesIndex]) {
        const newAttribute = document.createElement("div");
        newAttribute.innerHTML = att;
        listOfAttributes.appendChild(newAttribute);
      }

      flexBoxForAction.className = "action-holder";
      flexBoxForAction.addEventListener("click", () => {
        document.getElementById(action).classList.toggle("closed");
      });
      const actionName = document.createElement("div");
      actionName.innerHTML = action;
      flexBoxForAction.appendChild(actionName);
      const numberOfAttributes = document.createElement("div");
      numberOfAttributes.innerHTML = attributes[attributesIndex++].length + "/" + totalAttributes;
      flexBoxForAction.appendChild(numberOfAttributes);

      li.appendChild(flexBoxForAction);
      li.appendChild(listOfAttributes);
      ul.appendChild(li);
    }

    // Update the saved state
    vscode.setState({ colors: colors });
  }

  /**
   * @param {string} color
   */
  function onColorClicked(color) {
    vscode.postMessage({ type: "colorSelected", value: color });
  }

  /**
   * @returns string
   */
  function getNewCalicoColor() {
    const colors = ["020202", "f1eeee", "a85b20", "daab70", "efcb99"];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function addColor() {
    console.log("something");
    colors.push({ value: getNewCalicoColor() });
    updateColorList(colors);
  }
})();
