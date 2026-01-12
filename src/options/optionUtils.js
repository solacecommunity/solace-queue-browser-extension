
/**
 * Retrieves the value of a DOM element by its ID.
 * 
 * @param {string} id - The ID of the DOM element.
 * @returns {string} The value of the DOM element.
 */
export function getValue(id) {
    return document.getElementById(id).value;
}

/**
* Sets the value of a DOM element by its ID.
* 
* @param {string} id - The ID of the DOM element.
* @param {string} value - The value to set for the DOM element. Defaults to an empty string if not provided.
*/
export function setValue(id, value) {
    document.getElementById(id).value = value || '';
}

/**
* Retrieves the checked state of a checkbox DOM element by its ID.
* 
* @param {string} id - The ID of the checkbox DOM element.
* @returns {boolean} The checked state of the checkbox.
*/
export function getChecked(id) {
    return document.getElementById(id).checked;
}

/**
* Sets the checked state of a checkbox DOM element by its ID.
* 
* @param {string} id - The ID of the checkbox DOM element.
* @param {boolean} value - The checked state to set for the checkbox. Defaults to false if not provided.
*/
export function setChecked(id, value) {
    document.getElementById(id).checked = value || false;
}

/**
 * Handles errors by logging them to the console and displaying a modal notification to the user.
 * 
 * @param {Error} error - The error object to handle.
 */
export function handleError(error) {
    console.error(error);
    showModalNotification('Error', error.message);
}


/**
 * Displays a toast notification to the user with different styles based on the type.
 * 
 * @param {string} message - The message to display in the toast.
 * @param {string} type - The type of the notification ("error", "warning", "success").
 */
export function showToastNotification(message, type = 'success', timeout = 3000) {
    const toast = document.createElement('div');
    const existingToasts = document.querySelectorAll('.toast');
    const verticalOffset = 20 + existingToasts.length * 45; // 20px is the initial top offset, 60px is the height+margin of each toast

    toast.className = 'toast';
    toast.style.position = 'fixed';
    toast.style.top = `${verticalOffset}px`;
    toast.style.right = '20px';
    switch (type) {
        case 'info':
            toast.style.backgroundColor = '#2196F3';
            break;
        case 'error':
            toast.style.backgroundColor = '#D32F2F';
            break;
        case 'warning':
            toast.style.backgroundColor = '#FFA000';
            break;
        case 'success':
        default:
            toast.style.backgroundColor = '#04AA6D';
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

    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s';
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 500); // Remove the toast after the fade-out transition
    }, timeout);
}


/**
 * Shows a modal notification with a specified title and message.
 * 
 * @param {string} title - The title to display in the modal notification.
 * @param {string} message - The message to display in the modal notification.
 * @param {string} reload - Whether to reload the page after the modal is closed.
 */
export function showModalNotification(title, message, reload = false) {
    // Create the modal backdrop
    const modal = document.createElement('div');
	modal.id = 'modal-notification-id';
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
        console.log(reload);
        if (reload) {
            setTimeout(() => {
                window.location.reload();
            }, 250);
        }
    });

    content.appendChild(heading);
    content.appendChild(messageElement);
    content.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(modal);
}


/**
 * Shows a password input modal with a specified title and message.
 * The modal includes an input field for the user to enter a password.
 * 
 * @param {string} title - The title to display in the modal notification.
 * @param {string} defaultMessage - The defaultMessage to display in the modal notification.
 * @param {boolean} cancelOption - Whether to include a cancel button in the modal.
 * @param {boolean} resetOption - Whether to include a reset button in the modal.
 */
