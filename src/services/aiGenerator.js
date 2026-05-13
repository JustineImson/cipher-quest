import { GoogleGenerativeAI } from "@google/generative-ai";
import fallbackPuzzles from "../data/fallbackPuzzles";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomFallback(difficulty) {
  const diff = (difficulty || "easy").toLowerCase();
  let puzzle;
  if (diff === "easy") puzzle = pickRandom(fallbackPuzzles.easy);
  else if (diff === "moderate" || diff === "medium") puzzle = pickRandom(fallbackPuzzles.moderate);
  else puzzle = pickRandom(fallbackPuzzles.hard);
  return { ...puzzle, isFallback: true };
}

export async function generatePuzzleDetails(difficulty, theme) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("VITE_GEMINI_API_KEY is not set. Using fallback puzzle.");
      return getRandomFallback(difficulty);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 1.0, // Maximize creativity
      },
    });

    let difficultyRules = "";
    switch ((difficulty || "easy").toLowerCase()) {
      case "easy":
        difficultyRules = "plaintext is exactly 1 word (5-8 letters) and clue is obvious.\n- Key MUST be a simple string number between '1' and '5'.";
        break;
      case "moderate":
      case "medium":
        difficultyRules = "plaintext is 1-2 words (9-14 letters total) and clue is vague.\n- Key MUST be a string number between '6' and '25' OR a very short, common English word (3 to 4 letters, e.g., 'CAT', 'DOG').";
        break;
      case "hard":
        difficultyRules = "plaintext is 2-3 words (15+ letters total) and clue is highly cryptic.\n- Key MUST be a complex English word of 7 or more letters (e.g., 'MYSTERY', 'PHANTOM').";
        break;
      default:
        difficultyRules = "plaintext is 1 word (5-8 letters) and clue is obvious.\n- Key MUST be a simple string number between '1' and '5'.";
    }

    const subThemes = [
      "murder weapon", "hidden motive", "secret society", "stolen artifact",
      "corrupt official", "midnight rendezvous", "forged document", "poisoned drink",
      "blackmail letter", "underground speakeasy", "abandoned warehouse", "detective tools",
      "betrayal", "cryptic symbols", "clockwork mechanisms", "gaslight alleys"
    ];
    const randomSubTheme = pickRandom(subThemes);

    const prompt = `
Generate a completely unique and highly unpredictable puzzle based on the theme: "${theme || "general"}".
Specifically, draw inspiration from this sub-theme: "${randomSubTheme}".
Do not repeat common words like SLEUTH, DETECTIVE, or MYSTERY. Be extremely creative.
Random generation seed: ${Math.random()}

Rules for difficulty:
${difficultyRules}

Formatting rules:
- All plaintext and keys must be uppercase with no punctuation (except if the key is a number).
- The key MUST always be returned as a string.
- Return STRICT JSON ONLY in the following format:
{ "plaintext": "...", "key": "...", "clue": "..." }
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json\n?|\n?```/g, "").trim();
    const payload = JSON.parse(text);

    const validString = (v, singleWord = false) => {
      if (typeof v === 'number') v = String(v);
      if (typeof v !== 'string') return false;
      if (v.trim().length === 0) return false;
      if (singleWord && /\s/.test(v)) return false;
      return true;
    };

    if (!payload || !validString(payload.plaintext, false) || !validString(payload.key) || !validString(payload.clue)) {
      throw new Error('AI response missing required fields');
    }

    return {
      plaintext: String(payload.plaintext),
      key: String(payload.key),
      clue: String(payload.clue),
      isFallback: false,
    };
  } catch (error) {
    console.warn('AI generation failed, using fallback puzzle:', error);
    const fallback = getRandomFallback(difficulty);
    fallback.clue = `[DEBUG ERROR: ${error.message}] ` + fallback.clue;
    return fallback;
  }
}
