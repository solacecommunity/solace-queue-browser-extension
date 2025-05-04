import { getEncryptionKey, decryptString, base64ToArrayBuffer } from './lib/encryptionUtils.js';
import { isEmpty } from './lib/sharedUtils.js';
import './lib/solclient.js';

// Check if the global was set up correctly ONCE at the start
if (typeof self.solace === 'undefined' || typeof self.solace.SolclientFactory !== 'object') { // Note: SolclientFactory itself seems to be an object based on logs
    console.error("findmessages.js: Global self.solace API object not found or incomplete!");
    throw new Error("Solace API failed to initialize globally.");
} else {
    console.log("findmessages.js: Global self.solace API object seems available.");
}



/**
 * Sends a message to the content script telling it to request the key.
 */
export async function requestEncryptionKeyFromUser() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs.length > 0) {
            await chrome.tabs.sendMessage(tabs[0].id, { action: "requestEncryptionKey" });
        } else {
            console.error("Could not find active tab to request encryption key.");
            // Consider sending an error back to options page if triggered from there?
        }
    } catch (error) {
        console.error("Error sending requestEncryptionKey message:", error);
    }
}

// Export triggerFindMsg IF its definition should live here
export async function triggerFindMsg() {
    const encryptionKey = await getEncryptionKey();
    if (isEmpty(encryptionKey)) {
       await requestEncryptionKeyFromUser();
    } else {
       await getQueueFromPageAndProcessMessages();
    }
}


/**
 * Gets queue name from content script and starts querying messages.
 */
