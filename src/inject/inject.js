
// --- Constants and Variables ---
const QUEUE_MESSAGES_PAGE_PATTERN = /^https:\/\/.*\.messaging\.solace\.cloud:\d+\/.*\/endpoints\/queues\/.*\/messages.*?$|^http(s?):\/\/localhost:\d+\/.*\/endpoints\/queues\/.*\/messages.*?$/;
const BUTTON_ID = 'findMsgsExtensionButtonId';
const DELAY = 500; // Delay in ms for DOM checks

// Constants Selectors for DOM manipulation
const NAVBAR_SELECTOR = '.au-target.table-action-panel.nav.flex-nowrap';

// Constants for element IDs
const METADATA_CONTAINER_ID = 'extension-queue-metadata-conatiner';
const PAYLOAD_CONTAINER_ID = 'extension-queue-msg-conatiner';

let debounceTimer = null;

// --- Run Initialization ---
initializeObserver(); // Start checking state and observing DOM
setupBackgroundMessageListener(); // Set up listener for background communication

// --- Initialization and Observation ---

/**
 * Initializes the MutationObserver to watch for changes in the DOM.
 * This function does the following:
 * 1. Checks the current URL to determine if the Find Messages button should be displayed.
 * 2. Sets up a MutationObserver to watch for changes in the DOM.
 * 3. Calls the checkUrlAndManageButton function to manage the button's visibility.
 * 4. Debounces the check to avoid running it too frequently during rapid DOM updates.
 */
function initializeObserver() {
	// Initial check when the script loads
	checkUrlAndManageButton();

	// Set up the MutationObserver to watch for DOM changes indicating navigation
	const observer = new MutationObserver((mutationsList, observer) => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(checkUrlAndManageButton, DELAY);
	});

	// Observe the entire document body for child list changes and subtree modifications
	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	console.log("Solace Extension: Observer initialized.");
}

/**
 * Checks the current URL and manages the Find Messages button accordingly.
 */
function checkUrlAndManageButton() {
	if (QUEUE_MESSAGES_PAGE_PATTERN.test(window.location.href)) {
		createFindMsgButton();
	} else {
		removeFindMessagesButton();
	}
}

/**
 * Sets up a listener for messages from the background script.
 * 
 */
function setupBackgroundMessageListener() {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		// Check if the current URL matches the queue messages page pattern
		// If not, we are not on the right page, so ignore the message
		// In theory, this should never happen as our manifest.json specifies the URL pattern for this script.
		if (!QUEUE_MESSAGES_PAGE_PATTERN.test(window.location.href)) {
			console.warn("Solace Extension: Received message from background, but not on queue page. Ignoring.", request.action);
			return false;
		}
		switch (request.action) {
			case "requestEncryptionKey":
				requestEncryptionKey();
				return false;
			case "invalidKeyRetry":
				requestEncryptionKey(request.message || "Incorrect key. Please try again.");
				return false;
			case "getQueueName":
				getQueueName(sendResponse);
				return true; // Asynchronous response
			case "setPayload":
				setPayload(request);
				return false;
			case "setError":
				showModalNotification(request.error.name, request.error.message);
				return false;
			default:
				console.error("Unknown action:", request.action);
				showModalNotification("Error", `Unknown action: ${request.action}`);
				return false;
		}
	});
}


/**
 * Creates the Find Messages button on the page.
 * 
 * This function does the following:
 * 1. Checks if the Find Messages button already exists on the page.
 * 2. If not, creates the Find Messages button and adds an event listener to it.
 * 3. When the Find Messages button is clicked, sends a message to the background script to trigger the Find Messages logic.
 */
