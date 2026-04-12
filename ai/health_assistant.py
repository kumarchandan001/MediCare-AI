# health_assistant.py — ML Model Training Script
# ─────────────────────────────────────────────────────────────────────────────
# PURPOSE: Trains the Random Forest disease-prediction model and saves all
#          .pkl artifacts to ai_models/.
#
# Run standalone to retrain:
#   py ai/health_assistant.py
#
# Flask routes live exclusively in app.py (project root).
# ─────────────────────────────────────────────────────────────────────────────

import os
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# ── Path constants (resolve relative to the project root, one level up) ─────
_AI_DIR       = os.path.dirname(os.path.abspath(__file__))   # ai/
_BASE_DIR     = os.path.dirname(_AI_DIR)                      # project root
DATA_DIR      = os.path.join(_BASE_DIR, 'data')
AI_MODELS_DIR = os.path.join(_BASE_DIR, 'ai_models')
os.makedirs(AI_MODELS_DIR, exist_ok=True)


# ── Load all datasets ────────────────────────────────────────────────────────
def load_datasets():
    """Load CSVs from data/ directory."""
    df = pd.read_csv(os.path.join(DATA_DIR, "Disease_Symptom_Dataset.csv"))

    try:
        disease_desc = pd.read_csv(os.path.join(DATA_DIR, "symptom_Description.csv"))
    except Exception:
        disease_desc = None
        print("Warning: symptom_Description.csv not found")

    try:
        disease_precaution = pd.read_csv(os.path.join(DATA_DIR, "symptom_precaution.csv"))
    except Exception:
        disease_precaution = None
        print("Warning: symptom_precaution.csv not found")

    try:
        symptom_severity = pd.read_csv(os.path.join(DATA_DIR, "Symptom-severity.csv"))
    except Exception:
        symptom_severity = None
        print("Warning: Symptom-severity.csv not found")

    return df, disease_desc, disease_precaution, symptom_severity


# ── Symptom name helpers ─────────────────────────────────────────────────────
def clean_symptom_name(symptom):
    if not isinstance(symptom, str):
        return symptom
    return symptom.strip().lower()


def create_symptom_mappings(symptoms):
    """Return (display→data, data→display) dicts."""
    display_to_data = {}
    data_to_display = {}
    for symptom in symptoms:
        if not isinstance(symptom, str):
            continue
        cleaned = symptom.strip().lower()
        display_name = cleaned.replace('_', ' ')
        data_name    = cleaned.replace(' ', '_')
        display_to_data[display_name] = data_name
        data_to_display[data_name]    = display_name
    return display_to_data, data_to_display


# ── Main training pipeline ───────────────────────────────────────────────────
if __name__ == "__main__":
    print("Loading datasets...")
    df, disease_desc, disease_precaution, symptom_severity = load_datasets()

    # Extract all unique symptoms
    all_symptoms = set()
    for column in df.columns:
        if 'Symptom' in column:
            symptoms = df[column].dropna().unique()
            all_symptoms.update([
                clean_symptom_name(s)
                for s in symptoms
                if isinstance(s, str) and pd.notna(s) and s.strip() != ''
            ])
    all_symptoms = sorted(list(all_symptoms))

    # Save symptom mappings
    display_to_data, data_to_display = create_symptom_mappings(all_symptoms)
    joblib.dump(display_to_data, os.path.join(AI_MODELS_DIR, "display_to_data.pkl"))
    joblib.dump(data_to_display, os.path.join(AI_MODELS_DIR, "data_to_display.pkl"))

    # Build feature matrix
    encoded_df = pd.DataFrame()
    encoded_df['Disease'] = df['Disease']
    for symptom in all_symptoms:
        encoded_df[symptom] = 0

    for index, row in df.iterrows():
        for column in df.columns:
            if 'Symptom' in column and pd.notna(row[column]) and isinstance(row[column], str):
                symptom = clean_symptom_name(row[column])
                if symptom in all_symptoms:
                    encoded_df.loc[index, symptom] = 1

    # Save feature names
    joblib.dump(all_symptoms, os.path.join(AI_MODELS_DIR, "feature_names.pkl"))

    # Add severity weighting if available
    if symptom_severity is not None:
        symptom_severity_map = {}
        for _, row in symptom_severity.iterrows():
            sym = clean_symptom_name(row['Symptom'])
            symptom_severity_map[sym] = row['weight']

        for symptom, severity in symptom_severity_map.items():
            if symptom in encoded_df.columns:
                encoded_df[f"{symptom}_weighted"] = encoded_df[symptom] * severity

        weighted_features = [
            f"{s}_weighted" for s in all_symptoms
            if f"{s}_weighted" in encoded_df.columns
        ]
        joblib.dump(weighted_features,     os.path.join(AI_MODELS_DIR, "weighted_features.pkl"))
        joblib.dump(symptom_severity_map,  os.path.join(AI_MODELS_DIR, "symptom_severity_map.pkl"))
    else:
        weighted_features = []

    # Save disease info dictionaries
    if disease_desc is not None:
        disease_descriptions = dict(zip(disease_desc['Disease'], disease_desc['Description']))
        joblib.dump(disease_descriptions, os.path.join(AI_MODELS_DIR, "disease_descriptions.pkl"))

    if disease_precaution is not None:
        disease_precautions = {}
        for _, row in disease_precaution.iterrows():
            precautions = [row[f'Precaution_{i}'] for i in range(1, 5) if pd.notna(row[f'Precaution_{i}'])]
            disease_precautions[row['Disease']] = precautions
        joblib.dump(disease_precautions, os.path.join(AI_MODELS_DIR, "disease_precautions.pkl"))

    # Encode labels
    label_encoder = LabelEncoder()
    encoded_df["Disease"] = label_encoder.fit_transform(encoded_df["Disease"])
    joblib.dump(label_encoder, os.path.join(AI_MODELS_DIR, "label_encoder.pkl"))

    # Train / evaluate
    X = encoded_df.drop("Disease", axis=1)
    y = encoded_df["Disease"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training Random Forest model...")
    model = RandomForestClassifier(n_estimators=150, max_depth=15, random_state=42)
    model.fit(X_train, y_train)
    joblib.dump(model, os.path.join(AI_MODELS_DIR, "health_assistant_model.pkl"))

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    print("\nAll artifacts saved to ai_models/:")
    for f in sorted(os.listdir(AI_MODELS_DIR)):
        size = os.path.getsize(os.path.join(AI_MODELS_DIR, f))
        print(f"  {f:40s}  {size:>8,} bytes")
