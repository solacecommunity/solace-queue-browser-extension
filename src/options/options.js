
import * as utils from '../lib/utils.js';
import { encryptString, decryptString } from '../lib/encryptionUtils.js';

/**
 * Displays the saved connections from local storage and populates the input fields with the values of the first connection.
 * Also adds event listeners to each connection row.
 */
async function populateUI() {
  try {

    intitalizeOptions();

    // Retrieve all connections from local storage
    let connections = await chrome.storage.local.get();

    validateMandatoryConnectionFieldValues();

    // Return if the connections object is empty
    if (utils.isEmpty(connections)) {
      return;
    }

    // Take the first connection as the activated connection
    let activatedConnection = connections[Object.keys(connections)[0]];
    // Overwrite the first connection with activated connection if found
    Object.values(connections).forEach((connection) => {
      if (connection.activated === true) {
        activatedConnection = connection;
        return;
      }
    });

    console.log('activatedConnection:', activatedConnection);
    if (activatedConnection.encrypted) {
      await decryptString(activatedConnection.password, activatedConnection.iv).then((decryptedData) => {
        activatedConnection.password = decryptedData;
      });
    }


    // Populate the input fields with the values of the activeated connection
    setValue('connectionId', activatedConnection.id);
    setValue('connectionName', activatedConnection.connectionName);
    setValue('smfHost', activatedConnection.smfHost);
    setValue('msgVpn', activatedConnection.msgVpn);
    setValue('userName', activatedConnection.userName);
    setValue('password', activatedConnection.password);
    setChecked('showUserProps', activatedConnection.showUserProps);
    setChecked('showMsgPayload', activatedConnection.showMsgPayload);
    setChecked('activated', activatedConnection.activated);

    // Validate the connection field values
    validateMandatoryConnectionFieldValues();

    // Sort the connections by connectionName
    const sortedConnections = Object.values(connections).sort((a, b) => a.connectionName.localeCompare(b.connectionName));

    // Iterate over each connection and create HTML elements to display them
    sortedConnections.forEach((connection) => {
      let connectionHTML = `
        <div id="${connection.id}" class="container row ${connection.activated ? 'selected' : ''}">
          <div class="left-container">
            <h2 class="headers">${connection.connectionName}</h2>
            <p class="sub-headers">${connection.smfHost}</p>
          </div>
      `;

      // Add an 'Activated' label to the connection if it is activated
      if (connection.activated) {
        let activatedDiv = `
          <div id="activatedDiv" class="right-container">
            <span id="activatedLabel">Activated</span>
          </div>
        `;
        connectionHTML += activatedDiv;
      }

      connectionHTML += `</div>`;

      // Append the connection HTML to the connections element
      document.getElementById('connections').insertAdjacentHTML('beforeend', connectionHTML);
      document.getElementById(connection.id).addEventListener('click', get_connection);
    });

  } catch (error) {
    console.log('Error populating UI:', error);
    utils.showModalNotification('Error', error.message);
  }
}

/**
 * Displays the options from local storage and populates the input fields with the saved values.
 */
async function get_connection() {
  try {
    // Removes the 'selected' class from all connection rows to reset the selection state
    document.querySelectorAll('.row').forEach(el => el.classList.remove('selected'));
    // Adds the 'selected' class to the currently clicked connection row, highlighting it
    document.getElementById(this.id).classList.add('selected');

    let connection = await chrome.storage.local.get(this.id);
    // Checks if the retrieved connection object is not empty
    if (utils.isEmpty(connection)) {
      // Clears the form fields if the connection object is empty (e.g., new connection)
      clearConnectionFields();
      setValue('connectionId', this.id);
      return;
    }

    // Extracts the connection details specific to the clicked connection ID
    connection = connection[this.id];

    if (connection.encrypted) {
      await decryptString(connection.password, connection.iv).then((decryptedData) => {
        connection.password = decryptedData;
      });
    }

    // Populates the form fields with the retrieved connection details
    setValue('connectionId', connection.id);
    setValue('connectionName', connection.connectionName);
    setValue('smfHost', connection.smfHost);
    setValue('msgVpn', connection.msgVpn);
    setValue('userName', connection.userName);
    setValue('password', connection.password);
    setChecked('showUserProps', connection.showUserProps);
    setChecked('showMsgPayload', connection.showMsgPayload);
    setChecked('activated', connection.activated);

    document.getElementById('save').textContent = 'Save';
    document.getElementById('save').style.backgroundColor = '#009dff';

    // Validates the mandatory fields in the connection form - adding red required asterisks if any are missing
    validateMandatoryConnectionFieldValues();

  } catch (error) {
    console.log('Error getting connection:', error);
    utils.showModalNotification('Error', error);
  }
}

