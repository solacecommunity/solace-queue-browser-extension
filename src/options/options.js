
import * as utils from '../lib/utils.js';
import { encryptString, decryptString } from '../lib/encryptionUtils.js';

// ########################################################################################

// DOM triggers

// This code adds an event listener to the 'DOMContentLoaded' event, which fires when the HTML document has finished loading.
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const encryptionKey = await getEncryptionKey();
    if (utils.isEmpty(encryptionKey)) {
      promptUserForEncryptionKey();
    } else {
      populateUI();
    }
  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message);
  }

});

// Add event listeners to the 'Save', 'New Connection' and 'Delete buttons
document.getElementById('delete').addEventListener('click', deleteOption);
document.getElementById('save').addEventListener('click', saveOption);
document.getElementById('newConnection').addEventListener('click', createBlankConnection);

// Creates and downloads a JSON document containing the exported connections
document.getElementById('exportConnections').addEventListener('click', exportConnections);


// Click 'File Input' when 'Import Connections' button is clicked
document.getElementById('importConnections').addEventListener('click', () => {
  const fileInput = document.getElementById('fileInput');
  fileInput.value = ''; // Reset the file input
  fileInput.click();
});

// Process the selected file for import
document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  importFile(file);
});

// Tests the connection when the 'Test Connection' button is clicked
document.getElementById('testConnection').addEventListener('click', testConnection);

// Display the encryption key input window when the 'Set Encryption Key' button is clicked
document.getElementById('changeKey').addEventListener('click', changeKey);

// Display the reset confirmation window when the 'Reset' button is clicked
document.getElementById('reset').addEventListener('click', resetExtension);


// ########################################################################################

// DOM Functions

/**
 * Displays the saved connections from local storage and populates the input fields with the values of the first connection.
 * Also adds event listeners to each connection row.
 */
async function populateUI() {
  try {

    // Remove all elements in the 'connections' container
    document.getElementById('connections').innerHTML = '';

    // Clear the connection fields to ensure a clean state
    validateMandatoryConnectionFieldValues();

    // Return if there are no connections saved in local storage
    let connections = await chrome.storage.local.get();
    if (utils.isEmpty(connections)) {
      return;
    }

    await initSelectedConnection(connections);
    initConnectionsContainer(connections);

  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message, true);
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

async function saveOption() {
  try {

    // Set DOM connection ID
    setValue('connectionId', getValue('connectionId') || crypto.randomUUID());

    // Check for any missing fields
    if (!validateMandatoryConnectionFieldValues()) {
      utils.showModalNotification('Error', 'Please fill in all required fields.');
      return;
    }

    const currentConnection = {
      id: getValue('connectionId'),
      connectionName: getValue('connectionName'),
      smfHost: getValue('smfHost'),
      msgVpn: getValue('msgVpn'),
      msgVpnUrl: getValue('msgVpnUrl'),
      userName: getValue('userName'),
      password: getValue('password'),
      showUserProps: getChecked('showUserProps'),
      showMsgPayload: getChecked('showMsgPayload'),
      selected: true,
      encrypted: false,
      iv: null
    };

    // Validate JavaScript API Endpoint URL
    if (!isValidSmfHostProtocol(currentConnection.smfHost)) {
      utils.showModalNotification('Invalid protocol','For the JavaScript API Enpoint field, please use one of ws://, wss://, http://, https://');
      return;
    }
    
    // Validate Message VPN URL
    if (!isValidMsgVpnUrl(currentConnection.msgVpnUrl)) {
      utils.showModalNotification('Invalid URL','For the Message VPN URL filed, please use a URL matching https://{{your_domain}}.messaging.solace.cloud:943');
      return;
    }

    const encryptionKey = await getEncryptionKey();
    if (utils.isEmpty(encryptionKey)) {
      return;
    }

    // Encrypt the password and store the encrypted string and IV
    await encryptString(currentConnection.password, encryptionKey).then((encryptedData) => {
      currentConnection.password = encryptedData.encryptedString;
      currentConnection.iv = encryptedData.iv;
      currentConnection.encrypted = true;
    });

    const connections = await chrome.storage.local.get();

    // Deselect all connections if the current connection is selected
    if (currentConnection.selected === true) {
      Object.entries(connections).forEach(([connectionId, connection]) => {
        connection.selected = false;
      });
    }

    connections[currentConnection.id] = currentConnection;
    chrome.storage.local.set(connections);

    // Remove connections container
    document.getElementById('connections').innerHTML = '';

    utils.showToastNotification('Connection saved successfully!');

    await initSelectedConnection(connections);
    initConnectionsContainer(connections);

  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message);
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
 * 6. Adds an event listener to the new connection element that calls the getConnection() function when the element is clicked.
 * 
 * Note:
 * - The function assumes the existence of a 'connections' container in the DOM where the new connection UI element will be appended.
 * - The clearConnectionFields() function is expected to clear any form fields or UI elements related to connection details.
 * - The getConnection() function is expected to handle the event when the new connection UI element is clicked, likely populating form fields with the connection's details.
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
    document.getElementById(newConnectionId).addEventListener('click', getConnection);
  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message);
  }
}

