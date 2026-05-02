export const StoryCiphers = {
  apartment: {
    easy: { type: 'vigenere', keyword: 'CAT', clue: "Vigenere Keyword is explicitly 'CAT'.", ciphertext: "RKBOTQWM CBQKVXF", solution: "PRINTOUT ABORTED" },
    medium: { type: 'vigenere', keyword: 'MAYOR', clue: "SysAdmin Password (Vigenere): MAYOR.", ciphertext: "BRAYMIOH MNSKYCH", solution: "PRINTOUT ABORTED" },
    hard: { type: 'vigenere', keyword: 'MAYOR', clue: "SysAdmin: MAYOR", ciphertext: "BRAYMIOH MNSKYCH", solution: "PRINTOUT ABORTED" }
  },
  park: {
    easy: { type: 'railfence', rails: 2, clue: "Simple zig-zag... only 2 rails.", ciphertext: "SOE RMOE TLNFO CKR", solution: "STOLEN FROM LOCKER" },
    medium: { type: 'railfence', rails: 3, clue: "Footprints cross back and forth... 3 rails.", ciphertext: "SEME T LNFO CKR ORO", solution: "STOLEN FROM LOCKER" },
    hard: { type: 'railfence', rails: 5, clue: "Zig-zag tracks... 5 rails.", ciphertext: "SMTNCEOLKORFOLRE", solution: "STOLEN FROM LOCKER" }
  },
  alley: {
    easy: { type: 'columnar', keyword: 'BAD', clue: "Columnar Transposition. Key: BAD.", ciphertext: "O O E R S C R T A U P A C D D R R E", solution: "CORPORATE CARD USED" },
    medium: { type: 'columnar', keyword: 'HACK', clue: "Columnar Transposition. Key: HACK.", ciphertext: "C R C E O A A S P T R D R O D U", solution: "CORPORATE CARD USED" },
    hard: { type: 'columnar', keyword: 'HACKER', clue: "Columnar Transposition. Key: HACKER", ciphertext: "ODPECAOUCSRRRTEAD", solution: "CORPORATE CARD USED" }
  },
  beach: {
    easy: { type: 'substitution', keyword: 'PEN', clue: "Keyword Mixed Alphabet. The key is just PEN.", ciphertext: "AJSBOPHKQS ATSMDC", solution: "BLUEPRINTS BURNED" },
    medium: { type: 'substitution', keyword: 'SILVER', clue: "Keyword Mixed Alphabet. Key: SILVER.", ciphertext: "AHRDOQFMSQ ARQMDV", solution: "BLUEPRINTS BURNED" },
    hard: { type: 'substitution', keyword: 'SILVER', clue: "Keyword Mixed Alphabet. Key: SILVER.", ciphertext: "AHRDOQFMSQ ARQMDV", solution: "BLUEPRINTS BURNED" }
  }
};
