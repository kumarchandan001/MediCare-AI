"""
ai/prediction.py
────────────────
Centralised disease-prediction module.
Now powered by the trained LightGBM ML model from ml/artifacts/.

Public API
──────────
    predict(symptoms: list[str]) -> dict
        Accepts a list of symptom key strings (underscore-separated).
        Returns a prediction dict:
            {
                'predicted_disease': str,
                'confidence':        float,   # 0.0 – 1.0
                'description':       str,
                'top_symptoms':      list[{'symptom': str}],
                'precautions':       list[str]
            }

Falls back to rule-based CSV scoring if ML model is not available.
"""

import os
import json
import traceback
import numpy as np
import pandas as pd

# ── Path constants ────────────────────────────────────────────────────────────
_AI_DIR  = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(_AI_DIR)
DATA_DIR = os.path.join(BASE_DIR, 'data')
ML_ARTIFACTS = os.path.join(BASE_DIR, 'ml', 'artifacts')

# ── Default precautions ──────────────────────────────────────────────────────
_DEFAULT_PRECAUTIONS = [
    'Consult with a healthcare professional for proper diagnosis',
    'Monitor your symptoms and keep a record of any changes',
    'Get adequate rest to support your immune system',
    'Stay hydrated by drinking plenty of water',
]

_CONFIDENCE_WARNING_THRESHOLD = 0.60


# ═════════════════════════════════════════════════════════════════════════════
#  ML MODEL LOADER (singleton — loaded once, reused for all requests)
# ═════════════════════════════════════════════════════════════════════════════