/**
 * Deletes the selected connection option from the DOM and removes its details from local storage.
 */
async function deleteOption() {
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
    console.error(error);
    utils.showModalNotification('Error', error.message);
  }
}


// Test the connection to the Solace PubSub+ Event Broker
function testConnection() {

  // Initialize the Solace factory
  const factoryProps = new solace.SolclientFactoryProperties();
  factoryProps.profile = solace.SolclientFactoryProfiles.version10;
  solace.SolclientFactory.init(factoryProps);

  // Get the active connection
  const currentConnection = {
    id: getValue('connectionId'),
    smfHost: getValue('smfHost'),
    msgVpn: getValue('msgVpn'),
    userName: getValue('userName'),
    password: getValue('password'),
  };

  // Validate the mandatory fields
  if (!validateMandatoryConnectionFieldValues()) {
    utils.showModalNotification('Missing mandatory fields', 'Please fill in all required fields.');
    return;
  }

  // Validate URL protocol
  if (!isValidSmfHostProtocol(currentConnection.smfHost)) {
    utils.showModalNotification('Invalid protocol', 'For the Message VPN URL filed, please use one of ws://, wss://, http://, https://');
    return;
  }

  let session = null;
  try {
    // Login to Solace
    session = solace.SolclientFactory.createSession({
      url: currentConnection.smfHost,
      vpnName: currentConnection.msgVpn,
      userName: currentConnection.userName,
      password: currentConnection.password,
      connectRetries: 0,
    });
  } catch (error) {
    console.error(error);
    // utils.showModalNotification(error.name, error.message);
    utils.showToastNotification(error.message, 'error', 7000);
  }
  // define session event listeners
  session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
    console.log('=== Successfully connected and ready to view messages. ===');
    // utils.showModalNotification('Success', 'Successfully connected and ready to view messages.', true);
    utils.showToastNotification('Successfully connected and ready to view messages.', 'success', 7000);
  });
  session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
    switch (sessionEvent.errorSubcode) {
      case solace.ErrorSubcode.MESSAGE_VPN_NOT_ALLOWED:
        console.error(sessionEvent.infoStr, `The Message VPN name configured for the session does not exist. | Solace Error Code: ${sessionEvent.errorSubcode}`);
        // utils.showModalNotification(sessionEvent.infoStr, `The Message VPN name configured for the session does not exist`);
        utils.showToastNotification(`The Message VPN name configured for the session does not exist. | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
      case solace.ErrorSubcode.LOGIN_FAILURE:
        console.error(sessionEvent.infoStr, `The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`);
        // utils.showModalNotification(sessionEvent.infoStr, `The username or password is incorrect.`);
        utils.showToastNotification(`The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
      case solace.ErrorSubcode.CLIENT_ACL_DENIED:
        console.error(sessionEvent.infoStr, `Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`);
        // utils.showModalNotification(sessionEvent.infoStr, `The username or password is incorrect.`);
        utils.showToastNotification(`Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
      default:
        console.error(sessionEvent.infoStr, `Check correct parameter values and connectivity. | Solace Error Code: ${sessionEvent.errorSubcode}`);
        // utils.showModalNotification(sessionEvent.infoStr, `Check correct parameter values and connectivity!`);
        utils.showToastNotification(`Check correct parameter values and connectivity | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
    }
  });
  session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
    console.log('Disconnected.');
    if (session !== null) {
      session.dispose();
      session = null;
    }
  });

  try {
    session.connect();
  } catch (error) {
    console.error(error);
    utils.showModalNotification(error.name, error.message);
  }

  setTimeout(() => {
    console.log('Disconnecting from Solace PubSub+ Event Broker...');
    if (session !== null) {
      try {
        session.disconnect();
      } catch (error) {
        console.error(error.toString());
      }
    } else {
      console.log('Not connected to Solace PubSub+ Event Broker.');
    }
  }, 2000); // 2 seconds

}