function createFindMsgButton() {
	if (document.getElementById(BUTTON_ID)) return; // Button already exists

	const navBar = document.querySelector(NAVBAR_SELECTOR);
	if (!navBar) {
		console.warn("[Button Manager] Target navigation bar not found. Cannot add button yet.");
		return; // Target not ready
	}

	const displayMsgBtn = document.createElement('li');
	displayMsgBtn.className = 'au-target nav-item action-menu list-action';
	displayMsgBtn.innerHTML = `
		<button id="${BUTTON_ID}" class="au-target nav-link create-action" tabindex="0">
			<i class="material-icons">add</i>
			<span class="label-sm">Find Messages</span>
		</button>
	`;

	const lastChild = navBar.lastElementChild;

	try {
		if (lastChild) {
			navBar.insertBefore(displayMsgBtn, lastChild);
		} else {
			navBar.appendChild(displayMsgBtn);
		}
		console.log("[Button Manager] Button inserted into DOM.");

		const actionButton = displayMsgBtn.querySelector(`#${BUTTON_ID}`);
		if (actionButton) {
			actionButton.addEventListener('click', () => {
				console.log("[Button Manager] Button clicked, sending triggerFindMsg.");
				chrome.runtime.sendMessage({ action: "triggerFindMsg" });
			});
		} else {
			console.error("[Button Manager] Couldn't find button after insertion to add listener.");
		}
	} catch (error) {
		console.error("[Button Manager] Error inserting button or adding listener:", error);
	}
}

/**
 * Removes the Find Messages button from the page.
 * 
 * This function does the following:
 * 1. Checks if the Find Messages button exists on the page.
 * 2. If it exists, removes the button from the DOM.
 * 3. If the button is not found, logs a message indicating that nothing was removed.
 */
function removeFindMessagesButton() {
	const buttonElement = document.getElementById(BUTTON_ID);
	if (buttonElement) {
		// The button is inside an <li> element, remove the parent <li>
		const parentLi = buttonElement.closest('li.nav-item');
		if (parentLi) {
			parentLi.remove();
		} else {
			console.warn("[Button Manager] Found button but couldn't find parent <li> to remove.");
			buttonElement.remove(); // Fallback: remove just the button itself
		}
	}
}

/**
 * Displays an input window to prompt the user to enter an encryption key.
 * Optionally displays an initial error message.
 * @param {string} [initialErrorMessage=null] - An error message to display initially.
 */
function requestEncryptionKey(initialErrorMessage = null) {
	displayEncryptionKeyInputWindow('Enter Encryption Key', 'Enter the encryption key to decrypt the messages', initialErrorMessage);

	const encryptionKeyInputWindow = document.getElementById('encryption-key-window');
	const submitButton = document.getElementById('encryption-key-window-submit-button');
	const inputBox = document.getElementById('encryption-key-window-input-box');
	const messageElement = document.getElementById('encryption-key-window-message-id');

	if (!submitButton || !inputBox || !encryptionKeyInputWindow || !messageElement) {
		console.error("Failed to find elements for encryption key modal in requestEncryptionKey.");
		return;
	}

	// Use a named function for the listener to allow removal
	const handleKeySubmit = (event) => {
		event.stopPropagation();
		const inputValue = inputBox.value;
		if (inputValue) {
			if (encryptionKeyInputWindow.parentNode) {
				encryptionKeyInputWindow.remove();
			}
			// Remove listener to prevent memory leaks
			submitButton.removeEventListener('click', handleKeySubmit);

			// Send message to background script
			console.log("Sending encryptionKeyReceived to background.");
			chrome.runtime.sendMessage({ action: 'encryptionKeyReceived', encryptionKey: inputValue });
		} else {
			// Show basic feedback in the existing modal without closing it
			messageElement.textContent = 'Please enter an encryption key';
			messageElement.style.color = 'red';
			messageElement.style.fontWeight = 'bold';
			inputBox.focus();
		}
	};

	submitButton.removeEventListener('click', handleKeySubmit);
	submitButton.addEventListener('click', handleKeySubmit);
}

/**
 * Extracts the queue name from the page and sends it to the background script.
 */
function getQueueName(sendResponse) {
	const dataRow = document.querySelector('.title.title-content.detail-title-width.ellipsis-data');
	if (!dataRow) {
		console.error('Queue name element not found.');
		showModalNotification('Error', 'Queue name element not found.');
		return '';
	}
	const queueName = dataRow.textContent.split('|').pop().trim();
	sendResponse({
		'queueNameOnPage': queueName
	});
}

