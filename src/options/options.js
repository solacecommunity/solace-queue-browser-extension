
import * as utils from './optionUtils.js';
import * as crypt from '../lib/encryptionUtils.js';
import { isEmpty, isValidEncryptionKey, isValidMsgVpnUrl, isValidSmfHostProtocol } from '../lib/sharedUtils.js';
import '../lib/solclient-full.js';

// --- Optional Verification ---
// Add this check after the imports to ensure the global got set
if (typeof self.solace === 'undefined' || typeof self.solace.SolclientFactory !== 'object') {
    console.error("Options Page: Global self.solace API object not found after import!");
    // You might want to disable the "Test Connection" button or show an error here
    // if the library fails to initialize.
} else {
    console.log("Options Page: Global self.solace API object seems available.");
}

// DOM triggers

// This code adds an event listener to the 'DOMContentLoaded' event, which fires when the HTML document has finished loading.
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const encryptionKey = await crypt.getEncryptionKey();
    if (isEmpty(encryptionKey)) {
      promptUserForEncryptionKey();
    } else {
      populateUI();
    }
    // Search box event listener
    document.getElementById('searchBox').addEventListener('input', searchConnections);
    // URL generator event listener
    document.getElementById('hostName').addEventListener('input', generateConnectionUrls);

    // ReadOnly State Event Listeners
    document.getElementById('overrideMsgVpnUrl').addEventListener('change', updateReadOnlyStateForMsgVpnUrlInputElement);
    document.getElementById('overrideSmfHost').addEventListener('change', updateReadOnlyStateForSmfHostInputElement);

    // Info Box Event Listeners
    addInfoBoxEventListeners();

    // Toggle the text input placeholder on and off when the input field is focused or blurred
    toggleInputPlaceholder();


    // Add event listeners to the 'Save', 'New Connection' and 'Delete buttons
    document.getElementById('delete').addEventListener('click', deleteOption);
    document.getElementById('save').addEventListener('click', saveConnection);
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


    // // Tests the connection when the 'Test Connection' button is clicked
    // document.getElementById('testConnection').addEventListener('click', testConnection);

    // Display the encryption key input window when the 'Set Encryption Key' button is clicked
    document.getElementById('changeKey').addEventListener('click', changeKey);

    // Display the reset confirmation window when the 'Reset' button is clicked
    document.getElementById('reset').addEventListener('click', resetExtension);

  } catch (error) {
    utils.handleError(error)
  }

});


// ########################################################################################

// DOM Functions

/**
 * Toggle the text input placeholder on and off when the input field is focused or blurred.
 */
function toggleInputPlaceholder() {
  const inputElements = document.querySelectorAll('input');

  inputElements.forEach(input => {
    if (!input.readOnly) { // Skip read-only inputs
      input.addEventListener('focus', () => {
        input.dataset.placeholder = input.placeholder;
        input.placeholder = '';
      });

      input.addEventListener('blur', () => {
        if (input.value === '') {
          input.placeholder = input.dataset.placeholder;
        }
      });
    }
  });
}

/**
 * Adds event listeners to the 'mouseover' and 'mouseout' events for the 
 * 'Override SMF Host' and 'Override Message VPN URL' checkboxes.
 */
function addInfoBoxEventListeners() {
  const elements = [
    { checkboxId: 'overrideMsgVpnUrl', infoBoxId: 'infoBoxMsgVpnUrl' },
    { checkboxId: 'overrideSmfHost', infoBoxId: 'infoBoxSmfHost' },
    { checkboxId: 'showMsgPayload', infoBoxId: 'infoBoxMsgPayload' },
    { checkboxId: 'showUserProps', infoBoxId: 'infoBoxUserProps' }
  ];

  elements.forEach(({ checkboxId, infoBoxId }) => {
    const checkbox = document.getElementById(checkboxId);
    const infoBox = document.getElementById(infoBoxId);

    checkbox.addEventListener('mouseover', () => {
      infoBox.style.display = 'block';
    });

    checkbox.addEventListener('mouseout', () => {
      infoBox.style.display = 'none';
    });
  });
}

/**
 * Updates the read-only state of the SMF Host URL input element based on the state of 
 * the 'Override SMF Host' checkbox.
 */