export async function getQueueFromPageAndProcessMessages() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) throw new Error("No active tab found.");
        const tabId = tabs[0].id;

        const response = await chrome.tabs.sendMessage(tabId, { action: "getQueueName" });

        if (response && response.queueNameOnPage) {
            await queryMessagesFromQueue(response.queueNameOnPage);
        } else {
            throw new Error("Did not receive queue name from content script or response was empty.");
        }
    } catch (error) {
        console.error("Error in getQueueFromPageAndProcessMessages:", error);
        sendErrorToPage("Error", `Could not get queue name or start processing: ${error.message}`);
    }
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
        const factoryProps = new self.solace.SolclientFactoryProperties();
        factoryProps.profile = self.solace.SolclientFactoryProfiles.version10;
        self.solace.SolclientFactory.init(factoryProps);

        // Get page URL
        let url = await new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else if (tabs && tabs.length > 0) {
                    resolve(tabs[0].url);
                } else {
                    reject(new Error("No active tab found."));
                }
            });
        });

        // Get domain, port and protocol from URL using regex
        const domainMatch = url.match(/^https:\/\/(.*).messaging.solace.cloud:\d+|^http(s?):\/\/localhost:\d+/);
        if (!domainMatch) {
            sendErrorToPage('URL Error', 'Could not extract domain from the current page URL.');
            return;
        }
        
        const pageOrigin = new URL(url).origin; // Get "protocol://hostname:port" reliably
        console.log("Detected page origin:", pageOrigin);

        // Find active connection
        let activeConnection = null;
        const connections = await chrome.storage.local.get();
        for (const connectionId in connections) {
            const connection = connections[connectionId];
            // Ensure connection has a msgVpnUrl before comparing
            if (connection && connection.msgVpnUrl) {
                try {
                    const connectionOrigin = new URL(connection.msgVpnUrl).origin;
                    if (connectionOrigin === pageOrigin) {
                        activeConnection = connection;
                        console.log("Found matching connection:", connection.connectionName);
                        break;
                    }
                } catch (e) {
                    console.warn(`Could not parse msgVpnUrl for connection '${connection.connectionName}': ${connection.msgVpnUrl}`);
                }
            }
        }

        if (!activeConnection) {
            sendErrorToPage('No connection found', `No connection found matching the current page domain (${pageOrigin}). Please check the 'Message VPN URL' in the Options page.`);
            return;
        }

        // Decrypt password if it is encrypted
        if (activeConnection.encrypted) {
            try {
                // Assuming base64ToArrayBuffer and decryptString are defined elsewhere
                const encryptionKeyArrayBuffer = base64ToArrayBuffer(encryptionKey);
                const decryptedData = await decryptString(activeConnection.password, activeConnection.iv, encryptionKeyArrayBuffer);
                activeConnection.password = decryptedData;
            } catch (decryptionError) {
                console.error("Decryption failed:", decryptionError);
                sendErrorToPage('Decryption Error', 'Failed to decrypt password. Please check your encryption key.');
                return;
            }
        }

        // Validate activeConnection parameters
        const requiredParams = ['smfHost', 'msgVpn', 'userName', 'password'];
        for (const param of requiredParams) {
            if (!activeConnection[param]) {
                sendErrorToPage('Missing Parameter', `Connection configuration is missing the '${param}' parameter. Please set it in the Options page.`);
                return;
            }
        }
        
        // Login to Solace
        let session = solace.SolclientFactory.createSession({ // Use 'let' to allow reassignment to null
            url: activeConnection.smfHost,
            vpnName: activeConnection.msgVpn,
            userName: activeConnection.userName,
            password: activeConnection.password,
            connectRetries: 0, // Set to 0 for immediate failure feedback
        });

        // Flag to prevent storing messages after session disconnect/error
        let connectionActive = true;

        session.on(solace.SessionEventCode.CONNECT_FAILED_ERROR, function (sessionEvent) {
            connectionActive = false; // Mark connection as inactive
            let errorTitle = 'Connection Failed';
            let errorMessage = `${sessionEvent.message || sessionEvent.infoStr}. | Solace Error Code: ${sessionEvent.errorSubcode}`;

            switch (sessionEvent.errorSubcode) {
                case solace.ErrorSubcode.MESSAGE_VPN_NOT_ALLOWED:
                    errorMessage = `The Message VPN '${activeConnection.msgVpn}' does not exist or is not allowed. | Solace Error Code: ${sessionEvent.errorSubcode}`;
                    break;
                case solace.ErrorSubcode.LOGIN_FAILURE:
                    errorMessage = `Incorrect username or password. | Solace Error Code: ${sessionEvent.errorSubcode}`;
                    break;
                case solace.ErrorSubcode.CLIENT_ACL_DENIED:
                    errorMessage = `Client IP address not allowed by ACL. | Solace Error Code: ${sessionEvent.errorSubcode}`;
                    break;
                // Add more specific cases if needed
            }
            console.error(errorTitle, errorMessage, sessionEvent);
            sendErrorToPage(errorTitle, errorMessage);
            // Clean up session if it exists
            if (session) {
                session.dispose();
                session = null;
            }
        });

        session.on(solace.SessionEventCode.DISCONNECTED, function (sessionEvent) {
            connectionActive = false; // Mark connection as inactive
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

            let queueBrowserActive = true; // Flag for queue browser state

            qb.on(solace.QueueBrowserEventName.UP, () => {
                console.log('Connected to Queue Browser. Waiting for messages...');
                // Maybe send a status update to the page? Optional.
                // sendStatusToPage("Connected to queue, browsing messages...");
            });

            qb.on(solace.QueueBrowserEventName.DOWN, () => {
                queueBrowserActive = false;
                console.log('=== Queue Browser Disconnected ===');
                // This might happen naturally due to timeout/disconnect call, or due to an error.
                // Storage logic is handled in the main timeout below.
            });

            qb.on(solace.QueueBrowserEventName.CONNECT_FAILED_ERROR, (error) => {
                queueBrowserActive = false;
                connectionActive = false; // Also mark session connection potentially problematic
                console.error(`Queue Browser Connection Error: ${error.message}`, error.reason);
                sendErrorToPage('Queue Browser Error', `${error.message}. Reason: ${JSON.stringify(error.reason)}`);
                // Attempt to clean up session
                if (session) {
                    try { session.disconnect(); } catch (e) { /* ignore */ }
                }
            });

            qb.on(solace.QueueBrowserEventName.MESSAGE, (message) => {
                // Only collect messages if the connection is still considered active
                if (!connectionActive || !queueBrowserActive) {
                    console.log("Ignoring message received after disconnect/error.");
                    return;
                }

                const appMsgId = message.getApplicationMessageId();
                const destination = message.getDestination();
                const messageId = message.getGuaranteedMessageId().toString();

                let queuedMsg = null;
                let userPropsList = {};
                let metadataPropList = {};

                // Retrieves User Properties
                if (activeConnection.showUserProps) {
                    let userProps = message.getUserPropertyMap();
                    if (userProps) {
                        userProps.getKeys().forEach(key => {
                            userPropsList[key] = userProps.getField(key).getValue();
                        });
                    }
                }

                metadataPropList['appMsgId'] = appMsgId || 'Not specified';
                if (!isEmpty(destination)) {
                    metadataPropList['destinationName'] = destination.getName();
                    metadataPropList['destinationType'] = destination.getType();
                }

                if (activeConnection.showMsgPayload) {
                    // Consider potential large payloads and storage limits
                    // Store as base64 string for JSON compatibility in storage?
                    // queuedMsg = arrayBufferToBase64(message.getBinaryAttachment()); // Requires arrayBufferToBase64 utility
                    queuedMsg = message.getBinaryAttachment(); // Keep as is for now, content script needs to handle ArrayBuffer/Uint8Array
                }

                // Send the message to the page
                sendPayloadToPage({
                    messageId: messageId,
                    metadataPropList: metadataPropList,
                    userProps: userPropsList,
                    queuedMsg: queuedMsg
                });
                
            });

            qb.connect(); // Connect QueueBrowser

            // Timeout to stop browsing and store results
            const browseTimeout = 60000; // 60 seconds
            setTimeout(() => {
                console.log(`Disconnecting from Queue Browser after ${browseTimeout / 1000} seconds...`);
                if (qb !== null && queueBrowserActive) {
                    try {
                        qb.disconnect();
                        queueBrowserActive = false; // Mark as explicitly disconnected
                    } catch (error) {
                        console.error("Error disconnecting queue browser:", error.toString());
                    }
                } else {
                    console.log('Queue Browser already disconnected or not connected.');
                }
            }, browseTimeout);
        });

        // Attempt to connect the session
        try {
            session.connect();
        } catch (connectError) {
            connectionActive = false;
            console.error("Session connect() call failed:", connectError);
            sendErrorToPage("Connection Error", `Failed to initiate connection: ${connectError.message}`);
            if (session) { // Clean up partially created session
                session.dispose();
                session = null;
            }
            return; // Stop further execution
        }


        // Disconnect session slightly after queue browser timeout
        const sessionTimeout = 65000; // 65 seconds
        setTimeout(() => {
            console.log('Disconnecting from Solace PubSub+ Event Broker...');
            if (session !== null) {
                try {
                    session.disconnect();
                    // Session object will be disposed via the DISCONNECTED event handler
                } catch (error) {
                    console.error("Error disconnecting session:", error.toString());
                }
            } else {
                console.log('Session already disconnected or failed to connect.');
            }
        }, sessionTimeout);

    } catch (error) {
        console.error("General error in queryMessagesFromQueue:", error);
        sendErrorToPage(error.name || "Error", error.message || "An unknown error occurred during message querying.");
        // Ensure potential session cleanup if error happened after creation but before connect logic
        // Note: The session object might not be defined depending on where the error occurred.
        // Consider adding cleanup logic in a finally block if needed.
    }
}

/**
 * Sends a message to the active page.
 *
 * @param {string} message - All data related to the message.
 */
function sendPayloadToPage(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "setPayload",
                message: message
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Could not send message to content script:", chrome.runtime.lastError.message);
                }
            });
        }
        else {
            console.error("Could not find active tab to send message to.");
        }
    });
}


/**
 * Sends an error message to the active page.
 *
 * @param {string} name - The name/title of the error.
 * @param {string} message - The detailed error message.
 */
export function sendErrorToPage(name, message) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "setError",
                error: { 'name': name, 'message': message }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Could not send error to content script:", chrome.runtime.lastError.message);
                }
            });
        } else {
            console.error(`Error occurred but could not find active tab to display it: ${name} - ${message}`);
        }
    });
}