/**
 * Sets the payload on the page.
 * 
 * @param {object} request - The request object containing the message ID, metadata properties, user properties, and queued message.
 * @param {string} request.message - A message from the queue.
 */
async function setPayload(request) {
	const message = request.message;

	if (isEmpty(message)) {
		console.error('Message is empty.');
		showModalNotification('Error', 'Message is empty.');
		return;
	}

	try {
		removeExistingExtensionElements(message.messageId);
		/*
			Currently, queryMessagesFromQueue() in finMessages.js file returns all msgs on a queue. 
			The UI contains only 100 messages or `list-row-menu_Messages_Queued_${request.messageId =< 100 elements.}`.
			E.g. if there are 300 msgs returned and only 100 displayed.
			Therefore, the below check is necessary to avoid errors when trying to find elements that do not exist.
			This is only an issue because the Solace Javascript API does not support Selectors. Once we can return only msgs
			we are interested in, then this check can be removed.
		*/
		const dataRow = document.getElementById(`list-row-menu_Messages_Queued_${message.messageId}`);
		if (dataRow) {
			const expandedDiv = findElementToAppendPayloadContainer(dataRow);
			createMetaDataContainer(expandedDiv, message.messageId, message.metadataPropList);
			createPayloadContainer(expandedDiv, message.messageId, message.userProps, message.queuedMsg);
		}
	} catch (error) {
		console.error(error);
		showModalNotification('Error', error.message);
	}
}

/**
 * Removes existing elements from the page.
 * 
 * @param {string} messageId - The ID of the message.
 */
function removeExistingExtensionElements(messageId) {
	const metadataContainer = document.getElementById(`${METADATA_CONTAINER_ID}-${messageId}`);
	if (metadataContainer) {
		metadataContainer.remove();
	}

	const payloadContainer = document.getElementById(`${PAYLOAD_CONTAINER_ID}-${messageId}`);
	if (payloadContainer) {
		payloadContainer.remove();
	}
}

/**
 * Finds the element to which the payload container will be appended.
 * 
 * @param {HTMLElement} dataRow - The data row element.
 * @returns {HTMLElement} - The element to which the payload container will be appended.
 */
function findElementToAppendPayloadContainer(dataRow) {
	const dataRowParent = dataRow.parentElement;
	const expandedRow = dataRowParent.parentElement.children[1];
	return expandedRow.getElementsByTagName('compose')[0];
}

/*
	Create container for Metadata properties.

	@param {HTMLElement} expandedDiv - The HTML element to which the metadata container will be appended.
	@param {string} messageId - The ID of the message.
	@param {object} metadataPropList - The metadata properties of the message.
*/
function createMetaDataContainer(expandedDiv, messageId, metadataPropList) {
	let metaDataContainer = `
		<div id="${METADATA_CONTAINER_ID}-${messageId}" class="expanded-detail expanded-content">
			<div class="flow-column">
				<div class="flow-row">
					<span class="attr-label au-target" id="app-msg-id-lbl-${messageId}">Application Message ID:</span>
					<span class="au-target attr-value" id="app-msg-id-lbl-value-${messageId}">${metadataPropList.appMsgId}</span>
				</div>
			</div>
			<div class="flow-column">
				<div class="flow-row">
					<span class="attr-label au-target" id="app-msg-id-lbl-${messageId}">Destination Name:</span>
					<span class="au-target attr-value" id="app-msg-id-lbl-value-${messageId}">${metadataPropList.destinationName}</span>
				</div>
			</div>
			<div class="flow-column">
				<div class="flow-row">
					<span class="attr-label au-target" id="app-msg-id-lbl-${messageId}">Destination Type:</span>
					<span class="au-target attr-value" id="app-msg-id-lbl-value-${messageId}">${metadataPropList.destinationType}</span>
				</div>
			</div>
		</div>
	`;

	expandedDiv.innerHTML += metaDataContainer;
}

