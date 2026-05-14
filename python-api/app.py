"""
app.py
------
Stateless Flask API that serves skill-tier predictions from a trained
RandomForestClassifier.  Two endpoints:

  GET  /health   → {"status": "ok"}
  POST /predict  → {"skill_tier", "confidence", "recommended_difficulty", "weakest_cipher"}
"""

import os
import numpy as np
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Flask setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)  # enable CORS for all origins

# ── Load model once at startup ────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "skill_classifier.pkl")
model = joblib.load(MODEL_PATH)

# Feature order must match training columns (all columns except skill_tier)
FEATURE_ORDER = [
    "puzzles_solved",
    "best_ta_score",
    "win_rate",
    "difficulty_encoded",
    "story_completed",
    "vigenere_accuracy",
    "railfence_accuracy",
    "columnar_accuracy",
    "substitution_accuracy",
]

# Mapping from predicted tier → recommended difficulty
DIFFICULTY_MAP = {
    "advanced": "Hard",
    "intermediate": "Normal",
    "beginner": "Easy",
}

# Cipher accuracy fields for weakest-cipher detection
CIPHER_FIELDS = {
    "vigenere_accuracy": "vigenere",
    "railfence_accuracy": "railfence",
    "columnar_accuracy": "columnar",
    "substitution_accuracy": "substitution",
    "caesar_accuracy": "caesar",
}


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    """Simple health-check used by Render to confirm the service is alive."""
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    """
    Accepts a JSON body with 9 numeric fields and returns:
      - skill_tier          (str)   predicted tier label
      - confidence          (float) max class probability
      - recommended_difficulty (str)
      - weakest_cipher      (str)   cipher with the lowest accuracy
    """
    data = request.get_json(force=True)

    # Caesar wasn't in the training data — read it as optional for weakest-cipher only
    data.setdefault("caesar_accuracy", 0.0)

    # Build feature array in training order
    features = np.array([[data[f] for f in FEATURE_ORDER]])

    # Predict tier & confidence
    tier = model.predict(features)[0]
    probas = model.predict_proba(features)[0]
    confidence = round(float(np.max(probas)), 2)

    # Derive recommended difficulty
    recommended_difficulty = DIFFICULTY_MAP.get(tier, "Normal")

    # Derive weakest cipher (min accuracy among the four cipher fields)
    weakest_cipher = min(CIPHER_FIELDS, key=lambda f: data[f])
    weakest_cipher = CIPHER_FIELDS[weakest_cipher]

    return jsonify(
        {
            "skill_tier": tier,
            "confidence": confidence,
            "recommended_difficulty": recommended_difficulty,
            "weakest_cipher": weakest_cipher,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
