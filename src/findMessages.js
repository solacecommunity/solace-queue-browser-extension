
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
        let factoryProps = new solace.SolclientFactoryProperties();
        factoryProps.profile = solace.SolclientFactoryProfiles.version10;
        solace.SolclientFactory.init(factoryProps);

        // Find active connection
        let activeConnection = null;
        let connections = await chrome.storage.local.get();
        Object.entries(connections).forEach(([connectionId, connection]) => {
            if (connection.activated === true) {
                activeConnection = connection;
                return;
            }
        });
        if (!activeConnection) {
            sendErrorToPage('No active connection found', 'Please activate a connection in the Options page.');
            return;
        }


        // Encryption key is required to decrypt messages. If it's not available, request it from the user.
        const encryptionKey = await chrome.storage.session.get('encryptionKey');
        if (isEmpty(encryptionKey) || isEmpty(encryptionKey.encryptionKey)) {
            requestEncryptionKeyFromUser();
            return;
        }

        // Decrypt password if it is encrypted
        if (activeConnection.encrypted) {
            await decryptString(activeConnection.password, activeConnection.iv, encryptionKey.encryptionKey).then((decryptedData) => {
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
                    console.log(sessionEvent.infoStr, `The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    sendErrorToPage(sessionEvent.infoStr, `The username or password is incorrect. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    break;
                case solace.ErrorSubcode.CLIENT_ACL_DENIED:
                    console.log(sessionEvent.infoStr, `Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    sendErrorToPage(sessionEvent.infoStr, `Client IP address/netmask combination not on the ACL (Access Control List) profile Exception Address list. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    break;
                default:
                    console.log(sessionEvent.infoStr, `Check correct parameter values and connectivity. | Solace Error Code: ${sessionEvent.errorSubcode}`);
                    sendErrorToPage(sessionEvent.infoStr, `Check correct parameter values and connectivity. | Solace Error Code: ${sessionEvent.errorSubcode}`);
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
                        console.log(error.toString());
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
                    console.log(error.toString());
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


/**
 * Checks if a variable is empty. A variable is considered empty if it is not a boolean and meets one of the following conditions:
 * - It is falsy and not the number 0.
 * - It is an array with a length of 0.
 * - It is an object with no own properties, excluding Date instances.
 * 
 * @param {*} paramVar - The variable to check.
 * @returns {boolean} True if the variable is empty, false otherwise.
 */
function isEmpty(paramVar) {
    let blEmpty = false;
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

// ############################################################################################################


/**
 * Decrypts an encrypted string using the Web Crypto API.
 * 
 * @param {base64String} string - The encrypted base64 string to decrypt.
 * @param {base64String} iv - The base64 initialization vector used for decryption.
 * @returns {Promise<string>} The decrypted string.
 */
async function decryptString(string, iv, key) {
    // If the encryption key is not set in the session storage, prompt the user to enter it
    if (!key) {
        throw new Error('No Encryption Key. Encryption key is required to decrypt the connection.');
    }
    let decryptedString = '';

    const encryptionKey = await generateSHA256Key(key);
    decryptedString = await performDecryption(string, encryptionKey, iv);

    return decryptedString;
}

/**
 * Decrypts an encrypted string using the Web Crypto API.
 * 
 * @param {base64String} string - The encrypted base64 string to decrypt.
 * @param {base64String} iv - The base64 initialization vector used for decryption.
 * @returns {Promise<string>} The decrypted string.
 */
async function performDecryption(string, encryptionKey, iv) {
    try {
        const encryptedDataArrayBuffer = base64ToArrayBuffer(string);
        const ivArrayBuffer = base64ToArrayBuffer(iv);

        const decryptedData = await decryptAESData(encryptedDataArrayBuffer, encryptionKey, ivArrayBuffer);
        return decryptedData;
    } catch (error) {
        await chrome.storage.session.set({ 'encryptionKey': '' }); // Clear the encryption key if decryption fails
        console.error(error);
        throw new Error(error);
    }
}

/**
 * Decrypts encrypted data using the Web Crypto API.
 * 
 * @param {Promise<ArrayBuffer>} encryptedData - The encrypted data to decrypt.
 * @param {Promise<CryptoKey>} key - The key used for decryption.
 * @param {Uint8Array} iv - The initialization vector used for decryption.
 * @returns {string} The decrypted data as a string.
 */
async function decryptAESData(encryptedData, key, iv) {
    try {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            encryptedData
        );
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error(error);
        throw new Error(`Decryption failed. Please set the correct encryption key.`);
    }
}

/**
 * Converts a Base64 string to an ArrayBuffer.
 * 
 * @param {string} base64 - The Base64 string to convert.
 * @returns {ArrayBuffer} The ArrayBuffer representation of the Base64 string.
 */
function base64ToArrayBuffer(base64) {
    const binaryString = customBase64Decode(base64);

    const len = binaryString.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Converts a Base64 string to text.
 * 
 * @param {string} base64 - The Base64 string to convert.
 * @returns {string} The input string representation of the Base64 string.
 */
function customBase64Decode(base64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;

    const input = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');

    while (i < input.length) {
        const index1 = chars.indexOf(input.charAt(i++));
        const index2 = chars.indexOf(input.charAt(i++));
        const index3 = chars.indexOf(input.charAt(i++));
        const index4 = chars.indexOf(input.charAt(i++));
        const a = (index1 << 2) | (index2 >> 4);
        const b = ((index2 & 15) << 4) | (index3 >> 2);
        const c = ((index3 & 3) << 6) | index4;

        output += String.fromCharCode(a);
        if (index3 !== 64) output += String.fromCharCode(b);
        if (index4 !== 64) output += String.fromCharCode(c);
    }

    return output;
}

/**
 * Generates a 256 bit key for encrypting the password using the Web Crypto API.
 * 
 * @param {string} strKey - The key to generate.
 * @returns {object.Promise<CryptoKey>} The generated key.
 */
async function generateSHA256Key(strKey) {

    // Encode the key as an ArrayBuffer to use it in the importKey method.
    const encodedKey = new TextEncoder().encode(strKey);

    // Hash the key to get a 256-bit key for AES-GCM encryption.
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedKey);
    const key = await crypto.subtle.importKey(
        "raw",
        hashBuffer,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
    return key;
}