/**
 * cryptoUtils.js
 * Field-level AES-GCM encryption for sensitive Firestore fields.
 *
 * The encryption key is derived from VITE_FIELD_ENCRYPTION_KEY (env var).
 * Encrypted values are stored as Base64 strings and prefixed with "enc:"
 * so the app can detect whether a field is encrypted or plaintext (legacy).
 */

const ALGO = 'AES-GCM';
const ENC_PREFIX = 'enc:';

/**
 * Derive a CryptoKey from the app's encryption passphrase.
 * The key is cached in memory after the first call.
 */
let _cachedKey = null;
async function getDerivedKey() {
  if (_cachedKey) return _cachedKey;

  const passphrase =
    import.meta.env.VITE_FIELD_ENCRYPTION_KEY ||
    'cipherquest-default-fallback-key!!'; // dev fallback only

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.slice(0, 32).padEnd(32, '0')),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );

  _cachedKey = keyMaterial;
  return _cachedKey;
}

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext
 * @returns {Promise<string>} Base64-encoded ciphertext prefixed with "enc:"
 */
export async function encryptField(plaintext) {
  if (!plaintext) return plaintext;
  // Already encrypted — skip
  if (String(plaintext).startsWith(ENC_PREFIX)) return plaintext;

  try {
    const key = await getDerivedKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: ALGO, iv },
      key,
      encoded
    );

    // Combine iv (12 bytes) + ciphertext and Base64-encode
    const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.byteLength);

    const base64 = btoa(String.fromCharCode(...combined));
    return `${ENC_PREFIX}${base64}`;
  } catch (err) {
    console.error('[cryptoUtils] Encryption failed:', err);
    return plaintext; // Graceful fallback — never block the user
  }
}

/**
 * Decrypt an encrypted field value.
 * Returns the original plaintext if the value is not encrypted (legacy support).
 * @param {string} encrypted
 * @returns {Promise<string>}
 */
export async function decryptField(encrypted) {
  if (!encrypted) return encrypted;
  if (!String(encrypted).startsWith(ENC_PREFIX)) return encrypted; // Plaintext/legacy

  try {
    const key = await getDerivedKey();
    const base64 = encrypted.slice(ENC_PREFIX.length);
    const combined = new Uint8Array(
      atob(base64).split('').map((c) => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plainBuffer);
  } catch (err) {
    console.error('[cryptoUtils] Decryption failed:', err);
    return encrypted; // Return raw value as fallback
  }
}

/**
 * Checks if a stored field value is currently encrypted.
 * @param {string} value
 * @returns {boolean}
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}
