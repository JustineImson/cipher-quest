const fallbackPuzzles = {
  // CAESAR: Key is a numeric shift (1-25)
  caesar: [
    { difficulty: "easy", plaintext: "COAT", ciphertext: "DPBU", key: "1", clue: "An article of clothing worn for warmth." },
    { difficulty: "easy", plaintext: "PEN", ciphertext: "RGP", key: "2", clue: "An instrument for writing with ink." },
    { difficulty: "easy", plaintext: "RING", ciphertext: "ULQJ", key: "3", clue: "A circular band worn as jewelry." },
    { difficulty: "easy", plaintext: "KEY", ciphertext: "Oic", key: "4", clue: "Used to open locks." },
    { difficulty: "easy", plaintext: "HAT", ciphertext: "IBU", key: "1", clue: "A shaped covering for the head." },
    { difficulty: "moderate", plaintext: "MISSINGLEDGER", ciphertext: "SIYYOTMRKJM KX", key: "6", clue: "The accounting book has disappeared." },
    { difficulty: "moderate", plaintext: "GASLAMPSHADOW", ciphertext: "VPHAPBEHPPSDL", key: "15", clue: "A dark shape cast by the street light." },
    { difficulty: "moderate", plaintext: "CARRIAGEWHISTLE", ciphertext: "OMDDUMSQITUEFQX", key: "12", clue: "The sound that signaled the departure." },
    { difficulty: "hard", plaintext: "THEASHENTRIALBYFIRE", ciphertext: "SGNZRGDMTSZAKAXEHQD", key: "25", clue: "A severe test involving flames and soot." },
    { difficulty: "hard", plaintext: "THECLOCKSTRIKESTHEFINALCONFESSION", key: "7", ciphertext: "AOLJSVJRZAYPRLZAOLMPUHSJVUMLZZPVU", clue: "Time is up for the last admission of guilt." }
  ],

  // VIGENERE: Key is a word used to shift the alphabet
  vigenere: [
    { difficulty: "moderate", plaintext: "SILVERMONOGRAM", ciphertext: "VOSYHUPSCZSTSY", key: "DOG", clue: "Initials engraved on a precious metal." },
    { difficulty: "moderate", plaintext: "SEWNRECEIPT", ciphertext: "UEPPRXEEBRT", key: "CAT", clue: "Proof of purchase stitched into the lining." },
    { difficulty: "moderate", plaintext: "WAXSEALED", ciphertext: "DAEZEALED", key: "HAT", clue: "An envelope closed securely to prevent tampering." },
    { difficulty: "hard", plaintext: "THESECRETLEDGERISBURIED", ciphertext: "FLIWEGVRXPIHKIEMWOFSVMR", key: "MYSTERY", clue: "The financial records are hidden underground." },
    { difficulty: "hard", plaintext: "SMOKEANDMIRRORSOFTHEMAYOR", ciphertext: "HFCKRNARQUYREBEHBSVURAMBE", key: "PHANTOM", clue: "Deceptive tactics used by city officials." },
    { difficulty: "hard", plaintext: "ARINGOFCORRUPTIONANDBRASS", ciphertext: "SZRVOXGQWCCYMHLAWFSRHFZAS", key: "SILENCE", clue: "A criminal syndicate involving cheap metal." },
    { difficulty: "hard", plaintext: "APERFUMEOFLILACANDLIES", ciphertext: "OHSISTYASZPVCOEOHRLWST", key: "ENIGMAS", clue: "A scent of flowers masking deceit." }
  ],

  // SUBSTITUTION: Keyword Mixed Alphabet
  substitution: [
    { difficulty: "easy", plaintext: "BURN", ciphertext: "EURL", key: "PEN", clue: "Mixed Alphabet. The letter was thrown into the fire to...?" },
    { difficulty: "easy", plaintext: "DUST", ciphertext: "AURS", key: "PEN", clue: "Mixed Alphabet. Fine powder found at the crime scene." },
    { difficulty: "moderate", plaintext: "DESTROYFILES", ciphertext: "VEOPNKXRCGEO", key: "SILVER", clue: "Mixed Alphabet. The suspect tried to wipe the evidence." },
    { difficulty: "hard", plaintext: "ILLICITFUNDS", ciphertext: "CGGCLCQRTJVP", key: "SILVER", clue: "Mixed Alphabet. Money obtained through illegal means." },
    { difficulty: "hard", plaintext: "SHADOWYFIGURE", ciphertext: "OB SVKUXRCATNE", key: "MYSTERY", clue: "Mixed Alphabet. Someone was watching from the alley." }
  ],

  // ATBASH: Alphabet is mirrored (A=Z, B=Y)
  atbash: [
    { difficulty: "easy", plaintext: "BOND", ciphertext: "YLMW", key: "NONE", clue: "The alphabet is flipped. A is Z, Z is A." },
    { difficulty: "easy", plaintext: "CRIME", ciphertext: "XIRNV", key: "NONE", clue: "Check the opposite side of the alphabet." },
    { difficulty: "moderate", plaintext: "POLICEMAN", ciphertext: "KLORXVNZM", key: "NONE", clue: "The mirror image of the alphabet reveals the truth." }
  ],

  // RAIL FENCE: Key is an integer (zigzag rows)
  railfence: [
    {
      difficulty: "easy",
      plaintext: "AGENT",
      ciphertext: "AETGN",
      key: "2",
      clue: "Zigzag: Split the word into two rows like a wave."
    },
    {
      difficulty: "easy",
      plaintext: "HELP",
      ciphertext: "HLEP",
      key: "2",
      clue: "A short cry for assistance across two rails."
    },
    {
      difficulty: "moderate",
      plaintext: "EVIDENCE",
      ciphertext: "EEVDNIC",
      key: "3",
      clue: "Waves: Read the letters following a three-rail zigzag pattern."
    },
    {
      difficulty: "moderate",
      plaintext: "SECRET",
      ciphertext: "STER C",
      key: "3",
      clue: "A three-level zigzag hiding the truth."
    },
    {
      difficulty: "hard",
      plaintext: "THECASESOLVED",
      ciphertext: "TEAE OVDHCSSLE",
      key: "2",
      clue: "A long message split into two horizontal tracks."
    },
    {
      difficulty: "hard",
      plaintext: "FOLLOWTHEMONEY",
      ciphertext: "FOEYOLWHMNLTO",
      key: "3",
      clue: "A complex wave of instructions following three rails."
    }
  ],

  // COLUMNAR: Key is a word (determines column order)
  columnar: [
    {
      difficulty: "moderate",
      plaintext: "FOLLOW",
      ciphertext: "FLOOLW",
      key: "COW",
      clue: "Grid: Sort the letters into columns defined by the word COW."
    },
    {
      difficulty: "moderate",
      plaintext: "HIDEOUT",
      ciphertext: "IOHETDU",
      key: "KEY",
      clue: "A location hidden by the order of the word KEY."
    },
    {
      difficulty: "hard",
      plaintext: "MEETMEATNIGHT",
      ciphertext: "MTAITEMTGEENH",
      key: "DOG",
      clue: "Columns: Use the word DOG to reorder the vertical columns of the message."
    },
    {
      difficulty: "hard",
      plaintext: "THEMAPISINSIDE",
      ciphertext: "TAIDMSIHPNEEIS",
      key: "BIRD",
      clue: "The location of the map, organized into columns by BIRD."
    },
    {
      difficulty: "hard",
      plaintext: "STOLENJEWELS",
      ciphertext: "SEEOLWTLNJS",
      key: "LUCK",
      clue: "The missing items are rearranged by the word LUCK."
    }
  ]
};

export default fallbackPuzzles;