/*
	Create container for Queue Message and User Properties.

	@param {HTMLElement} expandedDiv - The HTML element to which the payload container will be appended.
	@param {string} messageId - The ID of the message.
	@param {object} userProps - The User Properties of the message.
	@param {string} queuedMsg - The Queued Message of the message.
*/
function createPayloadContainer(expandedDiv, messageId, userProps, queuedMsg) {
	let queueMsgPreId = `queue-msg-pre-${messageId}`;
	let queueMsgCpyBtnId = `queue-msg-copy-btn-${messageId}`;
	let queueMsgCpyLblId = `queue-msg-copy-lbl-${messageId}`;

	let messageContainer = `
		<div id="${PAYLOAD_CONTAINER_ID}-${messageId}" class="expanded-detail expanded-content">
	`;

	// Append the queued message container if queuedMsg is not empty
	if (!isEmpty(queuedMsg)) {
		let queuedMsg = `
			<div id="queue-msg-conatiner-${messageId}" class="flow-column">
				<div class="flow-row">
					<span class="attr-label au-target" id="queue-msg-title-${messageId}">Queue Message</span>
				</div>
				<div class="flow-row">
					<pre id="${queueMsgPreId}" style="max-height:500px; max-width:95%; overflow:auto; white-space:pre-wrap; word-break:break-all;"></pre>
				</div>
				<div class="flow-row">
					<button id="${queueMsgCpyBtnId}" class="au-target" style="margin-right:10px;">Copy Message to Clipboard</button>
					<label id="${queueMsgCpyLblId}" class="au-target" style="display:none;">Message Copied to Clipboard</label>
				</div>
			</div>
		`;
		messageContainer += queuedMsg;
	}

	// Append the user properties container if userProps is not empty
	let userPropPreId = `user-prop-pre-${messageId}`;
	let userPropCpyBtnId = `user-prop-copy-btn-${messageId}`;
	let userPropCpyLblId = `user-prop-copy-lbl-${messageId}`;
	if (!isEmpty(userProps)) {
		let userPropContainer = `
			<div id="user-prop-conatiner-${messageId}" class="flow-column">
				<div class="flow-row">
					<span class="attr-label au-target" id="user-prop-title-${messageId}">User Properties</span>
				</div>
				<div class="flow-row">
					<pre id="${userPropPreId}" style="max-height:500px;  max-width:95%; overflow:auto; white-space:pre-wrap; word-break:break-all;">${JSON.stringify(userProps, null, "\t")}</pre>
				</div>
				<div class="flow-row">
					<button id="${userPropCpyBtnId}" class="au-target" style="margin-right:10px;">Copy Properties to Clipboard</button>
					<label id="${userPropCpyLblId}" class="au-target" style="display:none;">Properties Copied to Clipboard</label>
				</div>
			</div>
		`;

		messageContainer += userPropContainer;
	}

	messageContainer += '</div>';
	expandedDiv.innerHTML += messageContainer;

	if (!isEmpty(queuedMsg)) {
		// Bug: when the message queuedMsg is XML, the < and > characters are not displayed correctly.
		// This is because the browser interprets them as HTML tags. To fix this, create a text node
		// and append it to the pre element after it has been created.
		const preElement = document.getElementById(queueMsgPreId);
		preElement.appendChild(document.createTextNode(queuedMsg));

		// Add event listener to the Message Queue copy button
		const queueMsgCpyBtn = document.getElementById(queueMsgCpyBtnId);
		queueMsgCpyBtn.addEventListener("click", () => copyToClipboard(queueMsgPreId, queueMsgCpyLblId));
	}

	// Add event listener to the User Properties copy button if userProps is not empty
	if (!isEmpty(userProps)) {
		const userPropCpyBtn = document.getElementById(userPropCpyBtnId);
		userPropCpyBtn.addEventListener("click", () => copyToClipboard(userPropPreId, userPropCpyLblId));
	}
}


/**
 * Shows a password input modal with a specified title and message.
 * The modal includes an input field for the user to enter a password.
 * The password is stored in the Chrome local storage.
 * 
 * @param {string} title - The title to display in the modal notification.
 * @param {string} defaultMessage - The message to display in the modal notification.
 * @param {string} [errorMessage=null] - An error message to display in the modal notification.
 */