/**
 * This function does the following:
 * 1. Displays an input window to prompt the user to enter an encryption key.
 * 2. When the user clicks the submit button, the entered key is used to re-encrypt all connection passwords.
 * 3. The new encryption key is then saved in session storage.
 */
function changeKey() {
  utils.displayEncryptionKeyInputWindow('Change encryption key', 'All connection passwords will be re-encrypted using the new key.', true);
  const encryptionKeyInputWindow = document.getElementById('encryption-key-input-window');
  const submitButton = document.getElementById('encryption-key-input-submit-button');
  const inputBox = document.getElementById('encryption-key-input');

  if (!submitButton || !inputBox) {
    return;
  }

  // Handle the submit button click
  submitButton.addEventListener('click', async (event) => {
    try {
      event.stopPropagation();
      const inputValue = inputBox.value;
      if (inputValue) {
        await reencryptConnections(inputValue);
        await setEncryptionKey(inputValue);
        document.body.removeChild(encryptionKeyInputWindow);
        utils.showToastNotification('Encryption key saved successfully!', 'success', 7000);
      } else {
        utils.showModalNotification('Missing Key', 'No key has been entered. Please enter an encryption key');
      }
    } catch (error) {
      setEncryptionKey('');
      document.body.removeChild(encryptionKeyInputWindow);
      console.error(error);
      utils.showModalNotification('Error', error.message);
    }
  });
}

/**
 * Displays an input window to prompt the user to enter an encryption key.
 * 
 * This function does the following:
 * 1. Displays an input window to prompt the user to enter an encryption key.
 * 2. When the user clicks the submit button, the entered key is saved in session storage.
 */
function promptUserForEncryptionKey() {
  utils.displayEncryptionKeyInputWindow('Enter Encryption Key', 'Enter the encryption key to decrypt the messages.', false, true);
  const encryptionKeyInputWindow = document.getElementById('encryption-key-input-window');
  const submitButton = document.getElementById('encryption-key-input-submit-button');
  const resetButton = document.getElementById('reset-option-btn');
  const inputBox = document.getElementById('encryption-key-input');

  if (!submitButton || !inputBox) {
    return;
  }

  // Handle the submit button click
  submitButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    const inputValue = inputBox.value;
    if (!isValidEncryptionKey(inputValue)) {
      utils.showModalNotification('Invalid Key', 'The encryption key must be at least 8 characters long, at least 1 capital letter, contain at least 1 number, and at least 1 symbol.');
      return;
    }
    if (utils.isEmpty(inputValue)) {
      utils.showModalNotification('Missing Key', 'No key has been entered. Please enter an encryption key');
      return;
    }

    await setEncryptionKey(inputValue);
    document.body.removeChild(encryptionKeyInputWindow);
    // At this point, we do not know if the encryption key is correct, so the UI should be reloaded.
    // populateUI() will load and decrypt the connections using the encryption key.
    // If the key is incorrect, the decryption will fail, and the user will be prompted to enter the key again.
    populateUI();
  });

  resetButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    resetExtension();
  });
}

/**
 * Exports the connections to a JSON file.
 * 
 * This function does the following:
 * 1. Retrieves the connections from local storage.
 * 2. Decrypts the passwords of the connections using the encryption key.
 * 3. Creates a JSON blob containing the connections.
 * 4. Creates a download link for the JSON blob and triggers the download.
 */
