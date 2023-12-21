
/*Function triggered from context menu*/
function findMessagesWithDynamicQueueNames() {
    // Function requests the queue name from the tab 
    // Also BROWSES the message in the queue
    // #I would prefer to do this without a call back#
    getQueueFromPageAndProcessMessages(); 
}


function getQueueFromPageAndProcessMessages() {

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
        if (storedLoginDetails.smfHost) {
            loginDetails.url = storedLoginDetails.smfHost;
        } else {
            sendErrorToPage("URL parameter is missing from Options");
            return;
        }
        if (storedLoginDetails.msgVpn) {
            loginDetails.vpn = storedLoginDetails.msgVpn;
        } else {
            sendErrorToPage("VPN parameter is missing from Options");
            return;
        }
        if (storedLoginDetails.userName) {
            loginDetails.username = storedLoginDetails.userName;
        } else {
            sendErrorToPage("Username parameter is missing from Options");
            return;
        }
        if (storedLoginDetails.password) {
            loginDetails.pw = storedLoginDetails.password;
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
                }
            );
            qb.on(solace.QueueBrowserEventName.MESSAGE,
                function messageCB(message) {
                    var appMsgId = message.getApplicationMessageId();
                    if (appMsgId === undefined) { appMsgId = 'Not specified'; }
                    var payload = message.getBinaryAttachment();
                    sendPayloadToPage(message.rc.low, appMsgId, payload);        
                }
            );
            qb.connect(); // Connect with QueueBrowser to receive QueueBrowserEvents.


            // [LeoPhillips][20-12-23][v3][START]
            // Refactored setTimeout as it hide errors when qb.disconnect() failed.
            // Arrow function allows the try to catch any errors and send them to the context script
            // through sendErrorToPage()
            setTimeout(() => {
                try {
                    qb.disconnect();
                    session.disconnect();
                } catch (error) {
                    sendErrorToPage(`VPN may not be turned on. Error: ${error.message}`);
                }
            }, 40000); // 40 seconds
            // [LeoPhillips][20-12-23][v3][END]

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