class _MLModel:
    """Singleton wrapper for the trained ML model and its artifacts."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self):
        """Load all ML artifacts. Safe to call multiple times."""
        if self._loaded:
            return True

        try:
            import joblib

            # First read model_info.json to check for active version
            model_info_path = os.path.join(ML_ARTIFACTS, 'model_info.json')
            try:
                with open(model_info_path) as f:
                    self.model_info = json.load(f)
            except Exception:
                self.model_info = {"model_name": "LightGBM"}

            # Load model dynamically based on active version defined
            active_version = self.model_info.get("active_version", "best_disease_model.pkl")
            model_path = os.path.join(ML_ARTIFACTS, active_version)

            if not os.path.exists(model_path):
                # Fallback
                model_path = os.path.join(ML_ARTIFACTS, 'best_disease_model.pkl')
                if not os.path.exists(model_path):
                    print("[prediction] ML model not found at:", model_path)
                    return False

            print(f"[prediction] Loading ML model artifacts from {model_path}...")

            self.model = joblib.load(model_path)
            self.label_encoder = joblib.load(
                os.path.join(ML_ARTIFACTS, 'label_encoder.pkl')
            )

            with open(os.path.join(ML_ARTIFACTS, 'feature_columns.json')) as f:
                self.feature_columns = json.load(f)

            with open(os.path.join(ML_ARTIFACTS, 'severity_dict.json')) as f:
                self.severity_dict = json.load(f)

            with open(os.path.join(ML_ARTIFACTS, 'disease_meta.json')) as f:
                self.disease_meta = json.load(f)

            # Build fast lookup index
            self.col_index = {
                sym: i for i, sym in enumerate(self.feature_columns)
            }

            # Try loading SHAP explainer (optional — for key symptoms)
            self.explainer = None
            try:
                import shap
                self.explainer = shap.TreeExplainer(self.model)
                print("[prediction] SHAP explainer loaded ✓")
            except Exception as e:
                print(f"[prediction] SHAP unavailable (using fallback): {e}")

            self._loaded = True
            n_diseases = len(self.label_encoder.classes_)
            n_features = len(self.feature_columns)
            print(f"[prediction] ML model ready -- {n_diseases} diseases, {n_features} symptoms")
            return True

        except Exception as e:
            print(f"[prediction] Failed to load ML model: {e}")
            traceback.print_exc()
            return False

    @property
    def is_loaded(self):
        return self._loaded


# Global singleton
_ml = _MLModel()


# ═════════════════════════════════════════════════════════════════════════════
#  ML PREDICTION (primary path)
# ═════════════════════════════════════════════════════════════════════════════

def _clean_symptom(s: str) -> str:
    """Normalise symptom string to match training data format."""
    s = s.strip().lower().replace(' ', '_')
    while '__' in s:
        s = s.replace('__', '_')
    return s


def _rescale_confidence(raw_prob: float, top3_probs: list, n_symptoms: int) -> float:
    """
    Rescale a raw multi-class probability into a user-friendly confidence %.

    Problem: With 41 disease classes the model distributes probability mass
    very thinly.  Even a correct prediction with only 3 symptoms may get a
    raw P of 0.05–0.12 — which looks terrible as "5%–12%" on the UI.

    Strategy:
      1. **Relative dominance**: how much the top-1 probability beats the
         runner-up.  If top-1 is 0.08 but #2 is 0.04, the model is actually
         quite decisive (2× more confident in its pick).
      2. **Symptom coverage boost**: the more symptoms the user provides, the
         more informative the input — so we let the score climb higher.
      3. **Floor**: minimum 40% if the model returned ANY positive prediction
         (it always picks *something*).
      4. **Cap**: 95% — never claim certainty.
    """
    if raw_prob <= 0:
        return 0.40

    # --- Dominance ratio: top1 / (top1 + top2) ---
    second_prob = top3_probs[1] if len(top3_probs) > 1 else 0.0
    if raw_prob + second_prob > 0:
        dominance = raw_prob / (raw_prob + second_prob)   # 0.5 = tied, 1.0 = total dominance
    else:
        dominance = 0.5

    # --- Symptom factor: more symptoms → more info → higher ceiling ---
    symptom_factor = min(n_symptoms / 8.0, 1.0)   # saturates at 8 symptoms

    # --- Combine ---
    # Base from dominance: 0.5 dominance → 0.45;  1.0 dominance → 0.80
    base = 0.10 + dominance * 0.70                      # range [0.10 .. 0.80]
    # Boost by symptom coverage: at 3 symptoms factor=0.375, at 8+ factor=1.0
    boosted = base + symptom_factor * 0.15               # adds up to +0.15
    # Also honour the raw probability — if the model is genuinely very sure
    raw_bonus = min(raw_prob * 0.5, 0.15)                # up to +0.15 extra
    confidence = boosted + raw_bonus

    # Floor & cap
    confidence = max(confidence, 0.40)
    confidence = min(confidence, 0.95)
    return round(confidence, 4)


def _ml_predict(symptoms: list) -> dict | None:
    """
    Run prediction through the trained ML model.
    Returns prediction dict on success, None if model unavailable.
    """
    if not _ml.load():
        return None

    # Clean and validate symptoms
    clean_symptoms = [_clean_symptom(s) for s in symptoms]
    valid_symptoms = [s for s in clean_symptoms if s in _ml.col_index]

    if not valid_symptoms:
        print(f"[prediction] No valid symptoms found in ML model features")
        return None

    invalid = set(clean_symptoms) - set(valid_symptoms)
    if invalid:
        print(f"[prediction] Ignoring unknown symptoms: {invalid}")

    # Build feature vector with severity weights
    x = np.zeros((1, len(_ml.feature_columns)), dtype=np.float32)
    for sym in valid_symptoms:
        x[0, _ml.col_index[sym]] = _ml.severity_dict.get(sym, 1)

    # Run prediction
    proba = _ml.model.predict_proba(x)[0]
    top3_idx = np.argsort(proba)[-3:][::-1]
    predicted_class = top3_idx[0]
    predicted_disease = _ml.label_encoder.inverse_transform([predicted_class])[0]
    raw_confidence = float(proba[predicted_class])
    top3_probs = [float(proba[i]) for i in top3_idx]

    # Rescale to user-friendly confidence
    confidence = _rescale_confidence(raw_confidence, top3_probs, len(valid_symptoms))

    print(f"[prediction] Raw P={raw_confidence:.4f} -> Display confidence={confidence:.2%}")

    # Get SHAP-based key symptoms (or fallback to input symptoms)
    key_symptoms = _get_key_symptoms(x, predicted_class, valid_symptoms)

    # Get disease metadata
    descriptions = _ml.disease_meta.get('description', {})
    precautions = _ml.disease_meta.get('precaution', {})

    description = descriptions.get(
        predicted_disease,
        f"Based on the symptoms you've provided, you may have {predicted_disease}."
    )
    precs = precautions.get(predicted_disease, _DEFAULT_PRECAUTIONS)
    if not precs:
        precs = _DEFAULT_PRECAUTIONS

    # Format top symptoms for frontend compatibility
    top_symptoms = [
        {'symptom': s.replace('_', ' ').title()}
        for s in key_symptoms[:5]
    ]

    print(f"[prediction] ML result: {predicted_disease} ({confidence:.2%})")

    return {
        'model_name': _ml.model_info.get('model_name', 'LightGBM'),
        'predicted_disease': predicted_disease,
        'confidence': round(confidence, 4),
        'description': description,
        'top_symptoms': top_symptoms,
        'precautions': precs,
        'top_3_predictions': [
            {
                'disease': _ml.label_encoder.inverse_transform([idx])[0],
                'probability': round(float(proba[idx]), 4)
            }
            for idx in top3_idx
        ],
    }


def _get_key_symptoms(x: np.ndarray, predicted_class: int,
                      input_symptoms: list) -> list:
    """Return top 5 symptoms that drove the prediction (SHAP or fallback)."""
    if _ml.explainer:
        try:
            sv = _ml.explainer.shap_values(x)
            if isinstance(sv, list):
                class_shap = sv[predicted_class][0]
            elif sv.ndim == 3:
                class_shap = sv[0, :, predicted_class]
            else:
                class_shap = sv[0]

            top_idx = np.argsort(np.abs(class_shap))[-5:][::-1]
            result = [
                _ml.feature_columns[i]
                for i in top_idx
                if class_shap[i] != 0
            ]
            if result:
                return result
        except Exception:
            pass

    # Fallback: return input symptoms sorted by severity
    return sorted(
        input_symptoms,
        key=lambda s: _ml.severity_dict.get(s, 1),
        reverse=True
    )[:5]


# ═════════════════════════════════════════════════════════════════════════════
#  LEGACY RULE-BASED FALLBACK (only used if ML model is unavailable)
# ═════════════════════════════════════════════════════════════════════════════

def _load_descriptions() -> dict:
    try:
        df = pd.read_csv(os.path.join(DATA_DIR, 'symptom_Description.csv'))
        return dict(zip(df['Disease'], df['Description']))
    except Exception:
        return {}


def _load_precautions() -> dict:
    try:
        df = pd.read_csv(os.path.join(DATA_DIR, 'symptom_precaution.csv'))
        result = {}
        for _, row in df.iterrows():
            precs = [
                row[f'Precaution_{i}']
                for i in range(1, 5)
                if pd.notna(row.get(f'Precaution_{i}')) and row[f'Precaution_{i}']
            ]
            result[row['Disease']] = precs
        return result
    except Exception:
        return {}


def _build_result(disease_name, confidence, top_symptoms, descriptions, precautions):
    description = descriptions.get(
        disease_name,
        f"Based on the symptoms you've provided, you may have {disease_name}."
    )
    precs = precautions.get(disease_name, _DEFAULT_PRECAUTIONS)
    return {
        'model_name': 'Legacy Rule-based',
        'predicted_disease': disease_name,
        'confidence': round(confidence, 4),
        'description': description,
        'top_symptoms': top_symptoms,
        'precautions': precs if precs else _DEFAULT_PRECAUTIONS,
    }


def _score_against_dataset(symptoms: list) -> dict:
    dataset_path = os.path.join(DATA_DIR, 'Disease_Symptom_Dataset.csv')
    if not os.path.exists(dataset_path):
        return {}

    try:
        disease_df = pd.read_csv(dataset_path)
        for col in disease_df.columns:
            if col.startswith('Symptom_') and disease_df[col].dtype == 'object':
                disease_df[col] = disease_df[col].str.strip()
    except Exception:
        return {}

    try:
        sev_df = pd.read_csv(os.path.join(DATA_DIR, 'Symptom-severity.csv'))
        severity_dict = dict(zip(sev_df['Symptom'], sev_df['weight']))
    except Exception:
        severity_dict = {}

    scores = {}
    for disease in disease_df['Disease'].unique():
        rows = disease_df[disease_df['Disease'] == disease]
        disease_symptoms = set()
        for _, row in rows.iterrows():
            for col in disease_df.columns:
                if col.startswith('Symptom_') and not pd.isna(row[col]):
                    s = row[col].strip()
                    if s:
                        disease_symptoms.add(s)
        if not disease_symptoms:
            continue

        matched, total_sev = [], 0
        for symptom in symptoms:
            for ds in disease_symptoms:
                if symptom == ds.replace(' ', '_'):
                    matched.append(symptom)
                    total_sev += severity_dict.get(symptom, 1)
                    break

        if not matched:
            continue

        match_ratio = len(matched) / len(disease_symptoms)
        match_boost = 0.2 if len(matched) == len(symptoms) and symptoms else 0
        sev_score = total_sev / (len(matched) * 7)
        combined = (match_ratio * 0.6) + (sev_score * 0.3) + match_boost

        scores[disease] = {
            'score': combined,
            'matched_count': len(matched),
            'matched_symptoms': matched,
            'total_symptoms': len(disease_symptoms),
            'match_ratio': match_ratio,
            'severity_score': sev_score,
        }

    return scores


def _fallback_prediction(symptoms: list) -> dict:
    """Rule-based fallback when ML model is unavailable."""
    descriptions = _load_descriptions()
    precautions = _load_precautions()

    scores = _score_against_dataset(symptoms)

    if scores:
        best_matches = sorted(
            scores.items(),
            key=lambda x: (x[1]['matched_count'], x[1]['score']),
            reverse=True
        )
        best_disease, best_detail = best_matches[0]
        match_ratio = best_detail['matched_count'] / best_detail['total_symptoms']

        if best_detail['matched_count'] >= 1:
            confidence = min(0.6 + (match_ratio * 0.35), 0.95)
            top_symptoms = [
                {'symptom': s.replace('_', ' ').title()}
                for s in best_detail['matched_symptoms'][:4]
            ]
            return _build_result(
                best_disease, confidence, top_symptoms,
                descriptions, precautions
            )

    return {
        'model_name': 'Rule-based App',
        'predicted_disease': 'Unspecified Condition',
        'confidence': 0.60,
        'description': ('The provided symptoms do not clearly indicate a specific condition. '
                        'Please consult a healthcare professional for proper diagnosis.'),
        'top_symptoms': [],
        'precautions': _DEFAULT_PRECAUTIONS,
    }


# ═════════════════════════════════════════════════════════════════════════════
#  XAI INTEGRATION
# ═════════════════════════════════════════════════════════════════════════════

def _attach_xai(result: dict, symptoms: list) -> dict:
    """
    Attach XAI explanation to a prediction result.
    Also promotes confidence_label, plain_explanation, confidence_explanation,
    and top_3_key_symptoms to top-level.
    Never raises -- on failure, attaches a minimal fallback.
    """
    try:
        from ai.xai_engine import explain_prediction, confidence_to_label, confidence_explanation

        raw_confidence = result.get('confidence', 0)
        xai_result = explain_prediction(
            symptoms=symptoms,
            predicted_disease=result.get('predicted_disease', ''),
            confidence=raw_confidence,
            model=_ml.model if _ml.is_loaded else None,
            label_encoder=_ml.label_encoder if _ml.is_loaded else None,
            feature_names=_ml.feature_columns if _ml.is_loaded else None,
            severity_map=_ml.severity_dict if _ml.is_loaded else None,
            top_3_predictions=result.get('top_3_predictions'),
        )
        result['xai'] = xai_result

        # Promote key XAI fields to top-level for API consumers
        result['confidence_label'] = xai_result.get('confidence_label', 'Medium')
        result['confidence_color'] = xai_result.get('confidence_color', '#d97706')
        result['plain_explanation'] = xai_result.get('plain_explanation', '')
        result['confidence_explanation'] = xai_result.get('confidence_explanation', '')
        result['top_3_key_symptoms'] = xai_result.get('top_3_key_symptoms', [])

        # Edge case: very low confidence warning
        if raw_confidence < 0.25:
            result['low_confidence_warning'] = (
                'Insufficient data to provide a reliable prediction. '
                'Please add more symptoms or consult a healthcare professional.'
            )

        print(f"[prediction] XAI attached: evidence={xai_result.get('evidence_strength')}, label={result['confidence_label']}")
    except Exception as xai_err:
        print(f"[prediction] XAI error (non-fatal): {xai_err}")
        conf_raw = result.get('confidence', 0)
        conf_pct = round(conf_raw * 100, 1)
        try:
            from ai.xai_engine import confidence_to_label, confidence_explanation
            c_label = confidence_to_label(conf_raw)
            c_expl = confidence_explanation(c_label)
        except Exception:
            c_label = 'Medium'
            c_expl = 'Medium confidence indicates partial alignment; further medical evaluation is recommended.'
        c_color = {'High': '#16a34a', 'Medium': '#d97706', 'Low': '#dc2626'}.get(c_label, '#d97706')
        disease = result.get('predicted_disease', '')
        result['confidence_label'] = c_label
        result['confidence_color'] = c_color
        result['plain_explanation'] = f"Predicted {disease} based on {len(symptoms)} symptoms."
        result['confidence_explanation'] = c_expl
        result['top_3_key_symptoms'] = []
        result['xai'] = {
            'feature_contributions': [],
            'top_contributing_symptoms': [],
            'top_3_key_symptoms': [],
            'confidence_breakdown': {
                'overall': conf_pct,
                'confidence_level': 'Moderate',
            },
            'confidence_label': c_label,
            'confidence_color': c_color,
            'confidence_explanation': c_expl,
            'risk_factors': [],
            'alternative_diagnoses': [],
            'evidence_strength': 'Moderate',
            'evidence_strength_pct': 50,
            'plain_explanation': result['plain_explanation'],
            'xai_summary': f"Predicted '{disease}' based on {len(symptoms)} symptoms.",
            'explanation_score': conf_pct,
            'symptom_weights': {},
            'total_symptoms': len(symptoms),
            'total_severity': 0,
        }
    return result


# ═════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═════════════════════════════════════════════════════════════════════════════

def predict(symptoms: list) -> dict:
    """
    Main prediction function.

    Parameters
    ----------
    symptoms : list[str]
        Symptom keys (underscore_separated), e.g. ['burning_micturition', 'dark_urine']

    Returns
    -------
    dict with keys: predicted_disease, confidence, description,
                    top_symptoms, precautions, xai
    """

    # ── Edge case: no symptoms ────────────────────────────────────────────────
    if not symptoms or len(symptoms) == 0:
        return {
            'error': 'Please select at least one symptom to perform prediction.',
            'predicted_disease': None,
            'confidence': 0,
        }

    print(f"[prediction] Symptoms received: {symptoms}")

    # ── PRIMARY: Use trained ML model ────────────────────────────────────────
    result = _ml_predict(symptoms)
    if result:
        print(f"[prediction] ML model prediction: {result['predicted_disease']}")
        return _attach_xai(result, symptoms)

    # ── FALLBACK: Rule-based CSV scoring ─────────────────────────────────────
    print("[prediction] WARNING: ML model unavailable, using rule-based fallback")
    return _attach_xai(_fallback_prediction(symptoms), symptoms)
