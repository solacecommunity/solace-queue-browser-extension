/**
 * Validates the Message VPN URL.
 * @param {string} msgVpnUrl - The Message VPN URL to validate.
 * @returns {boolean} - Returns true if the URL is valid, false otherwise.
 */
export function isValidMsgVpnUrl(msgVpnUrl) { // <<< Added export
    const regex = /^https:\/\/.*\.messaging\.solace\.cloud:\d+\/?$|^http(s?):\/\/localhost:\d+\/?$/;
    return regex.test(msgVpnUrl);
}

/**
 * Validates if the encryption key meets the required criteria.
 * @param {string} key - The encryption key to validate.
 * @returns {boolean} - Returns true if the key is valid, false otherwise.
 */
export function isValidEncryptionKey(key) {
    const minLength = 8;
    const hasNumber = /\d/;
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/;
    const hasCapitalLetter = /[A-Z]/;
    return key.length >= minLength && hasNumber.test(key) && hasSymbol.test(key) && hasCapitalLetter.test(key);
}

/**
 * Validates the Solace Message Router Host protocol.
 * @param {string} smfHost - The Solace Message Router Host to validate.
 * @returns {boolean} - Returns true if the protocol is valid, false otherwise.
 */
export function isValidSmfHostProtocol(smfHost) { // <<< Added export
    const regex = /^(ws|wss|http|https):\/\/.*/;
    return regex.test(smfHost);
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
            if (paramVar === null) {
                 blEmpty = true;
            } else if (paramVar && Object.keys(paramVar).length === 0 && !(paramVar instanceof Date)) {
                blEmpty = true;
            }
        }
    }
    return blEmpty;
}