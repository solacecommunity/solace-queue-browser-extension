chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.action == 'setPayload') {
			var dataRow = document.getElementById(`list-row-menu_Messages_Queued_${request.messageId}`).parentElement;
			var correctRow = dataRow.parentElement.children[1];
			var correctDiv = correctRow.getElementsByTagName('compose')[0];
			// [LeoPhillips][01-11-23][v2][START]
			// Create copy button
			var newCopyBtn = document.createElement("BUTTON");
			newCopyBtn.setAttribute("id", "copy-queue-msg-btn-"+ request.messageId)
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
			correctDiv.appendChild(newAppMsgIdDiv);
			correctDiv.appendChild(document.createElement("br"));
			correctDiv.appendChild(newCopyBtn);
			correctDiv.appendChild(newCopiedDiv);
			correctDiv.appendChild(document.createElement("br"));
			correctDiv.appendChild(document.createElement("br"));
			correctDiv.appendChild(newQueueMsgDiv);
			// [LeoPhillips][01-11-23][v2][END]

			sendResponse({
				'farewell': request.action
			});
		}
		
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

	}
);
	
	
function transformRawQueueName(rawQueueName)
{

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
		newCopiedDiv.setAttribute("style", "display:inherit; color:white; background-color:#04AA6D; padding:5px; font-family:Arial;");
	} else {
		console.log('Intalization');
	}
}
// [LeoPhillips][01-11-23][v2][END]