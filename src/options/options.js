// Description: This file is used to save the user's login details to the chrome storage.

/**
 * Saves the user input values to the local storage.
 * This function is typically triggered when the user clicks on the 'Save' button.
 */
function save_options() {
  const loginDetails = {
    smfHost: document.getElementById('smfHost').value,
    msgVpn: document.getElementById('msgVpn').value,
    userName: document.getElementById('userName').value,
    password: document.getElementById('password').value,
    showUserProps: document.getElementById('showUserProps').checked
  };

  chrome.storage.local.set({ 'loginDetails': loginDetails });
}

/**
 * Restores the options from local storage and populates the input fields with the saved values.
 * If no saved values are found, the input fields will be populated with an empty value.
 */
function restore_options() {
  chrome.storage.local.get(["loginDetails"]).then((result) => {
    const loginDetails = result.loginDetails;
    if (loginDetails) {
      document.getElementById('smfHost').value = loginDetails.smfHost || '';
      document.getElementById('msgVpn').value = loginDetails.msgVpn || '';
      document.getElementById('userName').value = loginDetails.userName || '';
      document.getElementById('password').value = loginDetails.password || '';
      document.getElementById('showUserProps').checked = loginDetails.showUserProps || false;
    }
  });
}

// This code adds an event listener to the 'DOMContentLoaded' event, which fires when the HTML document has finished loading.
document.addEventListener('DOMContentLoaded', restore_options);

// // This code adds an 'click' event listener to the Save button.
// // When the 'click' event occurs, the function 'save_options' will be executed.
document.getElementById('save').addEventListener('click', save_options);