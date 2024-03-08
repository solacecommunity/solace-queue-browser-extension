/**
 * Queries the active browser tab, sends a message to extract the queue name from the page,
 * and then calls the findMessages function with the extracted queue name.
 */
function getQueueFromPageAndProcessMessages() {
	chrome.tabs.query({active: true, currentWindow: true}, 
			function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "extractQueueName"}, function(response) {
                    console.log('Response on QUEUE NAME: '+response.queueNameonPage);
                    findMessages(response.queueNameonPage);
                });
			});
}

/**
 * Queries the Solace Queue Browser for messages in a specified queue.
 * Sends the payload of each message to the active page.
 * If an error occurs, it sends the error message to the active page.
 *
 * @param {string} dynamicQueueName - The name of the queue to search for messages.
 */
function findMessages(dynamicQueueName) {
	console.log('findMessages executed - on QUEUE NAME: '+dynamicQueueName);
    
    try {
        var factoryProps = new solace.SolclientFactoryProperties();
        factoryProps.profile = solace.SolclientFactoryProfiles.version10;
        solace.SolclientFactory.init(factoryProps);
    } catch (error) {
        sendErrorToPage(error.message);
    }
    
    chrome.storage.local.get(["loginDetails"]).then((result) => {
        // Get log details from local storage
        var storedLoginDetails = result.loginDetails;
        if (!storedLoginDetails.smfHost) {
            sendErrorToPage("Options page is missing the URL parameter. Please set the URL in the Options page.");
            return;
        }
        if (!storedLoginDetails.msgVpn) {
            sendErrorToPage("Options page is missing the VPN parameter. Please set the VPN in the Options page.");
            return;
        }
        if (!storedLoginDetails.userName) {
            sendErrorToPage("Options page is missing the Username parameter. Please set the Username in the Options page.");
            return;
        }
        if (!storedLoginDetails.password) {
            sendErrorToPage("Options page is missing the Password parameter. Please set the Password in the Options page.");
            return;
        }

        try {
            // Login to Solace
            var session = solace.SolclientFactory.createSession({
                url: storedLoginDetails.smfHost,
                vpnName: storedLoginDetails.msgVpn,
                userName: storedLoginDetails.userName,
                password: storedLoginDetails.password
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
                    var userPropsList = {};

                    // Retrieves User Properties
                    if (storedLoginDetails.showUserProps) {
                        var userProps = message.getUserPropertyMap();
                        if (userProps) {
                            userProps.getKeys().forEach(x => {
                                userPropsList[x] = userProps.getField(x).Tc; // getField returns a object with Rc and TC as keys. Tc key contains our property
                            });
                        }
                    }

                    if (appMsgId === undefined) { appMsgId = 'Not specified'; }
                    var payload = message.getBinaryAttachment();
                    sendPayloadToPage(message.rc.low, appMsgId, userPropsList, payload);
                }
            );
            qb.connect(); // Connect with QueueBrowser to receive QueueBrowserEvents.


            /**
             * Disconnects from the session and the queue browser after a delay.
             * If an error occurs during disconnection, it sends the error message to the active page.
             */
            setTimeout(() => {
                try {
                    qb.disconnect();
                    session.disconnect();
                } catch (error) {
                    sendErrorToPage(`VPN may not be turned on. Error: ${error.message}`);
                }
            }, 40000); // 40 seconds

        } catch (error) {
            console.error(error.message);
            sendErrorToPage(error.message);
        }

    });
}


/**
 * Sends a payload to the active page.
 *
 * @param {string} messageId - The ID of the message.
 * @param {string} appMsgId - The application message ID.
 * @param {object} userProps - The user properties of the message.
 * @param {string} payload - The payload of the message.
 */
function sendPayloadToPage(messageId, appMsgId, userProps, payload) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "setPayload",
            appMsgId,
            userProps,
            messageId,
            payload
        });
    });
}


/**
 * Sends an error message to the active page.
 *
 * @param {string} error - The error message to send.
 */
function sendErrorToPage(error) {
    chrome.tabs.query({active: true,currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "setError", error: error});
    });
}


/**
 * Checks if a variable is empty.
 *
 * @param {*} paramVar - The variable to check.
 * @returns {boolean} - True if the variable is empty, false otherwise.
 */
function isEmpty(paramVar) {
    var blEmpty = false;
    if (typeof paramVar != "boolean") {
        if (!paramVar) {
            if (paramVar !== 0) {
                blEmpty = true;
            }
        }
        else if (Array.isArray(paramVar)) {
            if (paramVar && paramVar.length === 0) {
                blEmpty = true;
            }
        }
        else if (typeof paramVar == 'object') {
            if (paramVar && JSON.stringify(paramVar) == '{}') {
                blEmpty = true;
            } else if (paramVar && Object.keys(paramVar).length === 0 && !(paramVar instanceof Date)) {
                blEmpty = true;
            }
        }
    } 
    return blEmpty;
}