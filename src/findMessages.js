
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
    var solaceUrl;
    var solaceVpnName;
    var solaceUserName;
    var solacePassword;
	queueName = dynamicQueueName;
    chrome.storage.local.get(["solaceURL"]).then((result) => {
        console.log(result.solaceURL)
        if (result.solaceURL) {
            solaceUrl = result.solaceURL;
        }
    });
    chrome.storage.local.get(["solaceVpnName"]).then((result) => {
        console.log(result.solaceVpnName)
        if(result.solaceVpnName) {
            solaceVpnName = result.solaceVpnName;
        }
        chrome.storage.local.get(["solaceUserName"]).then((result) => {
            console.log(result.solaceUserName)
            if(result.solaceUserName) {
                solaceUserName = result.solaceUserName;
            }
                chrome.storage.local.get(["solacePassword"]).then((result) => {
                    console.log(result.solacePassword)
                    console.log(Object.keys(result).length)
                    if(result.solacePassword) {
                        solacePassword = result.solacePassword;
                    }
                    var session = solace.SolclientFactory.createSession({
                        url: solaceUrl,
                        vpnName: solaceVpnName,
                        userName: solaceUserName,
                        password: solacePassword
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
            });
        });
    });
    
    

    
    

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