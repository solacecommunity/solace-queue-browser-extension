// import * as solaceModule from './src/lib/solclient.js';
import { setEncryptionKey, generateSHA256Hash, arrayBufferToBase64 } from './src/lib/encryptionUtils.js';
import { triggerFindMsg, getQueueFromPageAndProcessMessages } from './src/findMessages.js';

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
                console.log("Received encryptionKeyReceived");
                try {
                    const keyHash = await generateSHA256Hash(request.encryptionKey);
                    const keyString = arrayBufferToBase64(keyHash);
                    await setEncryptionKey(keyString);
                    console.log("Encryption key set, proceeding to process messages.");
                    await getQueueFromPageAndProcessMessages();
                } catch (error) {
                    console.error("Error processing encryption key:", error);
                    // TODO: Maybe send an error back to the options page/content script?
                }
                break;
            default:
                console.warn("Unknown message action:", request.action);
        }
    };
    handleMessage();
    return false;
});