/**
 * Creates a new connection UI element and appends it to the 'connections' container in the DOM.
 * This function is designed to be called when the user wants to add a new connection configuration.
 * 
 * Steps performed by the function:
 * 1. Clears any existing input fields related to connection details by calling the clearConnectionFields() function.
 * 2. Removes the 'selected' class from all elements with the class 'row', effectively deselecting any currently selected connection.
 * 3. Generates a new unique identifier for the connection using the crypto.randomUUID() method.
 * 4. Constructs a new HTML structure for the connection UI element, assigning it the new unique identifier and setting its class to 'selected'.
 * 5. Inserts the newly created connection UI element at the beginning of the 'connections' container in the DOM.
 * 6. Adds an event listener to the new connection element that calls the get_connection() function when the element is clicked.
 * 
 * Note:
 * - The function assumes the existence of a 'connections' container in the DOM where the new connection UI element will be appended.
 * - The clearConnectionFields() function is expected to clear any form fields or UI elements related to connection details.
 * - The get_connection() function is expected to handle the event when the new connection UI element is clicked, likely populating form fields with the connection's details.
 */
function createBlankConnection() {
  try {
    // Clear existing input fields for connection details so the user can enter new values.
    clearConnectionFields();

    // Deselect any currently selected connection.
    document.querySelectorAll('.row').forEach(el => el.classList.remove('selected'));

    let newConnectionId = crypto.randomUUID(); // Generate a unique identifier for the new connection

    setValue('connectionId', newConnectionId);

    const connectionHTML = `
      <div id="${newConnectionId}" class="container row selected">
        <div class="left-container">
          <h2 class="headers">New Connection</h2>
          <p class="sub-headers">New API Endpoint</p>
        </div>
      </div>
    `;
    // Append the new connection UI element to the beginning 'connections' container in the DOM so it appears first in the list
    document.getElementById('connections').insertAdjacentHTML('afterbegin', connectionHTML);

    // Add an event listener to the new connection element to handle clicks (selecting the connection)
    document.getElementById(newConnectionId).addEventListener('click', get_connection);
  } catch (error) {
    console.log('Error create connection:', error);
    utils.showModalNotification('Error', error.message);
  }
}

/**
 * Deletes the selected connection option from the DOM and removes its details from local storage.
 */
async function delete_option() {
  try {

    // Get the "selected" connection
    let selectedConnection = document.getElementsByClassName('selected')[0];

    if (selectedConnection !== undefined) {
      if (selectedConnection.id !== '') {
        // Remove from local storage
        await chrome.storage.local.remove(getValue('connectionId'));
      }

      // Remove from DOM
      selectedConnection.remove();
      // Clear existing input fields for connection details so the user can enter new values.
      clearConnectionFields();
      utils.showToastNotification('Connection deleted!', 'info');
    }


  } catch (error) {
    console.log('Error deleting connection:', error);
    utils.showModalNotification('Error', error.message);
  }
}

/**
 * Clears the input fields for the connection fields.
 */
function clearConnectionFields() {
  try {
    // Clear the values of the input fields
    setValue('connectionId', '');
    setValue('connectionName', '');
    setValue('smfHost', '');
    setValue('msgVpn', '');
    setValue('userName', '');
    setValue('password', '');
    setChecked('showUserProps', false);
    setChecked('showMsgPayload', false);
    setChecked('activated', false);


    validateMandatoryConnectionFieldValues();

  } catch (error) {
    console.error('Error clearing connection fields:', error);
    utils.showModalNotification('Error', error.message);
  }
}

/**
 * Saves the user-defined options for the application into local storage.
 * This function is typically called when the user submits a form containing various settings or preferences.
 * 
 * Steps performed by the function:
 * 1. Collects the values from the form fields specified in the UI.
 * 2. Constructs an object, `options`, containing the key-value pairs of the settings.
 * 3. Validates the collected values to ensure they meet the application's requirements.
 *    - This may involve checking for empty fields, ensuring values are within acceptable ranges, etc.
 * 4. If validation passes, the `options` object is serialized (e.g., converted to a JSON string) and saved to local storage.
 * 5. The user is notified of the successful save operation, often through a UI element such as a toast notification or modal dialog.
 * 6. In case of validation failure or other errors, appropriate feedback is provided to the user, and the save operation is aborted.
 * 
 * Note:
 * - The actual keys and structure of the `options` object will vary based on the application's specific settings and requirements.
 * - Error handling should be implemented to catch and manage exceptions, especially those related to local storage limits or permissions.
 */
