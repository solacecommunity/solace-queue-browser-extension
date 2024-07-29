
// Listen for messages from the background script
// The background script will send a message to the content script to request the encryption key from the user
// The background script will send a message to the content script to extract the queue name from the page
// The background script will send a message to the content script to set the payload on the page
// The background script will send a message to the content script to set an error message on the page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	switch (request.action) {
		case "requestEncryptionKey":
			requestEncryptionKey(sendResponse);
			break;
		case "getQueueName":
			getQueueName(sendResponse);
			break;
		case "setPayload":
			setPayload(request)
			break;
		case "setError":
			showModalNotification("Error", request.error);
			break;
		default:
			console.error("Unknown action:", request.action);
			showModalNotification("Error", `Unknown action: ${request.action}`);
	}
});

/**
 * Prompts the user to enter an encryption key.
 * 
 * @param {function} sendResponse - The sendResponse function to send the encryption key to the background script.
 */
async function requestEncryptionKey(sendResponse) {
	let encryptionKey = prompt("This connection is encrypted. Please enter the encryption key that was used to encrypt the connection:");
	if (isEmpty(encryptionKey)) {
		const error = "Encryption Key Required. This connection is encrypted. Please enter the encryption key that was used to encrypt the connection";
		console.error(error);
		sendResponse({
			"error": error
		});
		return;
	}
	sendResponse({
		"encryptionKey": encryptionKey
	});
}


/**
 * Extracts the queue name from the page and sends it to the background script.
 */
function getQueueName(sendResponse) {
	const dataRow = document.querySelector('.title.title-content.detail-title-width.ellipsis-data');
	if (!dataRow) {
		console.error('Queue name element not found.');
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
 * @param {string} request.messageId - The ID of the message.
 * @param {object} request.metadataPropList - The metadata properties of the message.
 * @param {object} request.userProps - The user properties of the message.
 * @param {string} request.queuedMsg - The queued message of the message.
 */
async function setPayload(request) {
	removeExistingElements(request.messageId);
	/*
		Currently, queryMessagesFromQueue() in finMessages.js file returns all msgs on a queue. 
		The UI contains only 100 messages or `list-row-menu_Messages_Queued_${request.messageId =< 100 elements.}`.
		E.g. if there are 300 msgs returned and only 100 displayed.
		Therefore, the below check is necessary to avoid errors when trying to find elements that do not exist.
		This is only an issue because the Solace Javascript API does not support Selectors. Once we can return only msgs
		we are interested in, then this check can be removed.
	*/
	const dataRow = document.getElementById(`list-row-menu_Messages_Queued_${request.messageId}`);
	if (dataRow) {
		const expandedDiv = findElementToAppendPayloadContainer(dataRow);
		createMetaDataContainer(expandedDiv, request.messageId, request.metadataPropList);
		createPayloadContainer(expandedDiv, request.messageId, request.userProps, request.queuedMsg);
	}
}

/**
 * Removes existing elements from the page.
 * 
 * @param {string} messageId - The ID of the message.
 */
function removeExistingElements(messageId) {
	const elementsToRemove = [
		`application-properties-container-${messageId}`,
		`queue-extension-container-${messageId}`,
		`line-${messageId}`
	];
	elementsToRemove.forEach(id => {
		const element = document.getElementById(id);
		if (element) element.remove();
	});
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
	const metaDataContainer = `
		<div id="application-properties-container-${messageId}" style="display:flex; justify-content:space-between; flex-wrap:nowrap; margin:10px 0 20px 0;">
			<div style="flex: 1;">
				<label id="app-msg-id-lbl-${messageId}" style="margin-right:5px;">Application Message ID:</label>
				<label id="app-msg-id-lbl-value-${messageId}" style="color:black;">${metadataPropList.appMsgId}</label>
			</div>
			<div style="flex: 1;">
				<label id="dest-name-id-lbl-${messageId}" style="margin-right:5px;">Destination Name:</label>
				<label id="dest-name-id-lbl-value-${messageId}" style="color:black;">${metadataPropList.destinationName}</label>
			</div>
			<div style="flex: 1;">
				<label id="dest-type-id-lbl-${messageId}" style="margin-right:5px;">Destination Type:</label>
				<label id="dest-type-id-lbl-value-${messageId}" style="color:black;">${metadataPropList.destinationType}</label>
			</div>
		</div>
		<hr id="line-${messageId}">
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
		<div id="queue-extension-container-${messageId}" style="display:flex; justify-content:space-between; flex-wrap:nowrap; margin:10px 0 20px 0;">
	`;

	// Append the queued message container if queuedMsg is not empty
	if (!isEmpty(queuedMsg)) {
		let queuedMsg = `
			<div queue-msg-conatiner-${messageId} style="flex: 1">
				<label id="queue-msg-title-${messageId}">Queue Message</label>
				<pre id="${queueMsgPreId}"></pre>
				<button id="${queueMsgCpyBtnId}" style="margin-right:10px;">Copy Message to Clipboard</button>
				<label id="${queueMsgCpyLblId}" style="display:none;">Message Copied to Clipboard</label>
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
			<div id="user-prop-conatiner-${messageId}" style="flex: 1">
				<label id="user-prop-title-${messageId}">User Properties</label>
				<pre id="${userPropPreId}">${JSON.stringify(userProps, null, "\t")}</pre>
				<button id="${userPropCpyBtnId}" style="margin-right:10px;">Copy Properties to Clipboard</button>
				<label id="${userPropCpyLblId}" style="display:none;">Properties Copied to Clipboard</label>
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
 * Shows a modal notification with a specified title and message.
 * 
 * @param {string} title - The title to display in the modal notification.
 * @param {string} message - The message to display in the modal notification.
 */
function showModalNotification(title, message) {
	// Create the modal backdrop
	const modal = document.createElement('div');
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
	messageElement.id = 'modal-message';
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

	// Remove the modal when it's clicked
	modal.addEventListener('click', () => {
		document.body.removeChild(modal);
	});
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

	} else {
		console.log('Initialization');
	}
}

/**
 * Checks if a variable is empty.
 *
 * @param {*} paramVar - The variable to check.
 * @returns {boolean} - True if the variable is empty, false otherwise.
 */
function isEmpty(paramVar) {
	if (typeof paramVar !== "boolean") {
		if (!paramVar) {
			if (paramVar !== 0) {
				return true;
			}
		} else if (Array.isArray(paramVar)) {
			if (paramVar && paramVar.length === 0) {
				return true;
			}
		} else if (typeof paramVar === 'object') {
			if (paramVar && JSON.stringify(paramVar) === '{}') {
				return true;
			} else if (paramVar && Object.keys(paramVar).length === 0 && !(paramVar instanceof Date)) {
				return true;
			}
		}
	}
	return false;
}
