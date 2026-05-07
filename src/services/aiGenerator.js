import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

// Offline fallback word banks used when the Cloud Function is unreachable
const FALLBACK_WORDS = {
  easy: [
    "MYSTERY", "CIPHER", "SHADOW", "AGENT", "CLUE", "AGENDA", "CRIME", "PROOF",
    "ALIBI", "FALSE", "TRUTH", "VAULT", "GRACE", "BLOOD", "SCENE", "TRAIT",
  ],
  moderate: [
    "BLACKMAIL", "CONSPIRE", "FRAUDSTER", "INTRIGUE", "SABOTAGE", "ABDUCTION",
    "POISONER", "TREACHERY", "VILLAINY", "CRIMINAL", "BETRAYAL", "EVIDENCE",
    "SHERLOCK", "FORENSIC", "HOMICIDE", "DEDUCTION",
  ],
  hard: [
    "ASSASSINATION", "EXTORTIONIST", "MANIPULATION", "PERJURY",
    "CONSPIRATOR", "SWINDLER", "TREASONOUS", "MASTERY",
    "INTIMIDATION", "INCINERATION", "EXTRACTION", "SUBVERSION",
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLocalPuzzle(difficulty) {
  const diff = (difficulty || "easy").toLowerCase();
  const pool =
    diff === "easy"
      ? FALLBACK_WORDS.easy
      : diff === "moderate" || diff === "medium"
        ? FALLBACK_WORDS.moderate
        : FALLBACK_WORDS.hard;

  const word = pickRandom(pool);
  const keys = ["KEY", "CAT", "MAP", "RUN", "HAT", "SUN", "BOX", "TOP"];
  return {
    plaintext: word,
    key: pickRandom(keys),
    clue: `Fallback clue: look closely at the letters.`,
  };
}

export async function generatePuzzleDetails(difficulty, theme) {
  let generateCipherClue;
  try {
    generateCipherClue = httpsCallable(functions, "generateCipherClue");
  } catch (setupError) {
    console.error("Firebase Functions not available:", setupError);
    return generateLocalPuzzle(difficulty);
  }

  try {
    const result = await generateCipherClue({ difficulty, theme: theme || "general" });
    return result.data;
  } catch (error) {
    console.error("Cloud Function unavailable, using local fallback:", error);
    return generateLocalPuzzle(difficulty);
  }
}
