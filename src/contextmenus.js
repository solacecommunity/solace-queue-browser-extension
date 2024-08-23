
// Create the context menu item on installation
chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create(
        {
            title: "Find messages on queue",
            id: "findMsg"
        },
        function () {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            }
        });
});

// When the context menu is clicked, find messages on the queue
chrome.contextMenus.onClicked.addListener(async function (info, tab) {
    if (info.menuItemId === 'findMsg') {
        
        // Encryption key is required to decrypt messages. If it's not available, request it from the user.
        const encryptionKey = await chrome.storage.session.get('encryptionKey');
        if (isEmpty(encryptionKey) || isEmpty(encryptionKey.encryptionKey)) {
            requestEncryptionKeyFromUser();
        } else { // If the key is available, get the queue from the page and process messages
            getQueueFromPageAndProcessMessages();
        }
    }
});

// Once the user has entered the encryption key, get the queue from the page and process messages
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
    if (request.action === "encryptionKeyReceived") {
        await chrome.storage.session.set({ 'encryptionKey': request.encryptionKey });
        getQueueFromPageAndProcessMessages();
    }
});