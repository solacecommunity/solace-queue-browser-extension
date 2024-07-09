
chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {

		// Extract queue name from page
		if (request.action === "extractQueueName") {
			const dataRow = document.getElementsByClassName('title title-content detail-title-width ellipsis-data');
			const rawQueueName =  dataRow[0].innerHTML;
			console.log('RAW QUEUE NAME on PAGE: '+rawQueueName);
			const processedQueueName = transformRawQueueName(rawQueueName);
			console.log('PROCESSED QUEUE NAME on PAGE: '+processedQueueName);
			sendResponse({'queueNameonPage': processedQueueName});
		}

		// Send error message to page
		if (request.action === "setError") {
			showModalNotification('Error', request.error);
			sendResponse({'errorThrow': request.action});
		}
		
		// Set payload on page
		if (request.action === 'setPayload') {
			
			// Check first if container has been created. If so, then plugin has already run and needs to 
			// reload new data. This prevents duplicate messages from appearing in the UI
			const applicationDivExisting = document.getElementById(`application-properties-container-${request.messageId}`);
			const containerDivExisting = document.getElementById(`queue-extension-container-${request.messageId}`);
			if (applicationDivExisting) { applicationDivExisting.remove(); };
			if (containerDivExisting) { containerDivExisting.remove(); };

            // Currently, findMessages() returns all msgs on a queue. The UI can only display a max of
            // 100 msgs. If there are 300 msgs returned and only 100 displayed, document.getElementById will 
            // be called 300 times but only find elements relating to 100 messages. The other 200 will return null
            // and error when dataRow.parentElement is executed.
            // This is only an issue because Javascript API does not support Selectors. Once we can return only msgs
            // we are interested in, then this check can be removed.
			const dataRow = document.getElementById(`list-row-menu_Messages_Queued_${request.messageId}`);
			if (dataRow) {
				const dataRowParent = dataRow.parentElement;
				const expandedRow = dataRowParent.parentElement.children[1];
				const expandedDiv = expandedRow.getElementsByTagName('compose')[0];
				
				// ############################################################################################################

				/*
					Create container for Application Properties
				*/
				const applicationPropertiesDivId = `application-properties-container-${request.messageId}`;
				const applicationPropertiesDiv = createContainerDiv(applicationPropertiesDivId, expandedDiv);
				expandedDiv.appendChild(applicationPropertiesDiv);

				// Create Application Message ID label
				const appMsgIdLblId = `app-msg-id-lbl-${request.messageId}`;
				const appMsgIdLblValueId = `app-msg-id-lbl-value-${request.messageId}`;

				const appMsgIdLbl = createLabel(appMsgIdLblId, `Application Message ID:`);
				appMsgIdLbl.style.marginRight = '5px';
				const appMsgIdValueLbl = createLabel(appMsgIdLblValueId, request.appMsgId);
				appMsgIdValueLbl.style.color = 'black';

				applicationPropertiesDiv.appendChild(appMsgIdLbl);
				applicationPropertiesDiv.appendChild(appMsgIdValueLbl);

				createAndAppendHorizontalLine(applicationPropertiesDiv);

				// ############################################################################################################
				
				/*
					Create container for Queue Message and User Properties.
				*/
				const containerDivId = `queue-extension-container-${request.messageId}`;
				const containerDiv = createContainerDiv(containerDivId, expandedDiv);
				containerDiv.style.display = 'flex';
				containerDiv.style.justifyContent = 'space-between'; // Optional: Adds some space between the two elements
				containerDiv.style.flexWrap = 'nowrap'; // Optional: Prevents the elements from wrapping to the next line
				containerDiv.style.margin = '10px 0 20px 0'; // Optional: Adds some margin to the top and bottom of the div
				expandedDiv.appendChild(containerDiv);


				// Queue Message element IDs
				const msgContainerDivId = `queue-msg-conatiner-${request.messageId}`;
				const msgTitleLblId		= `queue-msg-title-${request.messageId}`;
				const msgPreId 			= `queue-msg-pre-${request.messageId}`;
				const msgCopyBtnId 		= `queue-msg-copy-btn-${request.messageId}`;
				const msgCopyLblId 		= `queue-msg-copy-lbl-${request.messageId}`;
				
				
				// Create container div for the Queue Message
				const msgContainerDiv = createContainerDiv(msgContainerDivId);
				msgContainerDiv.style.width = '50%'; // Optional: Sets the width of the div to 50% of the parent div

				// Create Title for the Queue Message
				const msgTitleLbl = createLabel(msgTitleLblId, 'Queue Message');

				// Create Pre element for the Queue Message
				const msgPre = createPreElement(msgPreId, request.payload);
				
				// Create Copy button for the Queue Message
				const msgBtnText = 'Copy Message to Clipboard';
				const msgCopyBtn = createCopyButton(msgCopyBtnId, msgBtnText, msgPreId, msgCopyLblId);
				
				// Create Copied label for the Queue Message
				const msgLblText = 'Message Copied to Clipboard';
				const msgCopyLbl = createCopiedLabel(msgCopyLblId, msgLblText);
				
				// Append elements to the container div
				msgContainerDiv.appendChild(msgTitleLbl);
				msgContainerDiv.appendChild(msgPre);
				msgContainerDiv.appendChild(msgCopyBtn);
				msgContainerDiv.appendChild(msgCopyLbl);
				containerDiv.appendChild(msgContainerDiv);
				
				if (!isEmpty(request.userProps)) {
					// User Property element IDs
					const userPropContainerId 		= `user-prop-conatiner-${request.messageId}`;
					const userPropTitleLblId		= `user-prop-title-${request.messageId}`;
					const userPropPreId				= `user-prop-pre-${request.messageId}`;
					const userPropCopyBtnId 		= `user-prop-copy-btn-${request.messageId}`;
					const userPropCopyLblId 		= `user-prop-copy-lbl-${request.messageId}`;
					
					// Create Pre element for the User Properties
					const userPropContainerDiv = createContainerDiv(userPropContainerId);
					userPropContainerDiv.style.width = '50%'; // Optional: Sets the width of the div to 50% of the parent div
					
					// Create Title for the User Properties
					const userPropTitleLbl = createLabel(userPropTitleLblId, 'User Properties');

					// Create Pre element for the User Properties
					const userPropPre = createPreElement(userPropPreId, JSON.stringify(request.userProps, null, "\t"));
					
					// Create Copy button for the User Properties
					const userPropBtnText = 'Copy Properties to Clipboard';
					const userPropCopyBtn = createCopyButton(userPropCopyBtnId, userPropBtnText, userPropPreId, userPropCopyLblId);

					// Create Copied label for the User Properties
					const userPropLblText = 'Properties Copied to Clipboard';
					const userPropCopyLbl = createCopiedLabel(userPropCopyLblId, userPropLblText);

					// Append elements to the container div
					userPropContainerDiv.appendChild(userPropTitleLbl);
					userPropContainerDiv.appendChild(userPropPre);
					userPropContainerDiv.appendChild(userPropCopyBtn);
					userPropContainerDiv.appendChild(userPropCopyLbl);
					containerDiv.appendChild(userPropContainerDiv);
				}
			} else {
				console.log('Queue message not found on page');
			}
			sendResponse({
				'farewell': request.action
			});
		}
	}
);

