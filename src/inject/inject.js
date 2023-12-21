chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {


		if (request.action === "extractQueueName"){
		  var dataRow = document.getElementsByClassName('title title-content detail-title-width ellipsis-data');
		  var rawQueueName =  dataRow[0].innerHTML;
		  console.log('RAW QUEUE NAME on PAGE: '+rawQueueName);
		  var processedQueueName = transformRawQueueName(rawQueueName);
		  console.log('PROCESSED QUEUE NAME on PAGE: '+processedQueueName);
		  sendResponse({'queueNameonPage': processedQueueName});
		}		

		
		if (request.action === "setError"){
			alert(request.error);
			sendResponse({'errorThrow': request.action});
		}
		
		if (request.action == 'setPayload') {
			
			// [LeoPhillips][20-12-23][v2][START]
			// Check first if container has been created. If so, then plugin has already run and needs to 
			// reload new data. This prevents duplicate messages from appearing in the UI
			var containerDivElement = document.getElementById(`queue-extension-container-${request.messageId}`);
			if (containerDivElement) {
				containerDivElement.remove();
			}
			// [LeoPhillips][20-12-23][v2][END]

            // Currently, findMessages() returns all msgs on a queue. The UI can only display a max of
            // 100 msgs. If there are 300 msgs returned and only 100 displayed, document.getElementById will 
            // be called 300 times but only find elements relating to 100 messages. The other 200 will return null
            // and error when dataRow.parentElement is executed.
            // This is only an issue because Javascript API does not support Selectors. Once we can return only msgs
            // we are interested in, then this check can be removed.
			var dataRow = document.getElementById(`list-row-menu_Messages_Queued_${request.messageId}`);
			if (dataRow) {
				console.log('Yes');

				var dataRowParent = dataRow.parentElement;
				var expandedRow = dataRowParent.parentElement.children[1];
				var expandedDiv = expandedRow.getElementsByTagName('compose')[0];
				// [LeoPhillips][01-11-23][v2][START]
	
				// Create container div 
				var containerDiv = document.createElement("div");
				containerDiv.setAttribute("id", `queue-extension-container-${request.messageId}`);
	
				// Create copy button
				var newCopyBtn = document.createElement("BUTTON");
				newCopyBtn.setAttribute("id", "copy-queue-msg-btn-"+ request.messageId);
				newCopyBtn.appendChild(document.createTextNode('Copy to Clipboard'));
				newCopyBtn.setAttribute("style", "margin-right:10px;");
				newCopyBtn.addEventListener("click", () => copyToClipboard(request.messageId));
	
				// Create Copied to Clipboard label
				var newCopiedDiv = document.createElement("label");
				newCopiedDiv.setAttribute('id', "ctc-div-"+ request.messageId);
				newCopiedDiv.setAttribute("style", "display:none;");
				newCopiedDiv.appendChild(document.createTextNode('Copied to Clipboard!'));
	
				// Create Application Message ID labal
				var newAppMsgIdDiv = document.createElement("label");
				newAppMsgIdDiv.setAttribute("id", "app-msg-id-div-"+ request.messageId);
				newAppMsgIdDiv.appendChild(document.createTextNode(`Application Message ID: ${request.appMsgId}`));
	
				// Create queue message
				var newQueueMsgDiv = document.createElement("pre");
				newQueueMsgDiv.setAttribute("id", "queue-msg-div-"+ request.messageId);
				newQueueMsgDiv.appendChild(document.createTextNode(request.payload));
	
				// Append copy button, copy label, line breaks and queue message to page
				containerDiv.appendChild(newAppMsgIdDiv);
				containerDiv.appendChild(document.createElement("br"));
				containerDiv.appendChild(newCopyBtn);
				containerDiv.appendChild(newCopiedDiv);
				containerDiv.appendChild(document.createElement("br"));
				containerDiv.appendChild(document.createElement("br"));
				containerDiv.appendChild(newQueueMsgDiv);
	
				expandedDiv.appendChild(containerDiv);
				// [LeoPhillips][01-11-23][v2][END]
	
			} else {
				console.log('na');
			}
			sendResponse({
				'farewell': request.action
			});
		}
	}
);
	
	
function transformRawQueueName(rawQueueName) {
	/*The QUEUE name is represented in the tag <font color="#BFBFBF">Queues | </font> NAME OF THE QUEUE*/
	return rawQueueName.substr(rawQueueName.indexOf('</font>')+7);
}	

// [LeoPhillips][01-11-23][v2][START]
function copyToClipboard(queueId) {
	// Get the text field
	var queueMsgDiv = document.getElementById("queue-msg-div-"+queueId);
	
	// Copy the text inside the text field
	if(queueMsgDiv.textContent) {
		navigator.clipboard.writeText(queueMsgDiv.textContent);

		// Display copied to clipboard label
		var newCopiedDiv = document.getElementById("ctc-div-"+queueId);
		newCopiedDiv.setAttribute("style", "color:white; background-color:#04AA6D; padding:5px; font-family:Arial;");
	} else {
		console.log('Intalization');
	}
}
// [LeoPhillips][01-11-23][v2][END]