function updateReadOnlyStateForMsgVpnUrlInputElement() {
  const msgVpnUrlInput = document.getElementById('msgVpnUrl');
  const overrideMsgVpnUrlCheckbox = document.getElementById('overrideMsgVpnUrl');

  if (overrideMsgVpnUrlCheckbox.checked) {
    msgVpnUrlInput.removeAttribute('readonly');
    msgVpnUrlInput.classList.remove('readonly-input');
  } else {
    msgVpnUrlInput.setAttribute('readonly', true);
    msgVpnUrlInput.classList.add('readonly-input');
  }
}

/**
 * Updates the read-only state of the SMF Host URL input element based on the state of
 * the 'Override SMF Host' checkbox.
 */
function updateReadOnlyStateForSmfHostInputElement() {
  const smfHostInput = document.getElementById('smfHost');
  const overrideSmfHostCheckbox = document.getElementById('overrideSmfHost');

  if (overrideSmfHostCheckbox.checked) {
    smfHostInput.removeAttribute('readonly');
    smfHostInput.classList.remove('readonly-input');
  } else {
    smfHostInput.setAttribute('readonly', true);
    smfHostInput.classList.add('readonly-input');
  }
}

/**
 * Builds the Message VPN URL and SMF Host URL based on the host name provided by the user.
 * This function is called each time the user enters a character in the 'hostName' input field.
 */
function generateConnectionUrls() {
  const hostName = document.getElementById('hostName').value;

  const msgVpnUrl = document.getElementById('msgVpnUrl');
  const smfHost = document.getElementById('smfHost');

  if (msgVpnUrl.readOnly) {
    const msgVpnUrlValue = `https://${hostName}.messaging.solace.cloud:943`;
    utils.setValue('msgVpnUrl', msgVpnUrlValue);
  }

  if (smfHost.readOnly) {
    const smfHostValue = `wss://${hostName}.messaging.solace.cloud:443`;
    utils.setValue('smfHost', smfHostValue);
  }
}

/**
 * Filters the connections based on the search input and updates the UI.
 */
async function searchConnections() {
  const searchTerm = document.getElementById('searchBox').value.toLowerCase();
  const connections = await chrome.storage.local.get();

  // Filter connections based on the search term
  const filteredConnections = Object.values(connections).filter(connection => {
    return connection.connectionName.toLowerCase().includes(searchTerm) ||
      connection.msgVpn.toLowerCase().includes(searchTerm) ||
      connection.userName.toLowerCase().includes(searchTerm) ||
      connection.smfHost.toLowerCase().includes(searchTerm);
  });

  // Clear the connections container and re-populate with filtered connections
  document.getElementById('connections').innerHTML = '';
  initConnectionsContainer(filteredConnections);
}

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
    if (isEmpty(connections)) { return; }

    await initSelectedConnection(connections);
    initConnectionsContainer(connections);

  } catch (error) {
    console.error(error);
    utils.showModalNotification('Error', error.message, true);
  }
}

/**
 * Saves the user-defined connection for the application into local storage.
 * This function is typically called when the user submits a form containing various settings or preferences.
 * 
 * Steps performed by the function:
 * 1. Collects the values from the form fields specified in the UI.
 * 2. Constructs an object, `connection`, containing the key-value pairs of the settings.
 * 3. Validates the collected values to ensure they meet the application's requirements.
 *    - This may involve checking for empty fields, ensuring values are within acceptable ranges, etc.
 * 4. If validation passes, the `connection` object is serialized (e.g., converted to a JSON string) and saved to local storage.
 * 5. The user is notified of the successful save operation, often through a UI element such as a toast notification or modal dialog.
 * 6. In case of validation failure or other errors, appropriate feedback is provided to the user, and the save operation is aborted.
 * 
 * Note:
 * - The actual keys and structure of the `connection` object will vary based on the application's specific settings and requirements.
 * - Error handling should be implemented to catch and manage exceptions, especially those related to local storage limits or permissions.
 */