async function save_option() {
  try {

    // Set DOM connection ID
    setValue('connectionId', getValue('connectionId') || crypto.randomUUID());

    // Check for any missing fields
    if (!validateMandatoryConnectionFieldValues()) {
      utils.showModalNotification('Error', 'Please fill in all required fields.');
      return;
    }

    const connectionDetails = {
      id: getValue('connectionId'),
      connectionName: getValue('connectionName'),
      smfHost: getValue('smfHost'),
      msgVpn: getValue('msgVpn'),
      userName: getValue('userName'),
      password: getValue('password'),
      showUserProps: getChecked('showUserProps'),
      showMsgPayload: getChecked('showMsgPayload'),
      activated: getChecked('activated'),
      encrypted: null,
      iv: null
    };

    const options = await chrome.storage.sync.get();
    connectionDetails.encrypted = options.encryptionEnabled;

    // Encrypt the password if the encryption checkbox is checked.
    // If the password is already encrypted, do not encrypt it again.
    if (!connectionDetails.encrypted) {
      // Encrypt the password and store the encrypted string and IV
      await encryptString(connectionDetails.password).then((encryptedData) => {
        console.log('encryptedData:', encryptedData);
        connectionDetails.password = encryptedData.encryptedString;
        connectionDetails.iv = encryptedData.iv;
        connectionDetails.encrypted = true;
      });
    }


    // Remove the activated label from activated connection
    if (connectionDetails.activated === true) {
      console.log('connectionDetails.activated:', connectionDetails.activated);
      let activatedDiv = document.getElementById('activatedDiv');
      if (activatedDiv) {
        activatedDiv.remove();
      }
    }

    // If no Connection Instance have been created, create one
    const connections = document.querySelector('.container.row.selected');
    if (!connections) {
      let connectionHTML = `
        <div id="${connectionDetails.id}" class="container row selected">
          <div class="left-container">
            <h2 class="headers">${connectionDetails.connectionName}</h2>
            <p class="sub-headers">${connectionDetails.smfHost}</p>
          </div>
      `;
      if (connectionDetails.activated) {

        // Add activated label to the new activated connection
        let activatedDiv = `
          <div id="activatedDiv" class="right-container">
            <span id="activatedLabel">Activated</span>
          </div>
        `;
        connectionHTML += activatedDiv;
      }

      connectionHTML += '</div>'
      // Append the new connection UI element to the beginning 'connections' container in the DOM so it appears first in the list
      document.getElementById('connections').insertAdjacentHTML('afterbegin', connectionHTML);

      // Add an event listener to the new connection element to handle clicks (selecting the connection)
      document.getElementById(connectionDetails.id).addEventListener('click', get_connection);
    } else {

      // Else update the existing connection instance with the connection details
      const newConnection = document.getElementById(connectionDetails.id);
      newConnection.querySelector('.left-container h2').textContent = connectionDetails.connectionName;
      newConnection.querySelector('.left-container p').textContent = connectionDetails.smfHost;
      if (connectionDetails.activated) {
        document.querySelectorAll('.row').forEach(el => el.classList.remove('selected'));
        newConnection.classList.add('selected');

        // Add activated label to the new activated connection
        let activatedDiv = `
          <div id="activatedDiv" class="right-container">
            <span id="activatedLabel">Activated</span>
          </div>
        `;
        newConnection.insertAdjacentHTML('beforeend', activatedDiv);
      }
    }

    utils.showToastNotification('Connection saved successfully!');

    // Save the connection details to local storage
    await chrome.storage.local.set({ [connectionDetails.id]: connectionDetails });
    // Update the save button text to indicate success
    document.getElementById('save').textContent = 'Saved!';
    document.getElementById('save').style.backgroundColor = '#13aa529d';

    // Clear previous asterisks
    document.querySelectorAll('.required-asterisk').forEach(el => el.remove());

    // Deactivate all other connections if the current connection is activated
    if (connectionDetails.activated === true) {
      let connections = await chrome.storage.local.get();
      Object.entries(connections).forEach(([connectionId, connection]) => {
        if (connection.id !== connectionDetails.id) {
          connection.activated = false;
          chrome.storage.local.set({ [connectionId]: connection });
        }
      });
    }
    console.log('Options saved successfully.');
  } catch (error) {
    console.error('Error saving options:', error);
    utils.showModalNotification('Error', error.message);
  }
}


// ########################################################################################

// Helper functions

/**
 * Initializes the options by setting default values if they do not exist.
 * This function is typically called when the extension is first installed or when the options are reset.
 */
async function intitalizeOptions() {
  // Initialize the options
  let options = await chrome.storage.sync.get();
  if (utils.isEmpty(options)) {
    options = {
      encryptionEnabled: false
    };
    await chrome.storage.sync.set(options);
  }
}


