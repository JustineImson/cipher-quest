import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import fallbackPuzzles from "../data/fallbackPuzzles";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomFallback(difficulty) {
  const diff = (difficulty || "easy").toLowerCase();
  if (diff === "easy") return pickRandom(fallbackPuzzles.easy);
  if (diff === "moderate" || diff === "medium") return pickRandom(fallbackPuzzles.moderate);
  return pickRandom(fallbackPuzzles.hard);
}

export async function generatePuzzleDetails(difficulty, theme) {
  let generateCipherClue;
  try {
    generateCipherClue = httpsCallable(functions, "generateCipherClue");
  } catch (setupError) {
    console.error("Firebase Functions not available:", setupError);
    console.warn('AI generation failed, using fallback puzzle');
    return getRandomFallback(difficulty);
  }

  try {
    const result = await generateCipherClue({ difficulty, theme: theme || "general" });

    let payload = result && result.data ? result.data : null;

    // If the cloud function returned a JSON string, try to parse it safely
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (parseErr) {
        throw new Error('Failed to parse AI response JSON');
      }
    }

    // Validate the expected fields are present and non-empty strings
    // plaintext must be a single word (no spaces)
    const validString = (v, singleWord = false) => {
      if (typeof v !== 'string') return false;
      if (v.trim().length === 0) return false;
      if (singleWord && /\s/.test(v)) return false;
      return true;
    };
    if (!payload || !validString(payload.plaintext, true) || !validString(payload.key) || !validString(payload.clue)) {
      throw new Error('AI response missing required fields');
    }

    return {
      plaintext: payload.plaintext,
      key: payload.key,
      clue: payload.clue,
    };
  } catch (error) {
    console.warn('AI generation failed, using fallback puzzle', error);
    return getRandomFallback(difficulty);
  }
}
