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

/**
 * Handles the click event for the "findMsg" menu item.
 * Retrieves the queue from the current page and processes the messages.
 *
 * @param {Object} info - The information about the context menu event.
 * @param {Object} tab - The information about the current browser tab.
 */
function findMessagesOnClick(info, tab) {
    if (info.menuItemId === 'findMsg') {
		getQueueFromPageAndProcessMessages();
    }
}