/**
 * Shows a modal notification message.
 * 
 * @param {string} title - The title to display in the modal notification.
 * @param {string} message - The message to display in the modal notification.
 * @returns {void}
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
 * Creates a label element with the specified ID and text content.
 * 
 * @param {string} elementId - The ID to assign to the label element.
 * @param {string} textContent - The text content to display within the label element.
 * @returns {HTMLLabelElement} The newly created label element.
 */
function createLabel(elementId, textContent) {
	const newAppMsgIdLabel = document.createElement("label");
	newAppMsgIdLabel.setAttribute("id", elementId);
	newAppMsgIdLabel.appendChild(document.createTextNode(textContent));
	return newAppMsgIdLabel;
}

/**
 * Creates and appends a horizontal line element to the specified parent element.
 * 
 * @param {HTMLElement} parentElement - The parent element to which the horizontal line will be appended.
 * @returns {void}
 */
function createAndAppendHorizontalLine(parentElement) {
	const newHorizontalLine = document.createElement("hr");
	parentElement.appendChild(newHorizontalLine);
}

/**
 * Creates a container div element with the specified element ID.
 *
 * @param {string} elementId - The ID to be set for the container div.
 * @returns {HTMLDivElement} The created container div element.
 */
function createContainerDiv(elementId) {
	const containerDiv = document.createElement("div");
	containerDiv.setAttribute("id", elementId);
	return containerDiv;
}

/**
 * Creates a copy button element with the specified properties.
 * 
 * @param {string} elementId - The ID of the copy button element.
 * @param {string} labelText - The text to be displayed on the copy button.
 * @param {string} textElementId - The ID of the element containing the text to be copied.
 * @param {string} labelElementId - The ID of the element containing the label associated with the text to be copied.
 * @returns {HTMLButtonElement} The newly created copy button element.
 */
function createCopyButton(elementId, labelText, textElementId, labelElementId) {
	console.log('Creating copy button');
	const newCopyButton = document.createElement("BUTTON");
	newCopyButton.setAttribute("id", elementId);
	newCopyButton.setAttribute("style", "margin-right:10px;");
	newCopyButton.addEventListener("click", () => copyToClipboard(textElementId, labelElementId));
	newCopyButton.appendChild(document.createTextNode(labelText));
	return newCopyButton;
}

/**
 * Creates a new label element with the specified ID and text content.
 * The created label element is initially hidden.
 *
 * @param {string} elementId - The ID to be assigned to the label element.
 * @param {string} labelText - The text content of the label element.
 * @returns {HTMLLabelElement} The newly created label element.
 */
function createCopiedLabel(elementId, labelText) {
	const newCopiedLabel = document.createElement("label");
	newCopiedLabel.setAttribute('id', elementId);
	newCopiedLabel.setAttribute("style", "display:none;");
	newCopiedLabel.appendChild(document.createTextNode(labelText));
	return newCopiedLabel;
}

/**
 * Creates a new <pre> element with the specified ID and payload.
 * 
 * @param {string} elementId - The ID to assign to the new <pre> element.
 * @param {string} payload - The text content to be added to the new <pre> element.
 * @returns {HTMLElement} - The newly created <pre> element.
 */
function createPreElement(elementId, payload) {
	const newPreElement = document.createElement("pre");
	newPreElement.setAttribute("id", elementId);
	newPreElement.appendChild(document.createTextNode(payload));
	return newPreElement;
}

/**
 * Transforms the raw queue name by extracting the actual queue name from the HTML tag.
 *
 * @param {string} rawQueueName - The raw queue name containing the HTML tag.
 * @returns {string} - The transformed queue name.
 */
function transformRawQueueName(rawQueueName) {
	const tagStart = '<font color="#BFBFBF">Queues | </font>';
	return rawQueueName.substr(rawQueueName.indexOf(tagStart) + tagStart.length);
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
		newCopiedDiv.style.color = "white";
		newCopiedDiv.style.backgroundColor = "#04AA6D";
		newCopiedDiv.style.padding = "5px";
		newCopiedDiv.style.fontFamily = "Arial";
		newCopiedDiv.style.display = "inline";

	  
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