async function saveConnection() {
  try {
    // Set DOM connection ID
    utils.setValue('connectionId', utils.getValue('connectionId') || crypto.randomUUID());

    // Check for any missing fields
    if (!validateMandatoryConnectionFieldValues()) {
      utils.showModalNotification('Error', 'Please fill in all required fields.');
      return;
    }

    const currentConnection = {
      id: utils.getValue('connectionId'),
      connectionName: utils.getValue('connectionName'),
      hostName: utils.getValue('hostName'),
      smfHost: utils.getValue('smfHost'),
      msgVpn: utils.getValue('msgVpn'),
      msgVpnUrl: utils.getValue('msgVpnUrl'),
      userName: utils.getValue('userName'),
      password: utils.getValue('password'),
      overrideSmfHost: utils.getChecked('overrideSmfHost'),
      overrideMsgVpnUrl: utils.getChecked('overrideMsgVpnUrl'),
      showUserProps: utils.getChecked('showUserProps'),
      showMsgPayload: utils.getChecked('showMsgPayload'),
      selected: true,
      encrypted: false,
      iv: null
    };

    // Validate JavaScript API Endpoint URL
    if (!isValidSmfHostProtocol(currentConnection.smfHost)) {
      utils.showModalNotification('Invalid protocol', 'For the JavaScript API Enpoint field, please use one of ws://, wss://, http://, https://');
      return;
    }

    // Validate Message VPN URL
    if (!isValidMsgVpnUrl(currentConnection.msgVpnUrl)) {
      utils.showModalNotification('Invalid URL', 'For the Message VPN URL filed, please use a URL matching https://{{your_domain}}.messaging.solace.cloud or http(s?)://localhost:{{your_port}}/');
      return;
    }

    const encryptionKey = await crypt.getEncryptionKey();
    if (isEmpty(encryptionKey)) { return; }

    // Before saving the connection, test the connection to ensure it is valid
    // TODO: Refactor testConnection to return a Promise and await it here
    testConnection();

    // Decode base64 encryption key to array buffer
    const encryptionKeyArrayBuffer = crypt.base64ToArrayBuffer(encryptionKey);

    // Encrypt the password and store the encrypted string and IV
    await crypt.encryptString(currentConnection.password, encryptionKeyArrayBuffer).then((encryptedData) => {
      currentConnection.password = encryptedData.encryptedString;
      currentConnection.iv = encryptedData.iv;
      currentConnection.encrypted = true;
    });

    const connections = await chrome.storage.local.get();

    // Deselect all connections
    Object.values(connections).forEach(connection => connection.selected = false);

    connections[currentConnection.id] = currentConnection;
    await chrome.storage.local.set(connections);

    // Remove connections container
    document.getElementById('connections').innerHTML = '';
    await initSelectedConnection(connections); // Repopulate form with saved (potentially new) data
    initConnectionsContainer(connections); // Repopulate connections container

    utils.showToastNotification('Connection saved successfully!');

  } catch (error) {
    utils.handleError(error);
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

    utils.setValue('connectionId', newConnectionId);

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
    utils.handleError(error);
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
        await chrome.storage.local.remove(utils.getValue('connectionId'));
      }

      // Remove from DOM
      selectedConnection.remove();
      // Clear existing input fields for connection details so the user can enter new values.
      clearConnectionFields();
      utils.showToastNotification('Connection deleted!', 'info');
    }
  } catch (error) {
    utils.handleError(error);
  }
}


