
/**
 * Checks if a variable is empty. A variable is considered empty if it is not a boolean and meets one of the following conditions:
 * - It is falsy and not the number 0.
 * - It is an array with a length of 0.
 * - It is an object with no own properties, excluding Date instances.
 * 
 * @param {*} paramVar - The variable to check.
 * @returns {boolean} True if the variable is empty, false otherwise.
 */
export function isEmpty(paramVar) {
    var blEmpty = false;
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


/**
 * Displays a toast notification to the user with different styles based on the type.
 * 
 * @param {string} message - The message to display in the toast.
 * @param {string} type - The type of the notification ("error", "warning", "success").
 */
export function showToastNotification(message, type = 'success', timeout = 3000) {
    const toast = document.createElement('div');
    // Calculate the vertical offset based on the number of existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    const verticalOffset = 20 + existingToasts.length * 45; // 20px is the initial top offset, 60px is the height+margin of each toast

    toast.className = 'toast'; // Add a class for easier selection
    toast.style.position = 'fixed';
    toast.style.top = `${verticalOffset}px`; // Use the calculated vertical offset
    toast.style.right = '20px';
    // Set background color based on the type of notification
    switch (type) {
        case 'info':
            toast.style.backgroundColor = '#2196F3'; // Blue for info
            break;
        case 'error':
            toast.style.backgroundColor = '#D32F2F'; // Red for errors
            break;
        case 'warning':
            toast.style.backgroundColor = '#FFA000'; // Amber for warnings
            break;
        case 'success':
        default:
            toast.style.backgroundColor = '#04AA6D'; // Green for success
            break;
    }
    toast.style.color = 'white';
    toast.style.padding = '10px';
    toast.style.borderRadius = '5px';
    toast.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    toast.style.zIndex = '1000';
    toast.style.fontSize = '16px';
    toast.style.fontFamily = 'Arial, sans-serif';
    toast.style.textAlign = 'center';
    toast.style.maxWidth = '80%';
    toast.style.whiteSpace = 'nowrap';
    toast.style.overflow = 'hidden';
    toast.style.textOverflow = 'ellipsis';
    toast.innerText = message;

    document.body.appendChild(toast);

    // Fade out the toast after 3 seconds
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s';
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 500);
    }, timeout);
}


/**
 * Shows a modal notification with a specified title and message.
 * 
 * @param {string} title - The title to display in the modal notification.
 * @param {string} message - The message to display in the modal notification.
 */
export function showModalNotification(title, message) {
    // Create the modal backdrop
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '1001';

    // Create the modal content
    const content = document.createElement('div');
    content.style.position = 'fixed';
    content.style.top = '50%';
    content.style.left = '50%';
    content.style.transform = 'translate(-50%, -50%)';
    content.style.background = 'white';
    content.style.padding = '20px';
    content.style.zIndex = '1001';
    content.style.borderRadius = '10px';
    content.style.fontSize = '16px';
    content.style.lineHeight = '1.5';

    // Create the heading
    const heading = document.createElement('h1');
    heading.innerHTML = title;
    heading.style.marginBottom = '10px';

    const messageElement = document.createElement('p');
    messageElement.id = 'modal-message';
    messageElement.innerHTML = message;

    // Create the close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.display = 'block';
    closeButton.style.margin = '20px auto 0';
    closeButton.style.padding = '10px 20px';
    closeButton.style.border = 'none';
    closeButton.style.background = '#007BFF';
    closeButton.style.color = 'white';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.textContent = 'Close';

    // Remove the modal when the close button is clicked
    closeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        document.body.removeChild(modal);
    });

    // Append the heading, message, and close button to the content
    content.appendChild(heading);
    content.appendChild(messageElement);
    content.appendChild(closeButton);

    // Append the content to the modal
    modal.appendChild(content);

    // Append the modal to the body
    document.body.appendChild(modal);

    // Remove the modal when it's clicked
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}