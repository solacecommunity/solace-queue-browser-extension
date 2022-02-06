
/*Function triggered from context menu*/
function findMessagesWithDynamicQueueNames()
{
	
	/*Function requests the queue name from the tab 
	  Also BROWSES the message in the queue
	  #I would prefer to do this without a call back#
	 */
	getQueueFromPageAndProcessMessages(); 

}



function getQueueFromPageAndProcessMessages(){

	/*Request sent to chrome tab to scrape the QUEUE name.
	  Call back triggers the findMessages(dynamicQueueName). 
	*/
	
	chrome.tabs.query({active: true, currentWindow: true}, 
			function(tabs) {
			  chrome.tabs.sendMessage(tabs[0].id, {action: "extractQueueName"}, function(response) {
				console.log('Response on QUEUE NAME: '+response.queueNameonPage);
				findMessages(response.queueNameonPage);
			  });
			});

	
}


function findMessages(dynamicQueueName) {
	console.log('findMessages executed - on QUEUE NAME: '+dynamicQueueName);
    var factoryProps = new solace.SolclientFactoryProperties();
    factoryProps.profile = solace.SolclientFactoryProfiles.version10;
    solace.SolclientFactory.init(factoryProps);
    //queueName = localStorage.getItem('queuename');
	queueName = dynamicQueueName;
    var session = solace.SolclientFactory.createSession({
        url: localStorage.getItem('solaceURL'),
        vpnName: localStorage.getItem('solaceVpnName'),
        userName: localStorage.getItem('solaceUserName'),
        password: localStorage.getItem('solacePassword')
    });
    try {
        session.connect(); // Connect session
        qb = session.createQueueBrowser({
            queueDescriptor: {
                name: queueName,
                type: "QUEUE"
            }
        });
        qb.on(solace.QueueBrowserEventName.CONNECT_FAILED_ERROR,
            function connectFailedErrorEventCb(error) {
                console.log(error);
            });
        qb.on(solace.QueueBrowserEventName.MESSAGE,
            function messageCB(message) {
                payload = message.getBinaryAttachment();
                sendToPage(message.rc.low, payload);        
            });
        qb.connect(); // Connect with QueueBrowser to receive QueueBrowserEvents.
        setTimeout(
            function() {
                qb.disconnect();
                session.disconnect();
            }, 5000); // Disconnect after 5 seconds.
    } catch (error) {
        console.log(error);
    }

}
function sendToPage(messageId, payload){
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "setPayload",
            messageId: messageId,
            payload: payload
        });

    });
}