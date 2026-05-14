/**
 * mlService.js
 * ------------
 * Client for the Flask ML API.  Sends player stats and returns
 * skill-tier insights.  Never throws — returns null on failure.
 */

const ML_BASE_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5000';

/**
 * POST player stats to the Flask /predict endpoint.
 *
 * @param {Object} playerStats – must contain:
 *   puzzles_solved, best_ta_score, win_rate, difficulty_encoded,
 *   story_completed, vigenere_accuracy, railfence_accuracy,
 *   columnar_accuracy, substitution_accuracy, caesar_accuracy
 *
 * @returns {Promise<{skill_tier:string, confidence:number,
 *           recommended_difficulty:string, weakest_cipher:string}|null>}
 */
export async function getPlayerInsights(playerStats) {
  try {
    const res = await fetch(`${ML_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerStats),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch {
    // Network error, CORS issue, etc. — fail silently
    return null;
  }
}
