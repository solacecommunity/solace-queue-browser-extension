// Note: this file is a copy of the ./src/lib/encryptionUtils.js file and must remain in sync with it.
// The the importScripts() function in worker_wrapper.js can not import functions that contain 'export' statements.
// and options.js does not have a function defined for importScripts(). 
// Therefore, the functions in this file must be copied to encryptionUtils.js for use in worker_wrapper.js.


// Encryption functions
/**
 * Retrieves the encryption key from session storage.
 * 
 * @returns {string} The encryption key stored in session storage.
 */
export async function getEncryptionKey() {
  const encryptionKey = await chrome.storage.session.get('key');
  return encryptionKey.key;
}

/**
 * Sets the encryption key in session storage.
 * 
 * @param {string} key - The encryption key to store in session storage.
 */
export async function setEncryptionKey(key) {
  chrome.storage.session.set({ 'key': key });
}

/**
 * Generates a 256 bit key for encrypting the password using the Web Crypto API.
 * 
 * @param {string} strKey - The encryption key to hash.
 * @returns {object.Promise<ArrayBuffer>} The generated key.
 */
export async function generateSHA256Hash(strKey) {
  
  // Encode the key as an ArrayBuffer to use it in the importKey method.
  const encodedKey = new TextEncoder().encode(strKey);

  // Hash the key to get a 256-bit key for AES-GCM encryption.
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedKey);

  return hashBuffer;
}

/**
 * Converts a Base64 string to an ArrayBuffer.
 * 
 * @param {string} base64 - The Base64 string to convert.
 * @returns {ArrayBuffer} The ArrayBuffer representation of the Base64 string.
 */
export function base64ToArrayBuffer(base64) {
  const binaryString = customBase64Decode(base64);

  const len = binaryString.length;
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a ArrayBuffer to a Base64 string.
 * 
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert.
 * @returns {string} The Base64 string representation of the ArrayBuffer.
 */
export function arrayBufferToBase64(buffer) {
  let string = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    string += String.fromCharCode(bytes[i]);
  }
  return customBase64Encode(string);
}

/**
 * Encrypts a string using the Web Crypto API.
 * 
 * @param {string} string - The string to encrypt.
 * @param {ArrayBuffer} key - A hash key used for encryption.
 * @returns {object.Promise<string>} The encrypted string.
 * @returns {object.Promise<string>} The initialization vector used for encryption.
 */
export async function encryptString(string, key) {
  // If the encryption key is not set in the session storage, prompt the user to enter it
  if (!key) {
    throw new Error('No Encryption Key. Encryption key is required to encrypt the connection.');
  }
  let encryptedString = '';
  let iv = '';

  // Generate a 256-bit key for AES-GCM encryption.
  const cryptoKey = await generateCryptoKey(key);
  const encryptedData = await encryptAESData(string, cryptoKey);

  encryptedString = arrayBufferToBase64(encryptedData.encrypted);
  iv = arrayBufferToBase64(encryptedData.iv);

  return { encryptedString, iv };
}

/**
 * Decrypts an encrypted string using the Web Crypto API.
 * 
 * @param {base64String} string - The encrypted base64 string to decrypt.
 * @param {base64String} iv - The base64 initialization vector used for decryption.
 * @param {ArrayBuffer} key - The encryption key used for decryption.
 * @returns {Promise<string>} The decrypted string.
 */
export async function decryptString(string, iv, key) {
  // If the encryption key is not set in the session storage, prompt the user to enter it
  if (!key) {
    throw new Error('No Encryption Key. Encryption key is required to decrypt the connection.');
  }
  let decryptedString = '';

  // Generate a 256-bit key for AES-GCM decryption.
  const cryptoKey = await generateCryptoKey(key);
  
  const encryptedDataArrayBuffer = base64ToArrayBuffer(string);
  const ivArrayBuffer = base64ToArrayBuffer(iv);

  decryptedString = await decryptAESData(encryptedDataArrayBuffer, cryptoKey, ivArrayBuffer);

  return decryptedString;
}

/**
 * Encodes text to base64.
 * 
 * @param {string} input - The input string to encode.
 * @returns {string} The Base64 encoded string.
 */
function customBase64Encode(input) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;

  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = input.charCodeAt(i++);
    const c = input.charCodeAt(i++);
    const index1 = a >> 2;
    const index2 = ((a & 3) << 4) | (b >> 4);
    const index3 = isNaN(b) ? 64 : ((b & 15) << 2) | (c >> 6);
    const index4 = isNaN(c) ? 64 : c & 63;

    output += chars.charAt(index1) + chars.charAt(index2) + chars.charAt(index3) + chars.charAt(index4);
  }

  return output;
}

/**
 * Converts a Base64 string to text.
 * 
 * @param {string} base64 - The Base64 string to convert.
 * @returns {string} The input string representation of the Base64 string.
 */
function customBase64Decode(base64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;

  const input = base64.replace(/[^A-Za-z0-9\+\/\=]/g, '');

  while (i < input.length) {
    const index1 = chars.indexOf(input.charAt(i++));
    const index2 = chars.indexOf(input.charAt(i++));
    const index3 = chars.indexOf(input.charAt(i++));
    const index4 = chars.indexOf(input.charAt(i++));
    const a = (index1 << 2) | (index2 >> 4);
    const b = ((index2 & 15) << 4) | (index3 >> 2);
    const c = ((index3 & 3) << 6) | index4;

    output += String.fromCharCode(a);
    if (index3 !== 64) output += String.fromCharCode(b);
    if (index4 !== 64) output += String.fromCharCode(c);
  }

  return output;
}

/**
 * Generates a 256 bit key for encrypting the password using the Web Crypto API.
 * 
 * @param {ArrayBuffer} arrayBuffer - An Array Buffer containing the hash value of the users encryption key.
 * @returns {object.Promise<CryptoKey>} The generated key.
 */
async function generateCryptoKey(arrayBuffer) {

  const key = await crypto.subtle.importKey(
    "raw",
    arrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return key;
}


// ############################################################################################################

// Helper functions

/**
 * Encrypts a password using the Web Crypto API.
 * 
 * @param {string} plainText - The plain text to encrypt.
 * @param {Promise<CryptoKey>} key - The key used for encryption.
 * @returns {object.Promise<ArrayBuffer>} The encrypted data.
 * @returns {object.Promise<Uint8Array>} The initialization vector used for encryption.
 */
async function encryptAESData(plainText, key) {
  const encodedData = new TextEncoder().encode(plainText);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData
  );

  return { encrypted, iv };
}


/**
 * Decrypts encrypted data using the Web Crypto API.
 * 
 * @param {Promise<ArrayBuffer>} encryptedData - The encrypted data to decrypt.
 * @param {Promise<CryptoKey>} key - The key used for decryption.
 * @param {Uint8Array} iv - The initialization vector used for decryption.
 * @returns {string} The decrypted data as a string.
 */
async function decryptAESData(encryptedData, key, iv) {
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encryptedData
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error(`${error}`);
    throw new Error(`Decryption failed. Please set the correct encryption key.`);
  }
}