import os

import joblib
import pandas as pd
from flask import Flask, jsonify, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "machine_failure_model.pkl")

FEATURES = ["temperature", "vibration", "efficiency"]

model = joblib.load(MODEL_PATH)

app = Flask(__name__)


def to_frame(rows):
    """Validate a list of readings and turn it into a DataFrame for the model."""
    clean = []
    for row in rows:
        try:
            clean.append({f: float(row[f]) for f in FEATURES})
        except (KeyError, TypeError, ValueError):
            raise ValueError(f"Each reading needs numeric values for {FEATURES}")
    return pd.DataFrame(clean, columns=FEATURES)


def predict_rows(rows):
    frame = to_frame(rows)
    labels = model.predict(frame)
    probs = model.predict_proba(frame)
    failure_col = list(model.classes_).index(1) if 1 in model.classes_ else None
    return [
        {
            "failure": int(label),
            "probability": float(prob[failure_col]) if failure_col is not None else 0.0,
        }
        for label, prob in zip(labels, probs)
    ]


@app.route("/")
def home():
    return "AI Smart Manufacturing API Running"


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    try:
        return jsonify(predict_rows([data])[0])
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.route("/predict_batch", methods=["POST"])
def predict_batch():
    data = request.get_json(silent=True) or {}
    readings = data.get("readings")
    if not isinstance(readings, list) or not readings:
        return jsonify({"error": "readings must be a non-empty list"}), 400
    try:
        return jsonify({"predictions": predict_rows(readings)})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.route("/model-info")
def model_info():
    importances = getattr(model, "feature_importances_", None)
    return jsonify({
        "model": type(model).__name__,
        "features": [
            {"name": name, "importance": float(value)}
            for name, value in zip(FEATURES, importances if importances is not None else [0] * len(FEATURES))
        ],
    })


if __name__ == "__main__":
    print("AI Server Starting on http://localhost:8000 ...")
    app.run(
        host="127.0.0.1",
        port=8000,
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
