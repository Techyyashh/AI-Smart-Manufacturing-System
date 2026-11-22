import os

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")
MODEL_PATH = os.path.join(BASE_DIR, "machine_failure_model.pkl")

FEATURES = ["temperature", "vibration", "efficiency"]

data = pd.read_csv(DATASET_PATH)

X = data[FEATURES]
y = data["failure"]

model = RandomForestClassifier(n_estimators=100, random_state=42)

# The dataset is small, so use cross-validation to estimate accuracy
# and then train the final model on ALL rows.
folds = min(5, int(y.value_counts().min()))
if folds >= 2:
    scores = cross_val_score(model, X, y, cv=folds)
    print(f"Cross-validation accuracy ({folds}-fold): {scores.mean():.2f}")

model.fit(X, y)

joblib.dump(model, MODEL_PATH)

print(f"Model trained on {len(data)} rows and saved to {MODEL_PATH}")
