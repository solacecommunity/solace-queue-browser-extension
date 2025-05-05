import { setEncryptionKey, generateSHA256Hash, arrayBufferToBase64, decryptString } from './src/lib/encryptionUtils.js';
import { triggerFindMsg, getQueueFromPageAndProcessMessages, sendErrorToPage } from './src/findMessages.js';

// Open options page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

// Listener for messages from content scripts (or options page)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const handleMessage = async () => {
        switch (request.action) {
            case "triggerFindMsg":
                console.log("Received triggerFindMsg");
                await triggerFindMsg();
                break;
            case "encryptionKeyReceived":
                const senderTabId = sender.tab?.id;
                const encryptionKey = request.encryptionKey;

                if (!senderTabId || !encryptionKey) {
                    console.error("Worker: Missing sender tab ID or encryption key.");
                    return;
                }

                try {
                    // Generate a SHA-256 hash of the encryption key
                    const potentialKeyHash = await generateSHA256Hash(encryptionKey);

                    // Attempt to validate the key against existing data
                    let keyIsValid = false;
                    const connections = await chrome.storage.local.get();
                    let firstEncryptedConnection = null;

                    // Find the first encrypted connection in local storage
                    for (const id in connections) {
                        if (connections[id] && typeof connections[id] === 'object' && connections[id].encrypted) {
                            firstEncryptedConnection = connections[id];
                            break;
                        }
                    }

                    // Attempt to validate the key against the existing connection data
                    if (firstEncryptedConnection) {
                        console.log("Worker: Attempting validation against connection:", firstEncryptedConnection.connectionName);
                        try {
                            await decryptString(
                                firstEncryptedConnection.password,
                                firstEncryptedConnection.iv,
                                potentialKeyHash
                            );
                            console.log("Worker: Validation successful via connection data.");
                            keyIsValid = true;
                        } catch (decryptionError) {
                            console.warn("Worker: Validation via connection data failed (decryption error). Key invalid.");
                        }

                        // If the key is valid, save it to session storage
                        if (keyIsValid) {
                            const base64HashedKey = arrayBufferToBase64(potentialKeyHash);
                            await setEncryptionKey(base64HashedKey);

                            // Continue with the process
                            await getQueueFromPageAndProcessMessages();
                        } else {
                            // Key is definitively invalid
                            const errorMessage = "Incorrect encryption key. Please try again.";
                            console.log(`Worker: Sending 'invalidKeyRetry' to tab ${senderTabId}`);
                            chrome.tabs.sendMessage(senderTabId, {
                                action: "invalidKeyRetry",
                                message: errorMessage
                            }).catch(err => console.warn(`Worker: Failed to send invalidKeyRetry message: ${err.message}`));
                        }
                    } else {
                        // No encrypted connections found.
                        sendErrorToPage("No Connections Found", "No connections found. Please add a connection first.");
                    }

                } catch (error) {
                    console.error("Worker: Error processing encryptionKeyReceived message:", error);
                    if (senderTabId) {
                        console.error("Need to implement/import sendErrorToPage if called here");
                        sendErrorToPage("Key Processing Error", `An error occurred: ${error.message}`);
                    }
                }
                break; // End case "encryptionKeyReceived"
            default:
                console.warn("Unknown message action:", request.action);
        }
    };
    handleMessage();
    return false;
});