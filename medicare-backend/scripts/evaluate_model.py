"""
scripts/evaluate_model.py
─────────────────────────────────────
Evaluates saved models and prints a
detailed accuracy report.

Run AFTER train_model.py:
  cd medicare-backend
  python scripts/evaluate_model.py
"""

import os
import json
import pickle
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
  accuracy_score,
  classification_report,
)

warnings.filterwarnings("ignore")

BASE   = Path(__file__).parent.parent
DATA   = BASE / "data"
MODELS = BASE / "ai" / "models"

def load_pkl(name):
  with open(MODELS / name, "rb") as f:
    return pickle.load(f)

def main():
  print("\n" + "="*55)
  print("  MediCare AI — Model Evaluation")
  print("="*55 + "\n")

  # Load artifacts
  model    = load_pkl("health_assistant_model.pkl")
  le       = load_pkl("label_encoder.pkl")
  features = load_pkl("feature_names.pkl")
  importances = load_pkl("feature_importances.pkl")

  # Load test data
  test_csv = DATA / "Testing.csv"
  if not test_csv.exists():
    print(f"Testing.csv not found at {test_csv}")
    return

  test = pd.read_csv(test_csv)
  # Clean column names
  test.columns = [
    c.strip().lower().replace(" ", "_")
    for c in test.columns
  ]
  # Find target
  target = next(
    (c for c in test.columns
     if "disease" in c or "prognosis" in c),
    None
  )
  if not target:
    print("Cannot find target column")
    return

  test.rename(
    columns={target: "prognosis"}, inplace=True
  )

  # Align features and handle format B
  symptom_cols = [c for c in test.columns if c != "prognosis"]
  first_vals = test[symptom_cols[0]].dropna()
  is_format_b = not set(first_vals.astype(str).str.strip().unique()).issubset({"0","1", "0.0", "1.0"})

  if is_format_b:
    rows = []
    for _, row in test.iterrows():
      binary = {f: 0 for f in features}
      for col in symptom_cols:
        val = str(row[col]).strip().lower().replace(" ", "_")
        if val in binary:
          binary[val] = 1
      binary["prognosis"] = row["prognosis"]
      rows.append(binary)
    test = pd.DataFrame(rows)
  else:
    for f in features:
      if f not in test.columns:
        test[f] = 0

  # Also strip prognosis column
  test["prognosis"] = test["prognosis"].astype(str).str.strip()

  X_test = test[features].fillna(0).values.astype(float)
  y_test = le.transform(
    test["prognosis"].map(
      lambda x: x if x in le.classes_
      else le.classes_[0]
    )
  )

  # Predict
  y_pred = model.predict(X_test)
  acc = accuracy_score(y_test, y_pred)

  print(f"  Test accuracy: {acc*100:.1f}%\n")

  # Per-class report
  report = classification_report(
    y_test, y_pred,
    target_names=le.classes_,
    zero_division=0
  )
  print("  Per-class Report:")
  print(report)

  # Top 20 feature importances
  print("  Top 20 Symptoms by Importance:")
  for i, (sym, imp) in enumerate(
    list(importances.items())[:20], 1
  ):
    bar = "#" * int(imp * 200)
    print(f"  {i:2d}. {sym:<35} {imp:.4f} {bar}")

  # Load model_info.json
  meta_path = BASE / "ai" / "model_info.json"
  if meta_path.exists():
    with open(meta_path) as f:
      meta = json.load(f)
    print(f"\n  Trained at: {meta['trained_at']}")
    print(f"  Algorithm:  {meta['algorithm']}")
    print(
      f"  Disease list ({meta['n_diseases']}):"
    )
    for d in meta["disease_list"]:
      print(f"    - {d}")

  print("\n" + "="*55 + "\n")


if __name__ == "__main__":
  main()
