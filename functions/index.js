import { onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

const FALLBACK_WORDS = {
  easy: ["MYSTERY", "CIPHER", "SHADOW", "AGENT", "CLUE", "AGENDA", "CRIME", "PROOF"],
  moderate: ["BLACKMAIL", "CONSPIRE", "FRAUDSTER", "INTRIGUE", "SABOTAGE", "ABDUCTION", "POISONER", "TREACHERY"],
  hard: ["ASSASSINATION", "EXTORTIONIST", "MANIPULATION", "PERJURY", "CONSPIRATOR", "SWINDLER", "TREASONOUS", "MASTERY"],
};

function getFallback(difficulty) {
  const diff = (difficulty || "easy").toLowerCase();
  const pool = FALLBACK_WORDS[diff] || FALLBACK_WORDS.easy;
  const word = pool[Math.floor(Math.random() * pool.length)];
  const keys = ["KEY", "CAT", "MAP", "RUN", "HAT", "SUN", "BOX", "TOP"];
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { plaintext: word, key, clue: "Fallback: examine the letters carefully." };
}

export const generateCipherClue = onCall(
  {
    secrets: [geminiApiKey],
    cors: true,
    maxInstances: 10,
  },
  async (request) => {
    const { difficulty, theme } = request.data || {};

    try {
      if (!difficulty || typeof difficulty !== "string") {
        return getFallback(difficulty);
      }

      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        console.error("GEMINI_API_KEY secret is not set");
        return getFallback(difficulty);
      }

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      let difficultyRules = "";
      switch (difficulty.toLowerCase()) {
        case "easy":
          difficultyRules = "plaintext is exactly 1 word (5-8 letters) and clue is obvious.";
          break;
        case "moderate":
          difficultyRules = "plaintext is 1-2 words (9-14 letters total) and clue is vague.";
          break;
        case "hard":
          difficultyRules = "plaintext is 2-3 words (15+ letters total) and clue is highly cryptic.";
          break;
        default:
          difficultyRules = "plaintext is 1 word (5-8 letters) and clue is obvious.";
      }

      const prompt = `
Generate a puzzle based on the theme: "${theme || "general"}".

Rules for difficulty:
${difficultyRules}

Formatting rules:
- All plaintext and keys must be uppercase with no punctuation.
- Return STRICT JSON ONLY in the following format:
{ "plaintext": "...", "key": "...", "clue": "..." }
`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      if (!parsed.plaintext || !parsed.key || !parsed.clue) {
        return getFallback(difficulty);
      }

      return parsed;
    } catch (error) {
      console.error("Error generating puzzle details:", error);
      return getFallback(difficulty);
    }
  }
);
