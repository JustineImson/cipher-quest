import { 
  caesarCipher, 
  substitutionCipher, 
  vigenereCipher, 
  columnarTranspositionCipher, 
  railFenceCipher 
} from './cipherAlgorithms.js';

/**
 * Randomly select a cipher method based on difficulty
 * @param {string} difficulty 
 * @returns {object} { name: string, applyCipher: function }
 */
export function selectCipherMethod(difficulty = 'easy') {
  const normDifficulty = difficulty.toLowerCase();
  let choices = [];

  if (normDifficulty === 'easy') {
    const shift = Math.floor(Math.random() * 25) + 1;
    choices = [
      { name: 'Caesar Shift', key: `Shift: ${shift}`, applyCipher: (text) => caesarCipher(text, shift) },
      { name: 'Substitution', key: 'Keyword: CAT', applyCipher: (text) => substitutionCipher(text, 'CAT') },
      { name: 'Substitution Encrypt', key: 'Keyword: DOG', applyCipher: (text) => substitutionCipher(text, 'DOG'), isEncryptionMode: true },
      { name: 'Columnar', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME') },
      { name: 'Columnar Encrypt', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME'), isEncryptionMode: true },
      { name: 'Rail Fence', key: 'Rails: 3', applyCipher: (text) => railFenceCipher(text, 3) },
      { name: 'Rail Fence Encrypt', key: 'Rails: 3', applyCipher: (text) => railFenceCipher(text, 3), isEncryptionMode: true },
      { name: 'Vigenere', key: 'Keyword: KEY', applyCipher: (text) => vigenereCipher(text, 'KEY') },
      { name: 'Vigenere Encrypt', key: 'Keyword: FUN', applyCipher: (text) => vigenereCipher(text, 'FUN'), isEncryptionMode: true }
    ];
  } else if (normDifficulty === 'medium') {
    choices = [
      { name: 'Substitution', key: 'Keyword: SECRET', applyCipher: (text) => substitutionCipher(text, 'SECRET') },
      { name: 'Substitution Encrypt', key: 'Keyword: PUZZLE', applyCipher: (text) => substitutionCipher(text, 'PUZZLE'), isEncryptionMode: true },
      { name: 'Rail Fence', key: 'Rails: 3', applyCipher: (text) => railFenceCipher(text, 3) },
      { name: 'Rail Fence Encrypt', key: 'Rails: 3', applyCipher: (text) => railFenceCipher(text, 3), isEncryptionMode: true },
      { name: 'Columnar', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME') },
      { name: 'Columnar Encrypt', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME'), isEncryptionMode: true },
      { name: 'Vigenere', key: 'Keyword: CODE', applyCipher: (text) => vigenereCipher(text, 'CODE') },
      { name: 'Vigenere Encrypt', key: 'Keyword: HIDE', applyCipher: (text) => vigenereCipher(text, 'HIDE'), isEncryptionMode: true }
    ];
  } else if (normDifficulty === 'hard') {
    choices = [
      { name: 'Substitution', key: 'Keyword: OBFUSCATE', applyCipher: (text) => substitutionCipher(text, 'OBFUSCATE') },
      { name: 'Substitution Encrypt', key: 'Keyword: ENCRYPT', applyCipher: (text) => substitutionCipher(text, 'ENCRYPT'), isEncryptionMode: true },
      { name: 'Vigenere', key: 'Keyword: MYSTERY', applyCipher: (text) => vigenereCipher(text, 'MYSTERY') },
      { name: 'Vigenere Encrypt', key: 'Keyword: ENIGMA', applyCipher: (text) => vigenereCipher(text, 'ENIGMA'), isEncryptionMode: true },
      { name: 'Columnar', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME') },
      { name: 'Columnar Encrypt', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME'), isEncryptionMode: true },
      { name: 'Rail Fence', key: 'Rails: 4', applyCipher: (text) => railFenceCipher(text, 4) },
      { name: 'Rail Fence Encrypt', key: 'Rails: 4', applyCipher: (text) => railFenceCipher(text, 4), isEncryptionMode: true }
    ];
  } else {
    // fallback
    choices = [
      { name: 'Caesar Shift', key: 'Shift: 5', applyCipher: (text) => caesarCipher(text, 5) },
      { name: 'Substitution', key: 'Keyword: CAT', applyCipher: (text) => substitutionCipher(text, 'CAT') },
      { name: 'Substitution Encrypt', key: 'Keyword: CAT', applyCipher: (text) => substitutionCipher(text, 'CAT'), isEncryptionMode: true },
      { name: 'Columnar', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME') },
      { name: 'Columnar Encrypt', key: 'Keyword: TIME', applyCipher: (text) => columnarTranspositionCipher(text, 'TIME'), isEncryptionMode: true },
      { name: 'Rail Fence', key: 'Rails: 3', applyCipher: (text) => railFenceCipher(text, 3) },
      { name: 'Rail Fence Encrypt', key: 'Rails: 3', applyCipher: (text) => railFenceCipher(text, 3), isEncryptionMode: true },
      { name: 'Vigenere', key: 'Keyword: CIPHER', applyCipher: (text) => vigenereCipher(text, 'CIPHER') },
      { name: 'Vigenere Encrypt', key: 'Keyword: CIPHER', applyCipher: (text) => vigenereCipher(text, 'CIPHER'), isEncryptionMode: true }
    ];
  }

  // Randomly pick one from the choices
  const selection = choices[Math.floor(Math.random() * choices.length)];
  return selection;
}

/**
 * Compares user input securely against the actual decrypted term
 * @param {string} userInput 
 * @param {string} actualTerm 
 * @returns {boolean}
 */
export function validateAnswer(userInput, actualTerm) {
  // Strict string sanitization:
  // 1. Remove all spaces and non-alphanumeric characters.
  // 2. Convert to uppercase for case-insensitivity.
  const sanitize = (str) => {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  const cleanInput = sanitize(userInput);
  const cleanActual = sanitize(actualTerm);

  // Guard against empty strings
  if (cleanInput === '' || cleanActual === '') return false;

  return cleanInput === cleanActual;
}