function displayEncryptionKeyInputWindow(title, defaultMessage = '', errorMessage = null) {
	// Create the modal backdrop
	const modal = document.createElement('div');
	modal.id = 'encryption-key-window';
	modal.style.position = 'fixed';
	modal.style.width = '100%';
	modal.style.height = '100%';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.background = 'rgba(0, 0, 0, 0.7)';
	modal.style.zIndex = '1001';
	// Create the modal content
	const content = document.createElement('div');
	content.style.position = 'fixed';
	content.style.top = '50%';
	content.style.left = '50%';
	content.style.transform = 'translate(-50%, -50%)';
	content.style.background = 'white';
	content.style.padding = '20px';
	content.style.zIndex = '1001';
	content.style.borderRadius = '10px';
	content.style.fontSize = '16px';
	content.style.lineHeight = '1.5';
	// Create the heading
	const heading = document.createElement('h1');
	heading.innerHTML = title;
	heading.style.marginBottom = '10px';
	// Create the message element
	const messageElement = document.createElement('p');
	messageElement.id = 'encryption-key-window-message-id';
    if (errorMessage) {
        messageElement.textContent = errorMessage;
        messageElement.style.color = 'red';
        messageElement.style.fontWeight = 'bold';
    } else {
        messageElement.textContent = defaultMessage;
        messageElement.style.color = 'black';
        messageElement.style.fontWeight = 'normal';
    }
	// Create the input field
	const inputElement = document.createElement('input');
	inputElement.id = 'encryption-key-window-input-box';
	inputElement.type = 'password';
	inputElement.style.display = 'block';
	inputElement.style.margin = '10px auto';
	inputElement.style.padding = '10px';
	inputElement.style.width = '80%';
	inputElement.style.border = '1px solid #ccc';
	inputElement.style.borderRadius = '5px';
	// Create the button container
	const buttonContainer = document.createElement('div');
	buttonContainer.style.display = 'flex';
	buttonContainer.style.justifyContent = 'space-between';
	buttonContainer.style.marginTop = '20px';
	// Create the close button
	const closeButton = document.createElement('button');
	closeButton.textContent = 'Close';
	closeButton.style.display = 'block';
	closeButton.style.margin = '20px auto 0';
	closeButton.style.padding = '10px 20px';
	closeButton.style.border = 'none';
	closeButton.style.backgroundColor = '#ccc';
	closeButton.style.color = 'black';
	closeButton.style.borderRadius = '5px';
	closeButton.style.cursor = 'pointer';
	closeButton.textContent = 'Close';

	// Remove the modal when the close button is clicked
	closeButton.addEventListener('click', (event) => {
		document.body.removeChild(modal);
	});
	// Create the submit button
	const submitButton = document.createElement('button');
	submitButton.id = 'encryption-key-window-submit-button';
	submitButton.textContent = 'Submit';
	submitButton.style.display = 'block';
	submitButton.style.margin = '20px auto 0';
	submitButton.style.padding = '10px 20px';
	submitButton.style.border = 'none';
	submitButton.style.backgroundColor = '#13aa52';
	submitButton.style.color = 'white';
	submitButton.style.borderRadius = '5px';
	submitButton.style.cursor = 'pointer';

	// Append buttons to the button container
	buttonContainer.appendChild(submitButton);
	buttonContainer.appendChild(closeButton);

	content.appendChild(heading);
	content.appendChild(messageElement);
	content.appendChild(inputElement);
	content.appendChild(buttonContainer);

	// Append the content to the modal
	modal.appendChild(content);
	// Append the modal to the body
	document.body.appendChild(modal);
}

/**
 * Shows a modal notification with a specified title and message.
 * 
 * @param {string} title - The title to display in the modal notification.
 * @param {string} message - The message to display in the modal notification.
 */
