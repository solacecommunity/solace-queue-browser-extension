
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
    
    try {
        var factoryProps = new solace.SolclientFactoryProperties();
        factoryProps.profile = solace.SolclientFactoryProfiles.version10;
        solace.SolclientFactory.init(factoryProps);
        //queueName = localStorage.getItem('queuename');
    } catch (error) {
        sendErrorToPage(error.message);
    }

    var loginDetails = {
        url: null,
        vpn: null,
        username: null,
        pw: null,
    }
    
    chrome.storage.local.get(["loginDetails"]).then((result) => {

        // Get log details from local storage
        var storedLoginDetails = result.loginDetails;
        if (storedLoginDetails.solaceURL) {
            loginDetails.url = storedLoginDetails.solaceURL;
        } else {
            sendErrorToPage("URL parameter is missing from Options");
            return;
        }
        if (storedLoginDetails.solaceVpnName) {
            loginDetails.vpn = storedLoginDetails.solaceVpnName;
        } else {
            sendErrorToPage("VPN parameter is missing from Options");
            return;
        }
        if (storedLoginDetails.solaceUserName) {
            loginDetails.username = storedLoginDetails.solaceUserName;
        } else {
            sendErrorToPage("Username parameter is missing from Options");
            return;
        }
        if (storedLoginDetails.solacePassword) {
            loginDetails.pw = storedLoginDetails.solacePassword;
        } else {
            sendErrorToPage("Password parameter is missing from Options");
            return;
        }


        try {
            // Login to Solace
            var session = solace.SolclientFactory.createSession({
                url: loginDetails.url,
                vpnName: loginDetails.vpn,
                userName: loginDetails.username,
                password: loginDetails.pw
            });

            session.connect(); // Connect session
            var qb = session.createQueueBrowser({
                queueDescriptor: {
                    name: dynamicQueueName,
                    type: "QUEUE"
                }
            });
            qb.on(solace.QueueBrowserEventName.CONNECT_FAILED_ERROR,
                function connectFailedErrorEventCb(error) {
                    console.error(error.message);
                    sendErrorToPage(error.message);
                });
            qb.on(solace.QueueBrowserEventName.MESSAGE,
                function messageCB(message) {
                    var appMsgId = message.getApplicationMessageId();
                    if (appMsgId === undefined) { appMsgId = 'Not specified'; }
                    var payload = message.getBinaryAttachment();
                    sendPayloadToPage(message.rc.low, appMsgId, payload);        
                });
            qb.connect(); // Connect with QueueBrowser to receive QueueBrowserEvents.
            setTimeout(
                function() {
                    qb.disconnect();
                    session.disconnect();
                }, 5000); // Disconnect after 5 seconds.
        } catch (error) {
            console.error(error.message);
            sendErrorToPage(error.message);
        }

    });
}


function sendPayloadToPage(messageId, appMsgId, payload){
    chrome.tabs.query({active: true,currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "setPayload", appMsgId: appMsgId, messageId: messageId, payload: payload});

    });
}

function sendErrorToPage(error) {
    chrome.tabs.query({active: true,currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "setError", error: error});
    });
}