// Test the connection to the Solace PubSub+ Event Broker
function testConnection() {

  // Initialize the Solace factory
  const factoryProps = new self.solace.SolclientFactoryProperties();
  factoryProps.profile = self.solace.SolclientFactoryProfiles.version10;
  self.solace.SolclientFactory.init(factoryProps);

  // Get the active connection
  const currentConnection = {
    id: utils.getValue('connectionId'),
    smfHost: utils.getValue('smfHost'),
    msgVpn: utils.getValue('msgVpn'),
    userName: utils.getValue('userName'),
    password: utils.getValue('password'),
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
    session = self.solace.SolclientFactory.createSession({
      url: currentConnection.smfHost,
      vpnName: currentConnection.msgVpn,
      userName: currentConnection.userName,
      password: currentConnection.password,
      connectRetries: 0,
    });
  } catch (error) {
    console.error(error);
    utils.showToastNotification(error.message, 'error', 7000);
  }
  // define session event listeners
  session.on(self.solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
    console.log('=== Successfully connected and ready to view messages. ===');
    utils.showToastNotification('Successfully connected and ready to view messages.', 'success', 7000);
  });
  session.on(self.solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
    switch (sessionEvent.errorSubcode) {
      case self.solace.ErrorSubcode.MESSAGE_VPN_NOT_ALLOWED:
        console.error(sessionEvent.infoStr, `The Message VPN name configured for the session does not exist. | Solace Error Code: ${sessionEvent.errorSubcode}`);
        utils.showToastNotification(`The Message VPN name configured for the session does not exist. | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
      case self.solace.ErrorSubcode.LOGIN_FAILURE:
        console.error(sessionEvent.infoStr, `The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`);
        utils.showToastNotification(`The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
      case self.solace.ErrorSubcode.CLIENT_ACL_DENIED:
        console.error(sessionEvent.infoStr, `Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`);
        utils.showToastNotification(`Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
      default:
        console.error('Error', `${sessionEvent.message} | Solace Error Code: ${sessionEvent.errorSubcode}`);
        utils.showToastNotification(`${sessionEvent.message} | Solace Error Code: ${sessionEvent.errorSubcode}`, 'error', 7000);
        break;
    }
  });
  session.on(self.solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
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

  if (!submitButton || !inputBox) { return; }

  // Handle the submit button click
  submitButton.addEventListener('click', async (event) => {
    try {
      event.stopPropagation();
      const inputValue = inputBox.value;
      if (inputValue) {
        await reencryptConnections(inputValue);
        document.body.removeChild(encryptionKeyInputWindow);
        utils.showToastNotification('Encryption key saved successfully!', 'success', 7000);
      } else {
        utils.showModalNotification('Missing Key', 'No key has been entered. Please enter an encryption key');
      }
    } catch (error) {
      crypt.setEncryptionKey(''); // If an error occurs, clear the encryption key to prevent new key from being saved.
      document.body.removeChild(encryptionKeyInputWindow);
      utils.handleError(error);
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

  if (!submitButton || !inputBox) { return; }

  // Handle the submit button click
  submitButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    const inputValue = inputBox.value;
    if (!isValidEncryptionKey(inputValue)) {
      utils.showModalNotification('Invalid Key', 'The encryption key must be at least 8 characters long, at least 1 capital letter, contain at least 1 number, and at least 1 symbol.');
      return;
    }
    if (isEmpty(inputValue)) {
      utils.showModalNotification('Missing Key', 'No key has been entered. Please enter an encryption key');
      return;
    }

    // Generate a SHA-256 hash of the encryption key and save it in session storage
    const hashedKey = await crypt.generateSHA256Hash(inputValue);

    const base64HashedKey = crypt.arrayBufferToBase64(hashedKey);
    await crypt.setEncryptionKey(base64HashedKey);

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
    const encryptionKey = await crypt.getEncryptionKey();
    if (isEmpty(encryptionKey)) { return; }

    for (const connectionId in connections) {
      const connection = connections[connectionId];
      connection.selected = false;
      connection.iv = null;
      connection.encrypted = false;

      if (!connection.encrypted) { continue; }

      // Base64 decode the encryption key
      const encryptionKeyArrayBuffer = crypt.base64ToArrayBuffer(encryptionKey);

      await crypt.decryptString(connection.password, connection.iv, encryptionKeyArrayBuffer).then((decryptedData) => {
        connection.password = decryptedData;
      });
    }

    const blob = new Blob([JSON.stringify(connections)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solace-connections.json';
    a.click();

  } catch (error) {
    utils.handleError(error);
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
    const encryptionKey = await crypt.getEncryptionKey();
    if (isEmpty(encryptionKey)) { return; }
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
        if (!connection.encrypted) { continue; }

        // Base64 decode the encryption key
        const encryptionKeyArrayBuffer = crypt.base64ToArrayBuffer(encryptionKey);

        await crypt.encryptString(connection.password, encryptionKeyArrayBuffer).then((encryptedData) => {
          connection.password = encryptedData.encryptedString;
          connection.iv = encryptedData.iv;
          connection.encrypted = true;
        });
      }

      // Merge the imported connections with the existing connections
      const existingConnections = await chrome.storage.local.get();
      for (const connectionId in connections) {
        if (connectionId in existingConnections) {
          connections[connectionId].id = crypto.randomUUID();
        }
        existingConnections[connections[connectionId].id] = connections[connectionId];
      }

      await chrome.storage.local.set(existingConnections);
      window.location.reload();
    };
    reader.readAsText(file);
  } catch (error) {
    utils.handleError(error);
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
    utils.handleError(error);
  }
}

// ################################################################################################

// General Functions

/**
 * Displays the connection from local storage and populates the input fields with the saved values.
 */
async function getConnection() {
  try {
    // Removes the 'selected' class from all connection rows to reset the selection state
    document.querySelectorAll('.row').forEach(el => el.classList.remove('selected'));
    // Adds the 'selected' class to the currently clicked connection row, highlighting it
    document.getElementById(this.id).classList.add('selected');

    let connection = await chrome.storage.local.get(this.id);
    // Checks if the retrieved connection object is not empty
    if (isEmpty(connection)) {
      // Clears the form fields if the connection object is empty (e.g., new connection)
      clearConnectionFields();
      utils.setValue('connectionId', this.id);
      return;
    }


    // Extracts the connection details specific to the clicked connection ID
    connection = connection[this.id];

    // Validate the encryption key
    const encryptionKey = await crypt.getEncryptionKey();
    if (isEmpty(encryptionKey)) { return; }
    if (connection.encrypted) {
      // Decode base64 encryption key to array buffer
      const encryptionKeyArrayBuffer = crypt.base64ToArrayBuffer(encryptionKey);

      await crypt.decryptString(connection.password, connection.iv, encryptionKeyArrayBuffer).then((decryptedData) => {
        connection.password = decryptedData;
      });
    }

    // Populates the form fields with the retrieved connection details
    utils.setValue('connectionId', connection.id);
    utils.setValue('connectionName', connection.connectionName);
    utils.setValue('hostName', connection.hostName);
    utils.setValue('smfHost', connection.smfHost);
    utils.setValue('msgVpn', connection.msgVpn);
    utils.setValue('msgVpnUrl', connection.msgVpnUrl);
    utils.setValue('userName', connection.userName);
    utils.setValue('password', connection.password);
    utils.setChecked('overrideSmfHost', connection.overrideSmfHost);
    utils.setChecked('overrideMsgVpnUrl', connection.overrideMsgVpnUrl);
    utils.setChecked('showUserProps', connection.showUserProps);
    utils.setChecked('showMsgPayload', connection.showMsgPayload);

    document.getElementById('save').textContent = 'Save';
    document.getElementById('save').style.backgroundColor = '#009dff';

    // Update the read-only state of the input fields based on the override checkboxes
    updateReadOnlyStateForSmfHostInputElement();
    updateReadOnlyStateForMsgVpnUrlInputElement();

    // Validates the mandatory fields in the connection form - adding red required asterisks if any are missing
    validateMandatoryConnectionFieldValues();

  } catch (error) {
    utils.handleError(error);
  }
}

/**
 * Clears the input fields for the connection fields.
 */
function clearConnectionFields() {
  try {
    // Clear the values of the input fields
    utils.setValue('connectionId', '');
    utils.setValue('connectionName', '');
    utils.setValue('userName', '');
    utils.setValue('password', '');
    utils.setValue('msgVpn', '');
    utils.setValue('hostName', '');
    utils.setValue('msgVpnUrl', 'https://{{host_name}}.messaging.solace.cloud:943');
    utils.setValue('smfHost', 'wss://{{host_name}}.messaging.solace.cloud:443');
    utils.setChecked('overrideMsgVpnUrl', false);
    utils.setChecked('overrideSmfHost', false);
    utils.setChecked('showUserProps', false);
    utils.setChecked('showMsgPayload', false);

    updateReadOnlyStateForSmfHostInputElement();
    updateReadOnlyStateForMsgVpnUrlInputElement();

    validateMandatoryConnectionFieldValues();

  } catch (error) {
    utils.handleError(error);
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

  if (isEmpty(selectedConnection)) { return; }

  // Validate the encryption key
  const encryptionKey = await crypt.getEncryptionKey();
  if (isEmpty(encryptionKey)) { return; }
  if (selectedConnection.encrypted) {
    // Decode base64 encryption key to array buffer
    const encryptionKeyArrayBuffer = crypt.base64ToArrayBuffer(encryptionKey);
    await crypt.decryptString(selectedConnection.password, selectedConnection.iv, encryptionKeyArrayBuffer).then((decryptedData) => {
      selectedConnection.password = decryptedData;
    });
  }

  // Populate the input fields with the values of the activeated connection
  utils.setValue('connectionId', selectedConnection.id);
  utils.setValue('connectionName', selectedConnection.connectionName);
  utils.setValue('hostName', selectedConnection.hostName);
  utils.setValue('smfHost', selectedConnection.smfHost);
  utils.setValue('msgVpn', selectedConnection.msgVpn);
  utils.setValue('msgVpnUrl', selectedConnection.msgVpnUrl);
  utils.setValue('userName', selectedConnection.userName);
  utils.setValue('password', selectedConnection.password);
  utils.setChecked('overrideSmfHost', selectedConnection.overrideSmfHost);
  utils.setChecked('overrideMsgVpnUrl', selectedConnection.overrideMsgVpnUrl);
  utils.setChecked('showUserProps', selectedConnection.showUserProps);
  utils.setChecked('showMsgPayload', selectedConnection.showMsgPayload);


  // Update the read-only state of the input fields based on the override checkboxes
  updateReadOnlyStateForSmfHostInputElement();
  updateReadOnlyStateForMsgVpnUrlInputElement();

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
    id: utils.getValue('connectionId'),
    connectionName: utils.getValue('connectionName'),
    hostName: utils.getValue('hostName'),
    smfHost: utils.getValue('smfHost'),
    msgVpn: utils.getValue('msgVpn'),
    msgVpnUrl: utils.getValue('msgVpnUrl'),
    userName: utils.getValue('userName'),
    password: utils.getValue('password'),
    overrideMsgVpnUrl: utils.getChecked('overrideMsgVpnUrl'),
    overrideSmfHost: utils.getChecked('overrideSmfHost')
  };

  // Gather the keys of the fields with missing values
  const missingValues = Object.entries(connectionFieldValues).filter(([key, value]) => value === '').map(([key]) => key);

  // Skip adding asterisk to hostName if overrideSmfHost and overrideMsgVpnUrl are checked
  if (connectionFieldValues.overrideSmfHost && connectionFieldValues.overrideMsgVpnUrl) {
    const index = missingValues.indexOf('hostName');
    if (index > -1) {
      missingValues.splice(index, 1);
    }
  }

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
  if (isEmpty(connections)) { return; }
  // Generate a new SHA-256 hash for the new encryption key
  // This is required as encryptString expects a SHA-256 hash key
  const newEncryptionKeyHash = await crypt.generateSHA256Hash(newEncryptionKey);

  // Retreive hashed encryption key from session storage
  const base64HashKey = await crypt.getEncryptionKey();

  // Decode the base64 hash key to an array buffer.
  // This is required as decryptString expects an array buffer key.
  const existingEncryptionKey = crypt.base64ToArrayBuffer(base64HashKey);

  // Re-encrypt all connection passwords using the new encryption key
  for (const connectionId in connections) {
    const connection = connections[connectionId];
    if (!connection.encrypted) { continue; }
    await crypt.decryptString(connection.password, connection.iv, existingEncryptionKey).then((decryptedData) => {
      connection.password = decryptedData;
    });
    await crypt.encryptString(connection.password, newEncryptionKeyHash).then((encryptedData) => {
      connection.password = encryptedData.encryptedString;
      connection.iv = encryptedData.iv;
    });
  }
  // Encode the new encryption key hash to base64 and save it.
  const base64KeyHash = crypt.arrayBufferToBase64(newEncryptionKeyHash);
  await crypt.setEncryptionKey(base64KeyHash);

  await chrome.storage.local.set(connections);
}