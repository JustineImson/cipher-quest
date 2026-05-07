export const StoryCiphers = {
  apartment: {
    // Vigenere Cipher
    easy: { type: 'vigenere', keyword: 'CAT', clue: "Vigenere Keyword is explicitly 'CAT'.", ciphertext: "NOZU", solution: "LOGS" },
    medium: { type: 'vigenere', keyword: 'MAYOR', clue: "SysAdmin Password (Vigenere): MAYOR.", ciphertext: "EYQHVYYHQBQD", solution: "SYSTEMHACKED" },
    hard: { type: 'vigenere', keyword: 'MAYOR', clue: "SysAdmin: MAYOR", ciphertext: "ABDIJOARSUPARO", solution: "OBFUSCATEDDATA" }
  },
  park: {
    // Railfence Cipher
    easy: { type: 'railfence', rails: 2, clue: "Simple zig-zag... only 2 rails.", ciphertext: "HDEIDN", solution: "HIDDEN" },
    medium: { type: 'railfence', rails: 3, clue: "Footprints cross back and forth... 3 rails.", ciphertext: "SECTLNAHOCE", solution: "STOLENCACHE" },
    hard: { type: 'railfence', rails: 5, clue: "Zig-zag tracks... 5 rails.", ciphertext: "CILTNSASEPNEDODR", solution: "CLANDESTINEDROPS" }
  },
  alley: {
    // Columnar Transposition
    easy: { type: 'columnar', keyword: 'BAD', clue: "Columnar Transposition. Key: BAD.", ciphertext: "REBBI", solution: "BRIBE" },
    medium: { type: 'columnar', keyword: 'HACK', clue: "Columnar Transposition. Key: HACK.", ciphertext: "UOSNHMYHE", solution: "HUSHMONEY" },
    hard: { type: 'columnar', keyword: 'HACKER', clue: "Columnar Transposition. Key: HACKER", ciphertext: "UURBGATETSFENEOIRPO", solution: "SUBTERFUGEOPERATION" }
  },
  beach: {
    // Keyword Substitution
    easy: { type: 'substitution', keyword: 'PEN', clue: "Keyword Mixed Alphabet. The key is just PEN.", ciphertext: "ETQL", solution: "BURN" },
    medium: { type: 'substitution', keyword: 'SILVER', clue: "Keyword Mixed Alphabet. Key: SILVER.", ciphertext: "VEPQOKYYRCGEP", solution: "DESTROYFILES" },
    hard: { type: 'substitution', keyword: 'SILVER', clue: "Keyword Mixed Alphabet. Key: SILVER.", ciphertext: "CGGCLCQRTJVP", solution: "ILLICITFUNDS" }
  }
};