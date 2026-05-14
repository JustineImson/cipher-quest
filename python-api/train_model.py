"""
train_model.py
--------------
Loads player_data.csv, trains a RandomForestClassifier,
prints the test-set accuracy, and saves the model to model/skill_classifier.pkl.
"""

import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib


def main():
    # ── 1. Load data ──────────────────────────────────────────────────────
    data_path = os.path.join(os.path.dirname(__file__), "data", "player_data.csv")
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} rows from {data_path}")

    # ── 2. Separate features / label ──────────────────────────────────────
    X = df.drop(columns=["skill_tier"])
    y = df["skill_tier"]

    # ── 3. Train / test split (80/20) ─────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"Training samples: {len(X_train)}  |  Test samples: {len(X_test)}")

    # ── 4. Train RandomForestClassifier ───────────────────────────────────
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)

    # ── 5. Evaluate ──────────────────────────────────────────────────────
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Test-set accuracy: {accuracy:.4f}")

    # ── 6. Save model ────────────────────────────────────────────────────
    model_dir = os.path.join(os.path.dirname(__file__), "model")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "skill_classifier.pkl")
    joblib.dump(clf, model_path)
    print(f"Model saved to {model_path}")


if __name__ == "__main__":
    main()
