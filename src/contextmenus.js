// Create Context Menu option on install
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
// Find queue messages on Context Menu option click
chrome.contextMenus.onClicked.addListener(findMessagesOnClick);

function findMessagesOnClick(info, tab) {
    if (info.menuItemId === 'findMsg') {
		findMessagesWithDynamicQueueNames();
    }
}