import { GoogleGenerativeAI } from "@google/generative-ai";
import fallbackPuzzles from "../data/fallbackPuzzles";

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Flatten the cipher-keyed fallback data into a pool filtered by difficulty */
function getFallbackPool(difficulty) {
  const diff = (difficulty || 'easy').toLowerCase();
  const norm = diff === 'medium' ? 'moderate' : diff;
  const all = Object.values(fallbackPuzzles).flat();
  const pool = all.filter((p) => p.difficulty === norm);
  return pool.length > 0 ? pool : all; // fallback to everything if no matches
}

function getRandomFallback(difficulty) {
  const pool = getFallbackPool(difficulty);
  let puzzle = pickRandom(pool);
  
  if (!puzzle) puzzle = { plaintext: "FALLBACK", key: "1", clue: "System error." };
  
  return { plaintext: puzzle.plaintext, key: puzzle.key, clue: puzzle.clue, isFallback: true };
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
        difficultyRules = "Vocabulary: Use only common, everyday vocabulary from the top 1000 most-used English words. Plaintext should be 5-8 letters.\nClue: Clues must be direct synonyms or obvious definitions. Example: 'Another word for happy.'\n- Key MUST be a simple string number between '1' and '5'.";
        break;
      case "normal":
      case "moderate":
      case "medium":
        difficultyRules = "Vocabulary: Use thematic or domain-specific vocabulary that is less common but recognizable. Plaintext should be 9-14 letters.\nClue: Clues must be contextual and require a minor logic step. Example: 'A device used to record sound in a studio.'\n- Key MUST be a string number between '6' and '25' OR a very short, common English word (3 to 4 letters, e.g., 'CAT', 'DOG').";
        break;
      case "hard":
        difficultyRules = "Vocabulary: Use obscure terminology, archaic words, or complex compound nouns unfamiliar to most players. Plaintext should be 15+ letters.\nClue: Clues must be cryptic riddles, abstract metaphors, or indirect associations with no direct hint. Example: 'What remains when truth wears a mask.'\n- Key MUST be a complex English word of 7 or more letters (e.g., 'MYSTERY', 'PHANTOM').";
        break;
      default:
        difficultyRules = "Vocabulary: Use only common, everyday vocabulary from the top 1000 most-used English words.\nClue: Clues must be direct synonyms or obvious definitions.\n- Key MUST be a simple string number between '1' and '5'.";
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

AI Noise Guardrail: You may inject misleading phrasing or decoy context ONLY inside the clue text. The plaintext and key fields in the returned JSON must never contain injected noise, punctuation, or extra spaces. Any alteration to these fields will break the game and is strictly forbidden.

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