async function exportConnections() {
  try {
    const connections = await chrome.storage.local.get();
    // Validate the encryption key
    const encryptionKey = await getEncryptionKey();
    if (utils.isEmpty(encryptionKey)) {
      return;
    }

    for (const connectionId in connections) {
      const connection = connections[connectionId];

      connection.selected = false;
      if (connection.encrypted) {
        await decryptString(connection.password, connection.iv, encryptionKey).then((decryptedData) => {
          connection.password = decryptedData;
        });
        connection.iv = null;
        connection.encrypted = false;
      }
    }
    const blob = new Blob([JSON.stringify(connections)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solace-connections.json';
    a.click();

  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message);
  }
}

/**
 * Imports the connections from a JSON file.
 * 
 * This function does the following:
 * 1. Validates the file format to ensure it is a JSON file.
 * 2. Reads the contents of the file and parses it as JSON.
 * 3. Deactivates all connections in the imported file.
 * 4. Encrypts the passwords of the connections using the encryption key.
 * 5. Saves the connections to local storage.
 * 6. Reloads the page to reflect the changes.
 */
async function importFile(file) {
  if (!file) {
    return;
  }

  // Validate file format
  if (file.type !== "application/json" && !file.name.endsWith('.json')) {
    utils.showModalNotification('Error', 'Invalid file format. Please select a JSON file.');
    return;
  }

  try {
    const encryptionKey = await getEncryptionKey();
    if (utils.isEmpty(encryptionKey)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const connections = JSON.parse(e.target.result);

      // Validate the connections object
      if (!connections || typeof connections !== 'object') {
        throw new Error('Invalid connections object.');
      }

      // Encrypt connection passwords
      for (const connectionId in connections) {
        const connection = connections[connectionId];
        if (!connection.encrypted) {
          await encryptString(connection.password, encryptionKey).then((encryptedData) => {
            connection.password = encryptedData.encryptedString;
            connection.iv = encryptedData.iv;
            connection.encrypted = true;
          });
        }
      }

      await chrome.storage.local.set(connections);
      window.location.reload();
    };
    reader.readAsText(file);
  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message);
  }

}

/**
 * Resets the extension by clearing all storage areas and reloading the page.
 */
function resetExtension() {
  try {
    utils.showResetConfirmationWindow();

    const resetConfirmationWindow = document.getElementById('reset-confirmation-window');
    const resetConfirmationButton = document.getElementById('reset-confirmation-submit-button');
    resetConfirmationButton.addEventListener('click', async (event) => {
      event.stopPropagation();
      chrome.storage.local.clear();
      chrome.storage.sync.clear();
      chrome.storage.session.clear();
      document.body.removeChild(resetConfirmationWindow);
      utils.showToastNotification('Extension has been reset successfully!', 'success', 7000);
      utils.showModalNotification('Extension Reset', 'Extension has been reset successfully.', true);
    });
  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message);
  }
}

// ################################################################################################

// General Functions

/**
 * Displays the options from local storage and populates the input fields with the saved values.
 */
async function getConnection() {
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

    const encryptionKey = await getEncryptionKey();
    if (utils.isEmpty(encryptionKey)) {
      return;
    }

    // Extracts the connection details specific to the clicked connection ID
    connection = connection[this.id];

    if (connection.encrypted) {
      await decryptString(connection.password, connection.iv, encryptionKey).then((decryptedData) => {
        connection.password = decryptedData;
      });
    }

    // Populates the form fields with the retrieved connection details
    setValue('connectionId', connection.id);
    setValue('connectionName', connection.connectionName);
    setValue('smfHost', connection.smfHost);
    setValue('msgVpn', connection.msgVpn);
    setValue('msgVpnUrl', connection.msgVpnUrl);
    setValue('userName', connection.userName);
    setValue('password', connection.password);
    setChecked('showUserProps', connection.showUserProps);
    setChecked('showMsgPayload', connection.showMsgPayload);

    document.getElementById('save').textContent = 'Save';
    document.getElementById('save').style.backgroundColor = '#009dff';

    // Validates the mandatory fields in the connection form - adding red required asterisks if any are missing
    validateMandatoryConnectionFieldValues();

  } catch (error) {
    console.error(error);
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


    validateMandatoryConnectionFieldValues();

  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message);
  }
}

// ########################################################################################

// Helper functions
/**
 * Initialize Connection Instances container
 * 
 * @param {object} connections - The connections object containing the connection details.
 */
function initConnectionsContainer(connections) {

  // Sort the connections by connectionName
  const sortedConnections = Object.values(connections).sort((a, b) => a.connectionName.localeCompare(b.connectionName));

  // Iterate over each connection and create HTML elements to display them
  sortedConnections.forEach((connection) => {
    let connectionHTML = `
      <div id="${connection.id}" class="container row ${connection.selected ? 'selected' : ''}">
        <div class="left-container">
          <h2 class="headers">${connection.connectionName}</h2>
          <p class="sub-headers">${connection.smfHost}</p>
        </div>
    `;

    connectionHTML += `</div>`;

    // Append the connection HTML to the connections element
    document.getElementById('connections').insertAdjacentHTML('beforeend', connectionHTML);
    document.getElementById(connection.id).addEventListener('click', getConnection);
  });
}

