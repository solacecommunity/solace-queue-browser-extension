
/**
 * Displays a toast notification to the user requesting an encryption key.
 */
async function requestEncryptionKeyFromUser() {
    await chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "requestEncryptionKey" });
    });
}

/**
 * Queries the active browser tab, sends a message to extract the queue name from the page,
 * and then calls the queryMessagesFromQueue function with the extracted queue name.
 */
function getQueueFromPageAndProcessMessages() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getQueueName" }, function (response) {
            queryMessagesFromQueue(response.queueNameOnPage);
        });
    });

}

/**
 * Queries the Solace Queue Browser for messages in a specified queue.
 * Sends the Queued Message of each message to the active page.
 * If an error occurs, it sends the error message to the active page.
 *
 * @param {string} dynamicQueueName - The name of the queue to search for messages.
 */
async function queryMessagesFromQueue(dynamicQueueName) {
    console.log(`queryMessagesFromQueue executed - on QUEUE NAME: ${dynamicQueueName}`);

    try {
        
        // Encryption key is required to decrypt messages. If it's not available, request it from the user.
        const encryptionKey = await getEncryptionKey();
        if (isEmpty(encryptionKey)) {
            requestEncryptionKeyFromUser();
            return;
        }

        // Initialize Solace
        const factoryProps = new solace.SolclientFactoryProperties();
        factoryProps.profile = solace.SolclientFactoryProfiles.version10;
        solace.SolclientFactory.init(factoryProps);

        // Get page URL
        let url = '';
        url = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(tabs[0].url);
                }
            });
        });

        // Get domain, port and protocol from URL using regex
        const domainMatch = url.match(/^https:\/\/(.*).messaging.solace.cloud:\d+|^http:\/\/localhost:\d+/);
        const domain = domainMatch[0];

        // Find active connection
        let activeConnection = null;
        const connections = await chrome.storage.local.get();
        Object.entries(connections).forEach(([connectionId, connection]) => {
            // Normalize URLs by removing trailing slashes
            const normalizedConnectionUrl = connection.msgVpnUrl.replace(/\/$/, '');
            if (normalizedConnectionUrl === domain) {
                activeConnection = connection;
                return;
            }
        });
        if (!activeConnection) {
            sendErrorToPage('No connection found', 'No connection found for the current page. Please check the Message VPN URL on the connection in the Options page matches the current page URL');
            return;
        }

        // Decrypt password if it is encrypted
        if (activeConnection.encrypted) {
            // Decode base64 encryption key
            const encryptionKeyArrayBuffer = base64ToArrayBuffer(encryptionKey);
            await decryptString(activeConnection.password, activeConnection.iv, encryptionKeyArrayBuffer).then((decryptedData) => {
                activeConnection.password = decryptedData;
            });
        }

        // Validate activeConnection parameters
        const requiredParams = ['smfHost', 'msgVpn', 'userName', 'password'];
        for (const param of requiredParams) {
            if (!activeConnection[param]) {
                sendErrorToPage('Missing Parameter', `Options page is missing the ${param} parameter. Please set the ${param} in the Options page.`);
                return;
            }
        }

        // Login to Solace
        const session = solace.SolclientFactory.createSession({
            url: activeConnection.smfHost,
            vpnName: activeConnection.msgVpn,
            userName: activeConnection.userName,
            password: activeConnection.password,
            connectRetries: 0,
        });

        session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            switch (sessionEvent.errorSubcode) {
                case solace.ErrorSubcode.MESSAGE_VPN_NOT_ALLOWED:
                    console.error(sessionEvent.infoStr, `The Message VPN name configured for the session does not exist | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    sendErrorToPage(sessionEvent.infoStr, `The Message VPN name configured for the session does not exist. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    break;
                case solace.ErrorSubcode.LOGIN_FAILURE:
                    console.error(sessionEvent.infoStr, `The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    sendErrorToPage(sessionEvent.infoStr, `The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    break;
                case solace.ErrorSubcode.CLIENT_ACL_DENIED:
                    console.error(sessionEvent.infoStr, `Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    sendErrorToPage(sessionEvent.infoStr, `Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    break;
                default:
                    console.error(`${sessionEvent.message}. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    sendErrorToPage('Error', `${sessionEvent.message}. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    break;
            }
        });
        session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            console.log('=== Session Disconnected ===');
            if (session !== null) {
                session.dispose();
                session = null;
            }
        });


        session.on(solace.SessionEventCode.UP_NOTICE, function (sessionEvent) {
            console.log('=== Session successfully connected ===');

            const qb = session.createQueueBrowser({
                queueDescriptor: {
                    name: dynamicQueueName,
                    type: "QUEUE"
                }
            });

            qb.on(solace.QueueBrowserEventName.UP, () => {
                console.log('Connected to Queue Browser. Waiting for messages...');
            });

            qb.on(solace.QueueBrowserEventName.DOWN, () => {
                console.log('=== Queue Browser Disconnected ===');
            });

            qb.on(solace.QueueBrowserEventName.CONNECT_FAILED_ERROR, (error) => {
                console.error(`${error.message}: ${JSON.stringify(error.reason)}`);
                sendErrorToPage('Queue Browser Connection Error', `${error.message}: ${JSON.stringify(error.reason)}`);
            });

            qb.on(solace.QueueBrowserEventName.MESSAGE, (message) => {
                const appMsgId = message.getApplicationMessageId();
                const destination = message.getDestination();

                let queuedMsg = null;
                let userPropsList = {};
                let metadataPropList = {};

                // Retrieves User Properties
                if (activeConnection.showUserProps) {
                    let userProps = message.getUserPropertyMap();
                    if (userProps) {
                        userProps.getKeys().forEach(x => {
                            userPropsList[x] = userProps.getField(x).Tc; // getField returns a object with Rc and TC as keys. Tc key contains our property
                        });
                    }
                }

                metadataPropList['appMsgId'] = appMsgId || 'Not specified';
                if (!isEmpty(destination)) {
                    metadataPropList['destinationName'] = destination.getName();
                    metadataPropList['destinationType'] = destination.Rc;
                }

                if (activeConnection.showMsgPayload) {
                    queuedMsg = message.getBinaryAttachment();

                }
                sendPayloadToPage({
                    messageId: message.rc.low,
                    metadataPropList: metadataPropList,
                    userProps: userPropsList,
                    queuedMsg: queuedMsg
                });
            });

            qb.connect(); // Connect with QueueBrowser to receive QueueBrowserEvents.


            // Disconnect Queue Browser after 60 seconds
            setTimeout(() => {
                console.log('Disconnecting from Queue Browser...');
                if (qb !== null) {
                    try {
                        qb.disconnect();
                    } catch (error) {
                        console.error(error.toString());
                    }
                } else {
                    console.log('Not connected to Queue Browser.');
                }
            }, 60000); // 60 seconds
        });

        session.connect(); // Connect session

        // Disconnect session after 65 seconds
        setTimeout(() => {
            console.log('Disconnecting from Solace PubSub+ Event Broker...');
            if (session !== null) {
                try {
                    session.disconnect();
                } catch (error) {
                    console.error(error.toString());
                }
            } else {
                console.log('Not connected to Solace PubSub+ Event Broker.');
            }
        }, 65000); // 65 seconds

    } catch (error) {
        console.error(error);
        sendErrorToPage(error.name, error.message);
    }
}

/**
 * Sends a message to the active page.
 *
 * @param {string} message - All data related to the message.
 */
function sendPayloadToPage(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "setPayload",
            message: message
        });
    });
}


/**
 * Sends an error message to the active page.
 *
 * @param {string} error - The error message to send.
 */
function sendErrorToPage(name, message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "setError", error: { 'name': name, 'message': message } });
    });
}