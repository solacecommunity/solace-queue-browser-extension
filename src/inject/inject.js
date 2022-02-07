chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {
		if (request.action == 'setPayload') {
			var datarow = document.getElementById('list-row-menu_Messages_Queued_' + request.messageId).parentElement;
			var dataTable = datarow.parentElement;
			var correctrow = dataTable.children[1];
			var correctDiv = correctrow.getElementsByTagName('compose')[0];
			var newDiv = document.createElement("div");
			var newContent = document.createTextNode(request.payload);
			newDiv.appendChild(newContent);
			correctDiv.appendChild(newDiv);
			sendResponse({
				farewell: request.action
			});
		}
		
		
		if (request.action === "extractQueueName")
		{
		  var datarow = document.getElementsByClassName('title title-content detail-title-width ellipsis-data');
		  var rawQueueName =  datarow[0].innerHTML;
		  console.log('RAW QUEUE NAME on PAGE: '+rawQueueName);
		  var processedQueueName = transformRawQueueName(rawQueueName);
		  console.log('PROCESSED QUEUE NAME on PAGE: '+processedQueueName);
		  sendResponse({queueNameonPage: processedQueueName});
		}		
		
		
	});
	
	
function transformRawQueueName(rawQueueName)
{

	/*The QUEUE name is represented in the tag <font color="#BFBFBF">Queues | </font> NAME OF THE QUEUE*/
	return rawQueueName.substr(rawQueueName.indexOf('</font>')+7);

}	