import {
  caesarCipher,
  substitutionCipher,
  vigenereCipher,
  columnarTranspositionCipher,
  railFenceCipher
} from './cipherAlgorithms.js';

const cipherWeights = {
  easy:   { caesar: 40, substitution: 30, railfence: 20, vigenere: 10 },
  normal: { caesar: 15, substitution: 25, railfence: 30, vigenere: 30 },
  hard:   { caesar: 0,  substitution: 20, railfence: 35, vigenere: 45 },
};

function selectCipherByWeight(difficulty) {
  const weights = cipherWeights[difficulty];
  const pool = Object.entries(weights).flatMap(([type, weight]) =>
    Array(weight).fill(type)
  );
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Randomly select a cipher method based on difficulty
 * @param {string} difficulty 
 * @returns {object} { name: string, applyCipher: function }
 */
export function selectCipherMethod(difficulty = 'easy') {
  let normDifficulty = (difficulty || 'easy').toLowerCase().trim();
  if (normDifficulty === 'moderate' || normDifficulty === 'medium') normDifficulty = 'normal';
  if (!['easy', 'normal', 'hard'].includes(normDifficulty)) normDifficulty = 'easy';

  const type = selectCipherByWeight(normDifficulty);
  const isEnc = Math.random() > 0.5;

  if (type === 'caesar') {
    const shift = Math.floor(Math.random() * 25) + 1;
    return { name: 'Caesar Shift', key: `Shift: ${shift}`, applyCipher: (text) => caesarCipher(text, shift) };
  } else if (type === 'substitution') {
    const kw = normDifficulty === 'easy' ? 'CAT' : normDifficulty === 'normal' ? 'SECRET' : 'OBFUSCATE';
    return { name: isEnc ? 'Substitution Encrypt' : 'Substitution', key: `Keyword: ${kw}`, applyCipher: (text) => substitutionCipher(text, kw), isEncryptionMode: isEnc };
  } else if (type === 'railfence') {
    const rails = normDifficulty === 'hard' ? 4 : 3;
    return { name: isEnc ? 'Rail Fence Encrypt' : 'Rail Fence', key: `Rails: ${rails}`, applyCipher: (text) => railFenceCipher(text, rails), isEncryptionMode: isEnc };
  } else if (type === 'vigenere') {
    const kw = normDifficulty === 'easy' ? 'KEY' : normDifficulty === 'normal' ? 'CODE' : 'MYSTERY';
    return { name: isEnc ? 'Vigenere Encrypt' : 'Vigenere', key: `Keyword: ${kw}`, applyCipher: (text) => vigenereCipher(text, kw), isEncryptionMode: isEnc };
  }
  
  // Fallback
  return { name: 'Caesar Shift', key: 'Shift: 3', applyCipher: (text) => caesarCipher(text, 3) };
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
