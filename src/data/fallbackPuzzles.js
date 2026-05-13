const fallbackPuzzles = {
  easy: [
    { plaintext: "COAT", key: "1", clue: "An article of clothing worn for warmth." },
    { plaintext: "PEN", key: "2", clue: "An instrument for writing with ink." },
    { plaintext: "RING", key: "3", clue: "A circular band worn as jewelry." },
    { plaintext: "KEY", key: "4", clue: "Used to open locks." },
    { plaintext: "DUST", key: "5", clue: "Fine, dry powder consisting of tiny particles." },
    { plaintext: "HAT", key: "1", clue: "A shaped covering for the head." },
    { plaintext: "BOOT", key: "2", clue: "Sturdy footwear covering the foot and ankle." },
    { plaintext: "NOTE", key: "3", clue: "A brief record of something written down." }
  ],
  moderate: [
    { plaintext: "MISSINGLEDGER", key: "6", clue: "The accounting book has disappeared." },
    { plaintext: "GASLAMPSHADOW", key: "15", clue: "A dark shape cast by the street light." },
    { plaintext: "ASHENFOOTPRINTS", key: "25", clue: "Traces left behind in the fireplace debris." },
    { plaintext: "SILVERMONOGRAM", key: "DOG", clue: "Initials engraved on a precious metal." },
    { plaintext: "SEWNRECEIPT", key: "CAT", clue: "Proof of purchase stitched into the lining." },
    { plaintext: "WAXSEALED", key: "HAT", clue: "An envelope closed securely to prevent tampering." },
    { plaintext: "CARRIAGEWHISTLE", key: "12", clue: "The sound that signaled the departure." },
    { plaintext: "NOCTURNALWHISPER", key: "BIRD", clue: "A quiet voice heard only at night." }
  ],
  hard: [
    { plaintext: "THESECRETLEDGERISBURIED", key: "MYSTERY", clue: "The financial records are hidden underground." },
    { plaintext: "SMOKEANDMIRRORSOFTHEMAYOR", key: "PHANTOM", clue: "Deceptive tactics used by the city official." },
    { plaintext: "ARINGOFCORRUPTIONANDBRASS", key: "SILENCE", clue: "A criminal syndicate involving cheap metal." },
    { plaintext: "THEASHENTRIALBYFIRE", key: "SHADOWS", clue: "A severe test involving flames and soot." },
    { plaintext: "THESECRETPASSAGEUNDERTHEPIER", key: "WHISPERS", clue: "A hidden route beneath the wooden docks." },
    { plaintext: "EVIDENCEBURIEDAMONGSTORMWASHEDSANDS", key: "SECRETS", clue: "Proof hidden where the ocean meets the shore." },
    { plaintext: "APERFUMEOFLILACANDLIES", key: "ENIGMAS", clue: "A scent of flowers masking deceit." },
    { plaintext: "THECLOCKSTRIKESTHEFINALCONFESSION", key: "OBSCURE", clue: "Time is up for the last admission of guilt." }
  ]
};

export default fallbackPuzzles;
