var contextMenus = {};
contextMenus.findMessagesOnQueue =
    chrome.contextMenus.create({
            "title": "Find messages on queue",
            id: "contextMenu"
        },
        function () {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
            }
        }
    );
chrome.contextMenus.onClicked.addListener(contextMenuHandler);

function contextMenuHandler(info, tab) {
    if (info.menuItemId === contextMenus.findMessagesOnQueue) {
        
		findMessagesWithDynamicQueueNames();
		//findMessages();
    }
}