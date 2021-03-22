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
	});