function showModalNotification(title, message) {
	// Create the modal backdrop
	const modal = document.createElement('div');
	modal.id = 'modal-notification-id';
	modal.style.position = 'fixed';
	modal.style.width = '100%';
	modal.style.height = '100%';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.background = 'rgba(0, 0, 0, 0.7)';
	modal.style.zIndex = '1001';

	// Create the modal content
	const content = document.createElement('div');
	content.style.position = 'fixed';
	content.style.top = '50%';
	content.style.left = '50%';
	content.style.transform = 'translate(-50%, -50%)';
	content.style.background = 'white';
	content.style.padding = '20px';
	content.style.zIndex = '1001';
	content.style.borderRadius = '10px';
	content.style.fontSize = '16px';
	content.style.lineHeight = '1.5';

	// Create the heading
	const heading = document.createElement('h1');
	heading.innerHTML = title;
	heading.style.marginBottom = '10px';

	const messageElement = document.createElement('p');
	messageElement.id = 'modal-message-notification-id';
	messageElement.innerHTML = message;

	// Create the close button
	const closeButton = document.createElement('button');
	closeButton.textContent = 'Close';
	closeButton.style.display = 'block';
	closeButton.style.margin = '20px auto 0';
	closeButton.style.padding = '10px 20px';
	closeButton.style.border = 'none';
	closeButton.style.background = '#007BFF';
	closeButton.style.color = 'white';
	closeButton.style.borderRadius = '5px';
	closeButton.style.cursor = 'pointer';
	closeButton.textContent = 'Close';

	// Remove the modal when the close button is clicked
	closeButton.addEventListener('click', (event) => {
		event.stopPropagation();
		document.body.removeChild(modal);
	});

	// Append the heading, message, and close button to the content
	content.appendChild(heading);
	content.appendChild(messageElement);
	content.appendChild(closeButton);

	// Append the content to the modal
	modal.appendChild(content);

	// Append the modal to the body
	document.body.appendChild(modal);
}


/**
 * Copies the text content of a specified HTML element to the clipboard.
 * If the element's text content is not empty, it also changes the style of another specified HTML element to 
 * indicate that the text has been copied.
 *
 * @param {string} textElementId - The ID of the HTML element whose text content will be copied to the clipboard.
 * @param {string} labelElementId - The ID of the HTML element whose style will be changed to indicate that the text has been copied.
 */
function copyToClipboard(textElementId, labelElementId) {
	const textElement = document.getElementById(textElementId);

	if (textElement.textContent) {
		navigator.clipboard.writeText(textElement.textContent);
		// Get the copied to clipboard label
		const newCopiedDiv = document.getElementById(labelElementId);

		// Reset the opacity and remove the fade-out class
		newCopiedDiv.classList.remove('fade-out');
		void newCopiedDiv.offsetHeight; // https://stackoverflow.com/questions/60686489/what-purpose-does-void-element-offsetwidth-serve
		newCopiedDiv.style.opacity = 1;

		// Display copied to clipboard label
		newCopiedDiv.style.cssText = `
			color: white;
			background-color: #04AA6D;
			padding: 5px;
			font-family: Arial;
			display: inline;
		`;


		// Create a new style element
		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = `
		@keyframes fadeOut {
			from { opacity: 1; }
			to { opacity: 0; }
		}

		.fade-out {
			animation-name: fadeOut;
			animation-duration: 7s;
			animation-fill-mode: forwards;
		}
		`;

		// Append the style element to the head of the document
		document.head.appendChild(style);

		// Add the fade-out class to the label
		newCopiedDiv.classList.add('fade-out');

	}
}

/**
 * Checks if a variable is empty. A variable is considered empty if it is not a boolean and meets one of the following conditions:
 * - It is falsy and not the number 0.
 * - It is an array with a length of 0.
 * - It is an object with no own properties, excluding Date instances.
 * 
 * @param {*} paramVar - The variable to check.
 * @returns {boolean} True if the variable is empty, false otherwise.
 */
function isEmpty(paramVar) {
	var blEmpty = false;
	if (typeof paramVar != "boolean") {
		if (!paramVar) {
			if (paramVar !== 0) {
				blEmpty = true;
			}
		}
		else if (Array.isArray(paramVar)) {
			if (paramVar && paramVar.length === 0) {
				blEmpty = true;
			}
		}
		else if (typeof paramVar == 'object') {
			if (paramVar === null) {
				blEmpty = true;
			} else if (paramVar && Object.keys(paramVar).length === 0 && !(paramVar instanceof Date)) {
				blEmpty = true;
			}
		}
	}
	return blEmpty;
}