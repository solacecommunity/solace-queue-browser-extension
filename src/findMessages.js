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
            }
        });
        if (!activeConnection) {
            sendErrorToPage("No active connection found. Please activate a connection in the Options page.");
            return;
        }

        // Decrypt password if it is encrypted
        if (activeConnection.encrypted) {
            await decryptString(activeConnection.password, activeConnection.iv).then((decryptedData) => {
                activeConnection.password = decryptedData;
            });
        }

        // Validate activeConnection parameters
        const requiredParams = ['smfHost', 'msgVpn', 'userName', 'password'];
        for (const param of requiredParams) {
            if (!activeConnection[param]) {
                sendErrorToPage(`Options page is missing the ${param} parameter. Please set the ${param} in the Options page.`);
                return;
            }
        }

        // Login to Solace
        const session = solace.SolclientFactory.createSession({
            url: activeConnection.smfHost,
            vpnName: activeConnection.msgVpn,
            userName: activeConnection.userName,
            password: activeConnection.password
        });

        session.connect(); // Connect session

        const qb = session.createQueueBrowser({
            queueDescriptor: {
                name: dynamicQueueName,
                type: "QUEUE"
            }
        });

        qb.on(solace.QueueBrowserEventName.CONNECT_FAILED_ERROR,
            function connectFailedErrorEventCb(error) {
                console.error(`${error.message}: ${JSON.stringify(error.reason)}`);
                sendErrorToPage(`${error.message}: ${JSON.stringify(error.reason)}`);
            }
        );

        // let messageCount = 0;	
        qb.on(solace.QueueBrowserEventName.MESSAGE,
            function messageCB(message) {
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

                sendPayloadToPage(message.rc.low, metadataPropList, userPropsList, queuedMsg);
                // messageCount++;
                // console.log(`Message count: ${messageCount}`);
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
                console.error(error);
                sendErrorToPage(`VPN may not be turned on. Error: ${JSON.stringify(error)}`);
            }
        }, 40000); // 40 seconds

    } catch (error) {
        console.error(error);
        sendErrorToPage(error);
    }
}

/**
 * Sends a queuedMsg to the active page.
 *
 * @param {string} messageId - The ID of the message.
 * @param {string} appMsgId - The application message ID.
 * @param {object} userProps - The User Properties of the message.
 * @param {string} queuedMsg - The Queued Message of the message.
 */
function sendPayloadToPage(messageId, metadataPropList, userProps, queuedMsg) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "setPayload",
            metadataPropList,
            userProps,
            messageId,
            queuedMsg
        });
    });
}


/**
 * Sends an error message to the active page.
 *
 * @param {string} error - The error message to send.
 */
function sendErrorToPage(error) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "setError", error: error });
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
export async function decryptString(string, iv) {
    let decryptedString = '';
    let sessionObjects = await chrome.storage.session.get('encryptionKey');

    console.log('sessionObjects:', sessionObjects);

    // If the encryption key is not set in the session storage, prompt the user to enter it
    if (isEmpty(sessionObjects)) {
        const key = prompt('Please enter an encryption key:');
        if (isEmpty(key)) {
            throw new Error('Encryption Key Required. An encrypted connection was found. Please enter the encryption key that was used to encrypt the connection.');
        }
        await chrome.storage.session.set({ 'encryptionKey': key });
        sessionObjects = { encryptionKey: key };
    }

    const encryptionKey = await generateSHA256Key(sessionObjects.encryptionKey);
    console.log('here');
    decryptedString = await performDecryption(string, encryptionKey, iv);

    return decryptedString;
}

/**
 * Decrypts encrypted data using the Web Crypto API.
 * 
 * @param {base64<string>} encryptedData - The encrypted data to decrypt.
 * @param {Promise<CryptoKey>} key - The key used for decryption.
 * @param {base64<string>} iv - The initialization vector used for decryption.
 * @returns {string} The decrypted data as a string.
 */
async function performDecryption(string, encryptionKey, iv) {
    try {
        const encryptedDataArrayBuffer = base64ToArrayBuffer(string);
        const ivArrayBuffer = base64ToArrayBuffer(iv);

        const decryptedData = await decryptAESData(encryptedDataArrayBuffer, encryptionKey, ivArrayBuffer);
        return decryptedData;
    } catch (error) {
        console.error(`Error decrypting password: ${error}`);
        throw new Error(`Error decrypting password: ${error}`);
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
        console.error(`Error decrypting data: ${error}`);
        throw new Error(`Error decrypting data: ${error}`);
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
