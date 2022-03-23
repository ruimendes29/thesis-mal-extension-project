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
        console.log(message);
        refreshActions(message.actions);
        break;
      }
    }
  });

  function addIconToElement(elementToAdd, iconCode, iconId) {
    const insideInteractorIcon = document.createElement("i");
    insideInteractorIcon.classList.add("fas");
    insideInteractorIcon.classList.add(iconCode);
    insideInteractorIcon.id = iconId;
    elementToAdd.appendChild(insideInteractorIcon);
  }

  const infoText = "This tool provides information about which attributes have their value"+
   " defined in the next state by the actions that exist on an interactor. Each interactor "+
   "present on the opened file will be shown here, with sub-tags, corresponding to each of the "+
   "included interactors, as well as itself. On each of these sub-tags is possible to see the name"+
   "of the interactors included. When this sub-tags are opened,"+
   "a list of actions present in the opened interactor is shown as well as how many attributes were assigned out of all possible ones "+
   "by each of the actions. These actions, when opened, provide the name of the attributes that are NOT defined by them.";


  function refreshActions(actions) {
    const ul = document.querySelector(".actions-list");
    ul.textContent = "";
    const infoButton = document.createElement("button");
    infoButton.id = "info";
    infoButton.innerHTML="Need Help?";
    infoButton.addEventListener("click", () => {
      document.getElementById("info").classList.toggle("show-info");
      infoButton.innerHTML = infoButton.innerHTML==="Need Help?"?infoText:"Need Help?";
    });
    ul.appendChild(infoButton);
    // receives the actions array containing all the information needed to display the webview
    for (const action of actions) {
      //create an element div to hold the name of the main interactor
      const mainInteractorName = document.createElement("div");
      mainInteractorName.innerHTML = action.mainInteractor;

      // create an element to hold all included interactors by that interactor
      const li = document.createElement("li");
      for (const insideInteractor of action.insideInteractors) {
        // div element that will hold the main interactor name
        const insideInteractorNameHolder = document.createElement("div");
        const insideInteractorName = document.createElement("div");
        insideInteractorName.innerHTML = insideInteractor.includedInteractor;
        insideInteractorNameHolder.appendChild(insideInteractorName);

        // ul element that will hold all interactors included by that interactor
        const insideInteractorElem = document.createElement("ul");
        for (const a of insideInteractor.actions) {
          // li element that will contain the attributes changed in the next state by the action
          const liActionElement = document.createElement("li");

          // div element that will contain the name of the action
          const liActionElementName = document.createElement("div");
          liActionElementName.innerHTML = a.actionName;

          // ul element to hold all the attributes
          const listOfAttributes = document.createElement("ul");
          for (const att of a.attributes) {
            // li element representing each attribute changed in next state
            const newAttribute = document.createElement("li");
            newAttribute.innerHTML = att;

            // add the li element to the ul element (list of attributes)
            listOfAttributes.appendChild(newAttribute);
          }

          // add the closed class so that we can toogle the visibility of this element through the action name
          listOfAttributes.classList.add("closed");

          // unique id for the combination of action, included interactor and main interactor
          const exclusiveActionId =
            action.mainInteractor + "." + insideInteractor.includedInteractor + "." + a.actionName;
          listOfAttributes.id = exclusiveActionId;

          liActionElementName.classList.add("action-button");
          const nonAssignedAttributes = document.createElement("span");
          nonAssignedAttributes.innerHTML =  (a.totalAttributes-a.attributes.length)+"/"+a.totalAttributes;
          //added arrow icon to action button
          liActionElementName.appendChild(nonAssignedAttributes);
          addIconToElement(nonAssignedAttributes, "fa-angle-down", exclusiveActionId + ".arrow");

          // ad listener to toogle visibility of the list of attributes
          liActionElementName.addEventListener("click", () => {
            document.getElementById(exclusiveActionId).classList.toggle("closed");
            document.getElementById(exclusiveActionId + ".arrow").classList.toggle("opened");
          });

          // classed added for styling purposes
          liActionElement.className = "action-holder";
          // add the list of attributes to the action element
          liActionElement.appendChild(listOfAttributes);

          insideInteractorElem.appendChild(liActionElementName);
          insideInteractorElem.appendChild(liActionElement);
        }
        // add the closed class so that we can toogle the visibility of this element through the interactor name
        insideInteractorElem.classList.add("closed");
        const exclusiveInteractorId = action.mainInteractor + "." + insideInteractor.includedInteractor;
        insideInteractorElem.id = exclusiveInteractorId;
        addIconToElement(insideInteractorNameHolder, "fa-angle-down", exclusiveInteractorId + ".arrow");
        insideInteractorNameHolder.addEventListener("click", () => {
          document.getElementById(exclusiveInteractorId).classList.toggle("closed");
          document.getElementById(exclusiveInteractorId + ".arrow").classList.toggle("opened");
        });
        insideInteractorNameHolder.classList.add("inside-interactor-button");
        insideInteractorElem.classList.add("interactor-actions");
        li.appendChild(insideInteractorNameHolder);
        li.appendChild(insideInteractorElem);
      }

      ul.append(mainInteractorName);
      ul.appendChild(li);
    }

    // Update the saved state
    vscode.setState({ colors: colors });
  }
})();