export function displayEncryptionKeyInputWindow(title, defaultMessage = '', cancelOption = false, resetOption = false, errorMessage = null) {

    // Create the modal backdrop
    const modal = document.createElement('div');
    modal.id = 'encryption-key-window';
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
    content.style.paddingLeft = '20px';
    content.style.paddingRight = '20px';
    content.style.zIndex = '1001';
    content.style.borderRadius = '10px';
    content.style.fontSize = '16px';
    content.style.lineHeight = '1.5';

    // Create the heading
    const heading = document.createElement('h1');
    heading.innerHTML = title;
    heading.style.marginBottom = '10px';

    // Create the message element
    const messageElement = document.createElement('p');
	messageElement.id = 'encryption-key-window-message-id';
    if (errorMessage) {
        messageElement.textContent = errorMessage;
        messageElement.style.color = 'red';
        messageElement.style.fontWeight = 'bold';
    } else {
        messageElement.textContent = defaultMessage;
        messageElement.style.color = 'black';
        messageElement.style.fontWeight = 'normal';
    }

    // Create the input field
    const inputElement = document.createElement('input');
    inputElement.id = 'encryption-key-window-input-box';
    inputElement.type = 'password';
    inputElement.style.display = 'block';
    inputElement.style.margin = '10px auto';
    inputElement.style.padding = '10px';
    inputElement.style.width = '80%';
    inputElement.style.border = '1px solid #ccc';
    inputElement.style.borderRadius = '5px';
    inputElement.style.position = 'relative';

    // Create the eye icon
    const eyeIcon = document.createElement('span');
    eyeIcon.innerHTML = '&#128065;'; // Unicode for eye symbol
    eyeIcon.style.position = 'absolute';
    eyeIcon.style.right = '50px';
    eyeIcon.style.top = '50%';
    eyeIcon.style.transform = 'translateY(-50%)';
    eyeIcon.style.cursor = 'pointer';

    eyeIcon.addEventListener('click', () => {
        if (inputElement.type === 'password') {
            inputElement.type = 'text';
        } else {
            inputElement.type = 'password';
        }
    });

    // Append the eye icon to the input element's parent
    const inputWrapper = document.createElement('div');
    inputWrapper.style.position = 'relative';
    inputWrapper.style.display = 'inline-block';
    inputWrapper.style.width = '100%';
    inputWrapper.appendChild(inputElement);
    inputWrapper.appendChild(eyeIcon);

    // Create the password requirements element
    const requirementsContainer = document.createElement('div');
    requirementsContainer.style.textAlign = 'center';
    requirementsContainer.style.marginTop = '20px';

    const requirementsHeading = document.createElement('div');
    requirementsHeading.textContent = 'Password Requirements:';
    requirementsHeading.style.fontWeight = 'bold';
    requirementsHeading.style.marginBottom = '10px';

    const requirementsElement = document.createElement('ul');
    requirementsElement.style.listStyleType = 'none';
    requirementsElement.style.paddingLeft = '0';
    requirementsElement.style.marginTop = '0';

    const requirement1 = document.createElement('li');
    requirement1.textContent = 'At least 8 characters';
    const requirement2 = document.createElement('li');
    requirement2.textContent = 'At least 1 capital letter';
    const requirement3 = document.createElement('li');
    requirement3.textContent = 'At least 1 number';
    const requirement4 = document.createElement('li');
    requirement4.textContent = 'At least 1 symbol';

    requirementsElement.appendChild(requirement1);
    requirementsElement.appendChild(requirement2);
    requirementsElement.appendChild(requirement3);
    requirementsElement.appendChild(requirement4);

    requirementsContainer.appendChild(requirementsHeading);
    requirementsContainer.appendChild(requirementsElement);
    // Create the button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '20px';

    // Create the submit button
    const submitButton = document.createElement('button');
    submitButton.id = 'encryption-key-window-submit-button';
    submitButton.textContent = 'Submit';
    submitButton.style.display = 'block';
    submitButton.style.margin = '20px auto 0';
    submitButton.style.padding = '10px 20px';
    submitButton.style.border = 'none';
    submitButton.style.backgroundColor = '#13aa52';
    submitButton.style.color = 'white';
    submitButton.style.borderRadius = '5px';
    submitButton.style.cursor = 'pointer';

    // Append buttons to the button container
    buttonContainer.appendChild(submitButton);

    // Sometimes it is useful to have a cancel option
    if (cancelOption) {
        // Create the close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.display = 'block';
        closeButton.style.margin = '20px auto 0';
        closeButton.style.padding = '10px 20px';
        closeButton.style.border = 'none';
        closeButton.style.backgroundColor = '#ccc';
        closeButton.style.color = 'black';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';

        // Remove the modal when the close button is clicked
        closeButton.addEventListener('click', (event) => {
            document.body.removeChild(modal);
        });
        buttonContainer.appendChild(closeButton);
    }
    // Sometimes it is useful to have a cancel option
    if (resetOption) {
        // Create the close button
        const resetOption = document.createElement('button');
        resetOption.id = 'encryption-key-window-reset-button';
        resetOption.textContent = 'Reset Extension';
        resetOption.style.display = 'block';
        resetOption.style.margin = '20px auto 0';
        resetOption.style.padding = '10px 20px';
        resetOption.style.border = 'none';
        resetOption.style.backgroundColor = 'red';
        resetOption.style.color = 'white';
        resetOption.style.borderRadius = '5px';
        resetOption.style.cursor = 'pointer';

        buttonContainer.appendChild(resetOption);
    }

    content.appendChild(heading);
    content.appendChild(messageElement);
    content.appendChild(requirementsContainer);
    content.appendChild(inputWrapper);
    content.appendChild(buttonContainer);

    modal.appendChild(content);
    document.body.appendChild(modal);
}

export function showResetConfirmationWindow() {

    // Create the modal backdrop
    const modal = document.createElement('div');
    modal.id = 'reset-confirmation-window';
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
    heading.innerHTML = 'Reset Confirmation';
    heading.style.marginBottom = '10px';

    // Create the message element
    const messageElement = document.createElement('p');
    messageElement.id = 'reset-confirmation-message-id';
    messageElement.innerHTML = 'Are you sure you want to factory reset this extension?';

    // Create the button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '20px';

    // Create the close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.display = 'block';
    closeButton.style.margin = '20px auto 0';
    closeButton.style.padding = '10px 20px';
    closeButton.style.border = 'none';
    closeButton.style.backgroundColor = '#ccc';
    closeButton.style.color = 'black';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.textContent = 'Close';
    
    closeButton.addEventListener('click', (event) => {
        document.body.removeChild(modal);
    });

    closeButton.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            closeButton.click();
        }
    });

    // Create the submit button
    const submitButton = document.createElement('button');
    submitButton.id = 'reset-confirmation-submit-button';
    submitButton.textContent = 'Reset';
    submitButton.style.display = 'block';
    submitButton.style.margin = '20px auto 0';
    submitButton.style.padding = '10px 20px';
    submitButton.style.border = 'none';
    submitButton.style.backgroundColor = '#c01616';
    submitButton.style.color = 'white';
    submitButton.style.borderRadius = '5px';
    submitButton.style.cursor = 'pointer';
    
    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(closeButton);
    content.appendChild(heading);
    content.appendChild(messageElement);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
}