/**
 * Initialize the active connection
 * 
 * @param {object} connections - The connections object containing the connection details.
 */
async function initSelectedConnection(connections) {

  // Set selected connection if found
  let selectedConnection;
  Object.values(connections).forEach((connection) => {
    if (connection.selected === true) {
      selectedConnection = connection;
      return;
    }
  });

  if (utils.isEmpty(selectedConnection)) {
    return;
  }

  // Validate the encryption key
  const encryptionKey = await getEncryptionKey();
  if (utils.isEmpty(encryptionKey)) {
    return;
  }

  if (selectedConnection.encrypted) {
    try {
      await decryptString(selectedConnection.password, selectedConnection.iv, encryptionKey).then((decryptedData) => {
        selectedConnection.password = decryptedData;
      });
    } catch (error) {
      setEncryptionKey('');
      throw error;
    }
  }

  // Populate the input fields with the values of the activeated connection
  setValue('connectionId', selectedConnection.id);
  setValue('connectionName', selectedConnection.connectionName);
  setValue('smfHost', selectedConnection.smfHost);
  setValue('msgVpn', selectedConnection.msgVpn);
  setValue('msgVpnUrl', selectedConnection.msgVpnUrl);
  setValue('userName', selectedConnection.userName);
  setValue('password', selectedConnection.password);
  setChecked('showUserProps', selectedConnection.showUserProps);
  setChecked('showMsgPayload', selectedConnection.showMsgPayload);

  // Validate the connection field values
  validateMandatoryConnectionFieldValues();

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
    msgVpnUrl: getValue('msgVpnUrl'),
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
 * Reencrypts all connection passwords using the new encryption key.
 * 
 * @param {string} newEncryptionKey - The new encryption key to use for re-encryption.
 */
async function reencryptConnections(newEncryptionKey) {
  const connections = await chrome.storage.local.get();
  if (utils.isEmpty(connections)) {
    return;
  }
  const encryptionKey = await getEncryptionKey();
  for (const connectionId in connections) {
    const connection = connections[connectionId];
    if (connection.encrypted) {
      try {
        await decryptString(connection.password, connection.iv, encryptionKey).then((decryptedData) => {
          connection.password = decryptedData;
        });
      } catch (error) {
        setEncryptionKey('');
        throw error;
      }
      await encryptString(connection.password, newEncryptionKey).then((encryptedData) => {
        connection.password = encryptedData.encryptedString;
        connection.iv = encryptedData.iv;
      });
    }
  }
  await chrome.storage.local.set(connections);
  utils.showToastNotification('Connections re-encrypted successfully!', 'success', 7000);
}

/**
 * Validates the Message VPN URL.
 * 
 * @param {string} msgVpnUrl - The Message VPN URL to validate.
 * @returns {boolean} - Returns true if the URL is valid, false otherwise.
 */
function isValidMsgVpnUrl(msgVpnUrl) {
  const regex = /^https:\/\/.*\.messaging\.solace\.cloud:943\/?$/;
  return regex.test(msgVpnUrl);
}

/**
 * Validates if the encryption key meets the required criteria.
 * 
 * @param {string} key - The encryption key to validate.
 * @returns {boolean} - Returns true if the key is valid, false otherwise.
 */
function isValidEncryptionKey(key) {
  const minLength = 8;
  const hasNumber = /\d/;
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/;
  const hasCapitalLetter = /[A-Z]/;

  return key.length >= minLength && hasNumber.test(key) && hasSymbol.test(key) && hasCapitalLetter.test(key);
}

/**
 * Validates the Solace Message Router Host protocol.
 * 
 * @param {string} smfHost - The Solace Message Router Host to validate.
 * @returns {boolean} - Returns true if the protocol is valid, false otherwise.
 */
function isValidSmfHostProtocol(smfHost) {
  const regex = /^(ws|wss|http|https):\/\/.*/;
  return regex.test(smfHost);
}

/**
 * Retrieves the encryption key from session storage.
 * 
 * @returns {string} The encryption key stored in session storage.
 */
async function getEncryptionKey() {
  const encryptionKey = await chrome.storage.session.get('encryptionKey');
  return encryptionKey.encryptionKey;
}

/**
 * Sets the encryption key in session storage.
 * 
 * @param {string} encryptionKey - The encryption key to store in session storage.
 */
async function setEncryptionKey(encryptionKey) {
  chrome.storage.session.set({ 'encryptionKey': encryptionKey });
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