/**
 * Validates the connection details provided by the user in the form.
 * This function checks each input field related to the connection details to ensure they are not empty.
 *  
 * Steps performed by this function:
 * 1. Iterates over each key in the connectionFieldValues object passed as an argument.
 * 2. For each key, checks if the corresponding value is empty.
 *    - If a value is found to be empty, the function identifies the form field associated with this key.
 * 3. For each field with an empty value, a visual indicator (e.g., a red asterisk) is added next to the field's label to signal to the user that it is required.
 * 4. If any empty values are found, the function returns false, indicating that the validation failed.
 * 5. If all fields have valid values, the function returns true, indicating that the validation passed.
 */
function validateMandatoryConnectionFieldValues() {

  // Clear previous asterisks
  document.querySelectorAll('.required-asterisk').forEach(el => el.remove());

  const connectionFieldValues = {
    id: getValue('connectionId'),
    connectionName: getValue('connectionName'),
    smfHost: getValue('smfHost'),
    msgVpn: getValue('msgVpn'),
    userName: getValue('userName'),
    password: getValue('password')
  };

  const missingValues = Object.entries(connectionFieldValues).filter(([key, value]) => value === '').map(([key]) => key);

  // If there are missing values, add visual indicators (red asterisks) next to the corresponding form fields
  if (missingValues.length > 0) {
    missingValues.forEach(key => {
      const label = document.querySelector(`label[for="${key}"]`);
      if (label) {
        const asterisk = document.createElement('span');
        asterisk.textContent = ' *';
        asterisk.style.color = 'red';
        asterisk.className = 'required-asterisk';
        label.appendChild(asterisk);
      }
    });
    return false;
  }
  return true;
}


/**
 * Retrieves the value of a DOM element by its ID.
 * 
 * @param {string} id - The ID of the DOM element.
 * @returns {string} The value of the DOM element.
 */
function getValue(id) {
  return document.getElementById(id).value;
}

/**
* Sets the value of a DOM element by its ID.
* 
* @param {string} id - The ID of the DOM element.
* @param {string} value - The value to set for the DOM element. Defaults to an empty string if not provided.
*/
function setValue(id, value) {
  document.getElementById(id).value = value || '';
}

/**
* Retrieves the checked state of a checkbox DOM element by its ID.
* 
* @param {string} id - The ID of the checkbox DOM element.
* @returns {boolean} The checked state of the checkbox.
*/
function getChecked(id) {
  return document.getElementById(id).checked;
}

/**
* Sets the checked state of a checkbox DOM element by its ID.
* 
* @param {string} id - The ID of the checkbox DOM element.
* @param {boolean} value - The checked state to set for the checkbox. Defaults to false if not provided.
*/
function setChecked(id, value) {
  document.getElementById(id).checked = value || false;
}


// ########################################################################################

// DOM triggers

// This code adds an event listener to the 'DOMContentLoaded' event, which fires when the HTML document has finished loading.
document.addEventListener('DOMContentLoaded', () => {
  populateUI();
});

// Add event listeners to the 'Save', 'New Connection' and 'Delete buttons
document.getElementById('delete').addEventListener('click', delete_option);
document.getElementById('save').addEventListener('click', save_option);
document.getElementById('newConnection').addEventListener('click', createBlankConnection);

// Creates and downloads a JSON document containing the exported connections
document.getElementById('exportConnections').addEventListener('click', async () => {
  const connections = await chrome.storage.local.get();
  const blob = new Blob([JSON.stringify(connections)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'solace-connections.json';
  a.click();
});

// Click 'File Input' when 'Import Connections' button is clicked
document.getElementById('importConnections').addEventListener('click', () => {
  document.getElementById('fileInput').click(); // Trigger file input
});


// Process the selected file for import
document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  // Validate file format
  if (file.type !== "application/json" && !file.name.endsWith('.json')) {
    utils.showModalNotification('Error', 'Invalid file format. Please select a JSON file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const connections = JSON.parse(e.target.result);

      // Validate the connections object
      if (!connections || typeof connections !== 'object') {
        throw new Error('Invalid connections object.');
      }

      // Deactivate all connections
      Object.values(connections).forEach((connection) => {
        connection.activated = false;
      });

      // Encrypt connection passwords
      for (const connectionId in connections) {
        const connection = connections[connectionId];
        if (!connection.encrypted) {
          await encryptString(connection.password).then((encryptedData) => {
            connection.password = encryptedData.encryptedString;
            connection.iv = encryptedData.iv;
            connection.encrypted = true;
          });
        }
      }

      
      await chrome.storage.local.set(connections);
      window.location.reload();
    } catch (error) {
      utils.showModalNotification('Error', 'Failed to import connections. Please check the file format.');
    }
  };
  reader.readAsText(file);
});