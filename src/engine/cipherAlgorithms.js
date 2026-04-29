/**
 * Mathematical helper to handle modulo for negative numbers.
 */
function mod(n, m) {
  return ((n % m) + m) % m;
}

// 1. Caesar Shift
export function caesarCipher(text, shift = 3) {
  return text
    .split('')
    .map(char => {
      if (char.match(/[a-z]/i)) {
        const charCode = char.charCodeAt(0);
        const isUpper = char === char.toUpperCase();
        const base = isUpper ? 65 : 97;
        return String.fromCharCode(mod(charCode - base + shift, 26) + base);
      }
      return char;
    })
    .join('');
}

// 2. Atbash
export function atbashCipher(text) {
  return text
    .split('')
    .map(char => {
      if (char.match(/[a-z]/i)) {
        const charCode = char.charCodeAt(0);
        const isUpper = char === char.toUpperCase();
        const base = isUpper ? 65 : 97;
        return String.fromCharCode(base + 25 - (charCode - base));
      }
      return char;
    })
    .join('');
}

// 3. Vigenère
export function vigenereCipher(text, keyword = "AEGIS") {
  let keywordIndex = 0;
  return text
    .split('')
    .map(char => {
      if (char.match(/[a-z]/i)) {
        const isUpper = char === char.toUpperCase();
        const base = isUpper ? 65 : 97;
        const charCode = char.charCodeAt(0);
        
        // Calculate shift from the keyword character
        const shiftChar = keyword[keywordIndex % keyword.length].toUpperCase();
        const shift = shiftChar.charCodeAt(0) - 65;
        
        keywordIndex++; // Only increment keyword index on letters
        return String.fromCharCode(mod(charCode - base + shift, 26) + base);
      }
      return char;
    })
    .join('');
}

// 4. Columnar Transposition (Keyword-based)
export function columnarTranspositionCipher(text, keyword = "TIME") {
  const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const kw = keyword.toUpperCase();
  const numCols = kw.length;
  
  let sortedKeyIndices = kw
    .split('')
    .map((char, originalIndex) => ({ char, originalIndex }))
    .sort((a, b) => {
        if (a.char === b.char) return a.originalIndex - b.originalIndex;
        return a.char.localeCompare(b.char);
    })
    .map(val => val.originalIndex);

  const numRows = Math.ceil(sanitizedText.length / numCols);
  
  let result = '';
  // Traverse and build text traversing by the sorted keyword columns
  for (let sortIdx = 0; sortIdx < numCols; sortIdx++) {
    const originalColIdx = sortedKeyIndices[sortIdx];

    for (let row = 0; row < numRows; row++) {
      const charIndex = (row * numCols) + originalColIdx;
      if (charIndex < sanitizedText.length) {
        result += sanitizedText[charIndex];
      }
    }
  }
  return result;
}

// 5. Rail Fence
export function railFenceCipher(text, rails = 3) {
  const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (rails === 1 || sanitizedText.length <= rails) return sanitizedText;

  const fence = Array.from({ length: rails }, () => []);
  let rail = 0;
  let direction = 1;

  for (let i = 0; i < sanitizedText.length; i++) {
    fence[rail].push(sanitizedText[i]);
    rail += direction;

    if (rail === rails - 1 || rail === 0) {
      direction = -direction;
    }
  }

  return fence.flat().join('');
}

// 6. Substitution (Keyword-based)
export function substitutionCipher(text, keyword = "") {
  const STANDARD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const keyChars = keyword.toUpperCase().split("");
  const uniqueKeyChars = [];
  for (const char of keyChars) {
    if (/^[A-Z]$/.test(char) && !uniqueKeyChars.includes(char)) {
      uniqueKeyChars.push(char);
    }
  }

  const remaining = STANDARD_ALPHABET.filter(
    (char) => !uniqueKeyChars.includes(char)
  );
  const targetLegend = [...uniqueKeyChars, ...remaining];

  return text
    .split('')
    .map(char => {
      if (char.match(/[a-z]/i)) {
        const isUpper = char === char.toUpperCase();
        const index = char.toUpperCase().charCodeAt(0) - 65;
        const mappedChar = targetLegend[index];
        return isUpper ? mappedChar : mappedChar.toLowerCase();
      }
      return char;
    })
    .join('');
}
