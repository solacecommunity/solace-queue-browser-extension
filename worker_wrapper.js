// MV3 only allows for a single script file to be imported in the service_worker
//  to get around this we import the required scripts here.
importScripts('src/lib/solclient.js', 'src/findmessages.js');


// Open options page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

// Listen for URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status == 'complete') {
        const urlPattern = /^https:\/\/.*\.messaging\.solace\.cloud:\d+\/.*\/endpoints\/queues\/.*\/messages.*?$|^http:\/\/localhost:\d+\/.*\/endpoints\/queues\/.*\/messages.*?$/
        if (urlPattern.test(tab.url)) {
            console.log("URL matches pattern, sending message to content script to create the button");
            chrome.tabs.sendMessage(tabId, { action: "createFindMsgButton" });
        }
    }
});

// Listen for messages from content scripts and trigger the beginning of the "findMsg" logic
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "triggerFindMsg") {
        triggerFindMsg();
    }
});


// Once the user has entered the encryption key, get the queue from the page and process messages
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "encryptionKeyReceived") {
        await chrome.storage.session.set({ 'encryptionKey': request.encryptionKey });
        getQueueFromPageAndProcessMessages();
    }
});

// Execute the "findMsg" logic
async function triggerFindMsg() {
    const encryptionKey = await chrome.storage.session.get('encryptionKey');
    if (isEmpty(encryptionKey) || isEmpty(encryptionKey.encryptionKey)) {
        requestEncryptionKeyFromUser();
    } else {
        getQueueFromPageAndProcessMessages();
    }
}
