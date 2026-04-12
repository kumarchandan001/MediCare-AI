"""
ai/xai_engine.py
─────────────────
ML Model Explainability Engine for MediCare AI  (v2.0 — Enhanced)

Public API:
    explain_prediction(
        symptoms: list[str],
        predicted_disease: str,
        confidence: float,
        model,
        label_encoder,
        feature_names: list[str],
        severity_map: dict
    ) -> dict

Returns complete XAI explanation:
{
  "feature_contributions": [...],         # normalised 0-100%
  "top_contributing_symptoms": [...],
  "confidence_breakdown": {...},
  "confidence_label": str,                # "High" / "Medium" / "Low"
  "risk_factors": [...],
  "alternative_diagnoses": [...],         # with rejection reasoning
  "evidence_strength": str,
  "evidence_strength_pct": float,
  "xai_summary": str,                    # natural-language summary
  "plain_explanation": str,              # simple one-liner
  "explanation_score": float,
  "symptom_weights": {...}
}
"""

import os
import json
import time
import hashlib
import numpy as np
from functools import lru_cache

# ── Path constants ─────────────────────────────
_AI_DIR      = os.path.dirname(os.path.abspath(__file__))
BASE_DIR     = os.path.dirname(_AI_DIR)
DATA_DIR     = os.path.join(BASE_DIR, 'data')
ML_ARTIFACTS = os.path.join(BASE_DIR, 'ml', 'artifacts')

# ── XAI Result Cache with TTL (avoids re-computation for identical inputs) ──
_xai_cache: dict = {}           # key -> {"data": dict, "ts": float}
_MAX_CACHE_SIZE = 128
_CACHE_TTL_SECONDS = 20 * 60    # 20 minutes


# ═══════════════════════════════════════════════════════════════════
# LOADER HELPERS  (cached at module level)
# ═══════════════════════════════════════════════════════════════════

@lru_cache(maxsize=1)
def _load_severity_dict() -> dict:
    """Load symptom severity weights from ML artifacts (cached)."""
    try:
        sev_path = os.path.join(ML_ARTIFACTS, 'severity_dict.json')
        with open(sev_path, 'r') as f:
            return json.load(f)
    except Exception:
        return {
            'fever': 4, 'high_fever': 7, 'cough': 3, 'fatigue': 4,
            'headache': 3, 'nausea': 3, 'vomiting': 5, 'chest_pain': 7,
            'breathlessness': 7, 'joint_pain': 4,
        }


@lru_cache(maxsize=1)
def _load_feature_columns() -> tuple:
    """Load feature column names (cached, returned as tuple for hashability)."""
    try:
        fn_path = os.path.join(ML_ARTIFACTS, 'feature_columns.json')
        with open(fn_path, 'r') as f:
            return tuple(json.load(f))
    except Exception:
        return ()


# ── Symptom display names ───────────────────────
def _format_symptom_name(raw: str) -> str:
    """Convert snake_case symptom to Title Case."""
    return raw.replace('_', ' ').title()


# ── Cache key builder ───────────────────────────
def _build_cache_key(symptoms: list, disease: str, confidence: float) -> str:
    """Create a deterministic cache key from inputs."""
    canon = ','.join(sorted(s.lower().strip() for s in symptoms))
    raw = f"{canon}|{disease}|{confidence:.4f}"
    return hashlib.md5(raw.encode()).hexdigest()


# ═══════════════════════════════════════════════════════════════════
# CONFIDENCE LABELING & EXPLANATION
# ═══════════════════════════════════════════════════════════════════

def confidence_to_label(score: float) -> str:
    """
    Convert a 0.0-1.0 confidence score to a human-readable label.

    Mapping:
        0.0 - 0.4  ->  Low
        0.4 - 0.7  ->  Medium
        0.7 - 1.0  ->  High
    """
    if score >= 0.7:
        return 'High'
    elif score >= 0.4:
        return 'Medium'
    else:
        return 'Low'


def confidence_explanation(label: str) -> str:
    """
    Return a human-readable explanation paragraph for a confidence label.
    Used in both the API response and the frontend UI.
    """
    _EXPLANATIONS = {
        'High': (
            'Confidence reflects model certainty based on training data. '
            'High confidence indicates strong alignment between your '
            'symptoms and known disease patterns.'
        ),
        'Medium': (
            'Confidence reflects model certainty based on training data. '
            'Medium confidence indicates partial alignment; '
            'further medical evaluation is recommended.'
        ),
        'Low': (
            'Confidence reflects model certainty based on training data. '
            'Low confidence indicates weak alignment; '
            'results may be unreliable.'
        ),
    }
    return _EXPLANATIONS.get(label, _EXPLANATIONS['Medium'])


def _confidence_color(label: str) -> str:
    """CSS colour token for a confidence label."""
    return {'High': '#16a34a', 'Medium': '#d97706', 'Low': '#dc2626'}.get(label, '#d97706')


def _evidence_level(pct: float) -> str:
    """Convert evidence % to descriptive level."""
    if pct >= 85:
        return 'Very High'
    elif pct >= 70:
        return 'High'
    elif pct >= 55:
        return 'Moderate'
    elif pct >= 40:
        return 'Low'
    else:
        return 'Very Low'


# ═══════════════════════════════════════════════════════════════════
# CORE XAI FUNCTION  (with caching — Requirement #6)
# ═══════════════════════════════════════════════════════════════════

def explain_prediction(
    symptoms: list,
    predicted_disease: str,
    confidence: float,
    model=None,
    label_encoder=None,
    feature_names: list = None,
    severity_map: dict = None,
    top_3_predictions: list = None,
) -> dict:
    """
    Generate complete ML explanation for a disease prediction.

    Performance: results are cached by (symptoms, disease, confidence)
    so repeated or identical predictions return instantly.
    """

    # ── Cache lookup (with TTL validation) ─────
    cache_key = _build_cache_key(symptoms, predicted_disease, confidence)
    cached = _xai_cache.get(cache_key)
    if cached is not None:
        age = time.time() - cached['ts']
        if age < _CACHE_TTL_SECONDS:
            return cached['data']
        else:
            # Stale entry — evict
            _xai_cache.pop(cache_key, None)

    # ── Load defaults ─────────────────────────
    if severity_map is None:
        severity_map = _load_severity_dict()

    if feature_names is None:
        loaded = _load_feature_columns()
        feature_names = list(loaded) if loaded else symptoms

    # Normalise confidence
    conf_raw = confidence                  # 0.0-1.0  (kept for label)
    conf_pct = round(confidence * 100, 1) if confidence <= 1 else round(confidence, 1)
    conf_label = confidence_to_label(conf_raw)

    # ── 1. FEATURE CONTRIBUTIONS  (normalised 0-100%) ─────
    feature_contributions = []
    total_severity = 0

    for sym in symptoms:
        raw = sym.lower().strip()
        severity = severity_map.get(raw, 3)
        total_severity += severity
        feature_contributions.append({
            'symptom': raw,
            'display_name': _format_symptom_name(raw),
            'severity_score': severity,
            'max_severity': 7,
            'contribution_pct': 0.0,         # filled below
            'normalized_score': 0.0,          # NEW: 0-100 normalised
            'severity_label': _severity_label(severity),
        })

    # Normalise to 0-100% (Requirement #2)
    if total_severity > 0:
        for fc in feature_contributions:
            fc['contribution_pct'] = round(
                (fc['severity_score'] / total_severity) * 100, 1
            )
            fc['normalized_score'] = round(
                (fc['severity_score'] / 7) * 100, 1    # vs max=7
            )

    feature_contributions.sort(
        key=lambda x: x['severity_score'], reverse=True
    )

    # ── 2. TOP CONTRIBUTING SYMPTOMS ──────────
    top_symptoms = feature_contributions[:5]

    # ── 3. CONFIDENCE BREAKDOWN ───────────────
    avg_severity = total_severity / max(len(symptoms), 1)
    severity_alignment = round((avg_severity / 7) * 100, 1)

    confidence_breakdown = {
        'overall': conf_pct,
        'symptom_match': min(round(conf_pct + 5, 1), 100),
        'severity_alignment': severity_alignment,
        'pattern_strength': round(conf_pct * 0.9, 1),
        'confidence_level': _evidence_level(conf_pct),
    }

    # ── 4. RISK FACTORS  (enhanced — Req #5) ──
    risk_factors = _analyze_risk_factors(symptoms, severity_map)

    # ── 5. ALTERNATIVE DIAGNOSES  (with reasoning — Req #4) ──
    alternatives = _get_alternative_diagnoses(
        symptoms, predicted_disease,
        model, label_encoder, feature_names,
        top_3_predictions, severity_map,
    )

    # ── 6. EVIDENCE STRENGTH ──────────────────
    evidence_strength, evidence_pct = _calculate_evidence_strength(
        len(symptoms), conf_pct, total_severity
    )

    # ── 7. PLAIN EXPLANATION  (Req #1 — one-liner) ──
    plain_explanation = _generate_plain_explanation(
        symptoms, predicted_disease, conf_label,
    )

    # ── 8. XAI SUMMARY  (detailed) ───────────
    xai_summary = _generate_xai_summary(
        symptoms, predicted_disease, conf_pct,
        top_symptoms, risk_factors, evidence_strength, conf_label,
    )

    # ── 9. EXPLANATION SCORE (0-100) ──────────
    explanation_score = round(
        (conf_pct * 0.5) + (len(symptoms) * 5) + (total_severity * 2), 1,
    )
    explanation_score = min(explanation_score, 100)

    # ── 10. SYMPTOM WEIGHTS ───────────────────
    symptom_weights = {}
    for fc in feature_contributions:
        symptom_weights[fc['symptom']] = {
            'weight': fc['severity_score'],
            'pct': fc['contribution_pct'],
            'normalized': fc['normalized_score'],
        }

    # ── TOP 3 KEY SYMPTOMS SUMMARY ─────────
    top_3_key_symptoms = [
        {
            'name': fc['display_name'],
            'contribution_pct': fc['contribution_pct'],
            'severity_label': fc['severity_label'],
        }
        for fc in feature_contributions[:3]
    ]

    # ── CONFIDENCE EXPLANATION ─────────────
    conf_explanation = confidence_explanation(conf_label)
    
    # ── TOP-K PROBABILITY SUM (Uncertainty check) ──
    top_k_sum = 0
    if top_3_predictions:
        top_k_sum = sum([p.get('probability', 0) for p in top_3_predictions]) * 100
    
    warning = None
    if conf_pct < 60.0:
        warning = "Prediction confidence is low. Please provide more symptoms for a more accurate result."

    result = {
        'feature_contributions': feature_contributions,
        'top_contributing_symptoms': top_symptoms,
        'top_features': [fc['display_name'] for fc in feature_contributions[:5]], # Alias for ML output
        'top_3_key_symptoms': top_3_key_symptoms,
        
        'confidence_breakdown': confidence_breakdown,
        'confidence_label': conf_label,
        'confidence_color': _confidence_color(conf_label),
        'confidence_explanation': conf_explanation,
        'evidence_explanation': "Evidence strength reflects how strongly symptoms match known disease patterns.",
        'severity_explanation': "Severity score estimates potential seriousness based on symptom intensity.",
        
        'risk_factors': risk_factors,
        'alternatives': alternatives, # Alias
        'alternative_diagnoses': alternatives,
        
        'evidence_strength': evidence_strength,
        'evidence_strength_pct': evidence_pct,
        'plain_explanation': plain_explanation,
        'xai_summary': xai_summary,
        'explanation_score': explanation_score,
        'symptom_weights': symptom_weights,
        
        'total_symptoms': len(symptoms),
        'total_severity': total_severity,
        
        'top_k_prob_sum': round(top_k_sum, 1),
        'uncertainty_note': "AI predictions are probabilistic and may vary based on input completeness.",
    }
    
    if warning:
        result['warning'] = warning

    # ── Store in cache (with timestamp) ───────
    if len(_xai_cache) >= _MAX_CACHE_SIZE:
        # Evict oldest entry by timestamp
        oldest_key = min(_xai_cache, key=lambda k: _xai_cache[k]['ts'])
        _xai_cache.pop(oldest_key, None)
    _xai_cache[cache_key] = {'data': result, 'ts': time.time()}

    return result


# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

def _severity_label(score) -> str:
    """Convert numeric severity to label."""
    score = int(score) if score else 0
    if score >= 7:
        return 'Critical'
    elif score >= 5:
        return 'High'
    elif score >= 3:
        return 'Moderate'
    else:
        return 'Low'


# ── Risk factors (enhanced — Req #5) ────────────────────────────

# Expanded risk knowledge-base with severity weights
_HIGH_RISK_SYMPTOMS = {
    'chest_pain': {
        'message': 'Chest pain can indicate cardiac or respiratory conditions requiring urgent evaluation.',
        'detail': 'May be related to angina, myocardial infarction, pulmonary embolism, or pleurisy.',
        'level': 'critical', 'urgency': 10,
    },
    'breathlessness': {
        'message': 'Difficulty breathing may signal respiratory distress or cardiac insufficiency.',
        'detail': 'Associated with asthma, COPD, pneumonia, anxiety, or heart failure.',
        'level': 'critical', 'urgency': 10,
    },
    'high_fever': {
        'message': 'High fever (>39C / 102F) indicates significant infection or systemic inflammation.',
        'detail': 'Persistent high fever requires evaluation for bacterial infections or sepsis.',
        'level': 'high', 'urgency': 8,
    },
    'vomiting': {
        'message': 'Vomiting may indicate gastrointestinal, neurological, or metabolic issues.',
        'detail': 'Persistent vomiting risks dehydration and electrolyte imbalance.',
        'level': 'high', 'urgency': 7,
    },
    'loss_of_consciousness': {
        'message': 'Loss of consciousness requires immediate emergency medical attention.',
        'detail': 'May indicate syncope, seizure, stroke, or cardiac arrhythmia.',
        'level': 'critical', 'urgency': 10,
    },
    'slurred_speech': {
        'message': 'Slurred speech may indicate a neurological emergency such as stroke.',
        'detail': 'Time-critical: seek emergency care (FAST protocol).',
        'level': 'critical', 'urgency': 10,
    },
    'altered_sensorium': {
        'message': 'Altered consciousness is a serious neurological warning sign.',
        'detail': 'May indicate meningitis, encephalitis, metabolic encephalopathy, or drug toxicity.',
        'level': 'critical', 'urgency': 10,
    },
    'blood_in_sputum': {
        'message': 'Blood in sputum (hemoptysis) requires urgent medical evaluation.',
        'detail': 'Could indicate tuberculosis, lung cancer, pulmonary embolism, or severe bronchitis.',
        'level': 'critical', 'urgency': 9,
    },
    'stomach_bleeding': {
        'message': 'Gastrointestinal bleeding needs immediate medical attention.',
        'detail': 'Can cause rapid hemodynamic compromise if left untreated.',
        'level': 'critical', 'urgency': 10,
    },
}

_MODERATE_RISK_SYMPTOMS = {
    'fatigue': {
        'message': 'Persistent fatigue may indicate systemic illness or metabolic disorder.',
        'detail': 'Common in anemia, thyroid disorders, diabetes, or chronic infections.',
    },
    'fever': {
        'message': "Fever is the body's immune response to infection or inflammation.",
        'detail': 'Monitor duration and pattern; seek care if persistent beyond 3 days.',
    },
    'joint_pain': {
        'message': 'Joint pain may indicate inflammatory or autoimmune conditions.',
        'detail': 'Assess for swelling, redness, and morning stiffness patterns.',
    },
    'headache': {
        'message': 'Severe or persistent headache may signal neurological conditions.',
        'detail': 'Watch for sudden onset, visual changes, or neck stiffness.',
    },
    'dizziness': {
        'message': 'Dizziness may indicate vestibular, circulatory, or neurological issues.',
        'detail': 'Differentiate between vertigo, lightheadedness, and unsteadiness.',
    },
    'weakness_in_limbs': {
        'message': 'Limb weakness may indicate neurological involvement.',
        'detail': 'Sudden onset requires urgent stroke evaluation.',
    },
    'skin_rash': {
        'message': 'Skin rash may indicate allergic, infectious, or autoimmune reactions.',
        'detail': 'Note distribution, morphology, and associated symptoms.',
    },
    'abdominal_pain': {
        'message': 'Abdominal pain may signal digestive, urinary, or gynecological issues.',
        'detail': 'Location, severity, and timing guide differential diagnosis.',
    },
    'nausea': {
        'message': 'Nausea may indicate GI disorders, medication effects, or vestibular issues.',
        'detail': 'Persistent nausea warrants evaluation for underlying cause.',
    },
    'weight_loss': {
        'message': 'Unexplained weight loss may indicate metabolic, malignant, or endocrine conditions.',
        'detail': 'Loss of >5% body weight in 6 months is clinically significant.',
    },
}


def _analyze_risk_factors(symptoms: list, severity_map: dict = None) -> list:
    """Identify and explain high-risk symptoms with enhanced detail."""
    risk_factors = []

    for sym in symptoms:
        raw = sym.lower().strip()
        if raw in _HIGH_RISK_SYMPTOMS:
            rf = _HIGH_RISK_SYMPTOMS[raw]
            risk_factors.append({
                'symptom': raw,
                'display': _format_symptom_name(raw),
                'message': rf['message'],
                'detail': rf['detail'],
                'level': rf['level'],
                'urgency': rf['urgency'],
                'severity_score': severity_map.get(raw, 7) if severity_map else 7,
                'icon': 'fa-triangle-exclamation'
                    if rf['level'] == 'critical'
                    else 'fa-circle-exclamation',
            })
        elif raw in _MODERATE_RISK_SYMPTOMS:
            mrf = _MODERATE_RISK_SYMPTOMS[raw]
            risk_factors.append({
                'symptom': raw,
                'display': _format_symptom_name(raw),
                'message': mrf['message'],
                'detail': mrf['detail'],
                'level': 'moderate',
                'urgency': 4,
                'severity_score': severity_map.get(raw, 3) if severity_map else 3,
                'icon': 'fa-circle-info',
            })

    # Sort by urgency (highest first)
    risk_factors.sort(key=lambda x: x.get('urgency', 0), reverse=True)
    return risk_factors[:6]


# ── Alternative diagnoses  (enhanced — Req #4) ──────────────────

def _get_alternative_diagnoses(
    symptoms, predicted_disease,
    model=None, label_encoder=None, feature_names=None,
    top_3_predictions=None, severity_map=None,
) -> list:
    """
    Get alternative diagnoses with *rejection reasoning*.
    e.g. "Ruled out due to absence of loss of smell."
    """

    sym_set = set(s.lower().strip() for s in symptoms)

    # 1. Model-based alternatives
    if model is not None and label_encoder is not None and feature_names is not None:
        try:
            return _model_alternatives(
                symptoms, predicted_disease,
                model, label_encoder, feature_names,
                severity_map, sym_set,
            )
        except Exception:
            pass

    # 2. Top-3 predictions passthrough
    if top_3_predictions and len(top_3_predictions) > 1:
        alternatives = []
        for p in top_3_predictions[1:4]:
            disease = p.get('disease', '')
            prob = round(p.get('probability', 0) * 100, 1)
            if prob > 1.0 and disease.lower() != predicted_disease.lower():
                reason = _generate_alt_reason(disease, predicted_disease, sym_set)
                alternatives.append({
                    'disease': disease,
                    'probability': prob,
                    'reason': reason,
                    'confidence': confidence_to_label(prob / 100),
                    'confidence_color': _confidence_color(confidence_to_label(prob / 100)),
                })
        if alternatives:
            return alternatives[:3]

    # 3. Fallback: rule-based
    return _rule_based_alternatives(symptoms, predicted_disease, sym_set)


def _generate_alt_reason(alt_disease: str, primary: str, sym_set: set) -> str:
    """Generate a human-readable reason comparing alternative to primary."""

    # Disease-specific differential markers
    DISEASE_MARKERS = {
        'common cold':       {'runny_nose', 'sneezing', 'sore_throat'},
        'flu':               {'high_fever', 'body_ache', 'chills'},
        'covid-19':          {'loss_of_smell', 'loss_of_taste', 'dry_cough'},
        'dengue':            {'skin_rash', 'bleeding', 'high_fever'},
        'malaria':           {'chills', 'sweating', 'high_fever'},
        'typhoid':           {'high_fever', 'constipation', 'abdominal_pain'},
        'pneumonia':         {'high_fever', 'breathlessness', 'chest_pain'},
        'tuberculosis':      {'weight_loss', 'night_sweats', 'blood_in_sputum'},
        'migraine':          {'visual_disturbances', 'nausea', 'sensitivity_to_light'},
        'hypertension':      {'headache', 'dizziness', 'blurred_vision'},
        'diabetes':          {'excessive_hunger', 'frequent_urination', 'weight_loss'},
        'asthma':            {'breathlessness', 'wheezing', 'cough'},
        'gastritis':         {'stomach_pain', 'acidity', 'nausea'},
        'hepatitis':         {'yellowish_skin', 'dark_urine', 'fatigue'},
        'arthritis':         {'joint_pain', 'swelling', 'stiffness'},
    }

    alt_lower = alt_disease.lower()
    if alt_lower in DISEASE_MARKERS:
        markers = DISEASE_MARKERS[alt_lower]
        missing = markers - sym_set
        present = markers & sym_set
        if missing:
            missing_names = [_format_symptom_name(m) for m in list(missing)[:2]]
            return f"Considered but less likely -- absence of {', '.join(missing_names)}"
        elif present:
            present_names = [_format_symptom_name(p) for p in list(present)[:2]]
            return f"Symptom overlap detected: {', '.join(present_names)}"

    return f"Symptom pattern partially overlaps with {alt_disease}"


def _model_alternatives(
    symptoms, predicted_disease,
    model, label_encoder, feature_names,
    severity_map=None, sym_set=None,
) -> list:
    """Use model predict_proba with enhanced reasoning."""
    if severity_map is None:
        severity_map = _load_severity_dict()
    if sym_set is None:
        sym_set = set(s.lower().strip() for s in symptoms)

    feature_vector = [
        severity_map.get(f, 0) if f in sym_set else 0
        for f in feature_names
    ]
    X = np.array(feature_vector, dtype=np.float32).reshape(1, -1)

    if hasattr(model, 'predict_proba'):
        proba = model.predict_proba(X)[0]
        classes = label_encoder.classes_
        sorted_idx = np.argsort(proba)[::-1]
        alternatives = []

        for idx in sorted_idx[1:4]:
            disease = classes[idx]
            prob = round(float(proba[idx]) * 100, 1)
            if prob > 2.0:
                reason = _generate_alt_reason(disease, predicted_disease, sym_set)
                label = confidence_to_label(prob / 100)
                alternatives.append({
                    'disease': disease,
                    'probability': prob,
                    'reason': reason,
                    'confidence': label,
                    'confidence_color': _confidence_color(label),
                })

        return alternatives[:3]
    return []


def _rule_based_alternatives(symptoms, predicted_disease, sym_set=None) -> list:
    """Rule-based alternatives with reasoning."""
    if sym_set is None:
        sym_set = set(s.lower().strip() for s in symptoms)

    COMMON_ALTERNATIVES = {
        'fever':          [('Common Cold', 35), ('Viral Infection', 28), ('Dengue', 20)],
        'cough':          [('Bronchitis', 30), ('Common Cold', 28), ('Asthma', 18)],
        'headache':       [('Migraine', 32), ('Tension Headache', 28), ('Hypertension', 15)],
        'joint_pain':     [('Arthritis', 35), ('Gout', 25), ('Rheumatism', 18)],
        'stomach_pain':   [('Gastritis', 32), ('IBS', 25), ('Appendicitis', 15)],
        'skin_rash':      [('Eczema', 30), ('Psoriasis', 25), ('Contact Dermatitis', 18)],
        'fatigue':        [('Anemia', 28), ('Thyroid Disorder', 22), ('Chronic Fatigue Syndrome', 15)],
        'breathlessness': [('Asthma', 32), ('COPD', 25), ('Pneumonia', 20)],
        'nausea':         [('Gastritis', 30), ('Food Poisoning', 25), ('GERD', 18)],
    }

    alternatives = []
    for sym in symptoms:
        raw = sym.lower().strip()
        if raw in COMMON_ALTERNATIVES:
            for name, prob in COMMON_ALTERNATIVES[raw]:
                if name.lower() != predicted_disease.lower():
                    if not any(a['disease'] == name for a in alternatives):
                        label = confidence_to_label(prob / 100)
                        reason = _generate_alt_reason(name, predicted_disease, sym_set)
                        alternatives.append({
                            'disease': name,
                            'probability': prob,
                            'reason': reason,
                            'confidence': label,
                            'confidence_color': _confidence_color(label),
                        })

    alternatives.sort(key=lambda x: x['probability'], reverse=True)
    return alternatives[:3]


# ── Evidence strength ───────────────────────────────────────────

def _calculate_evidence_strength(
    symptom_count: int, confidence: float, severity: int,
) -> tuple:
    """Calculate evidence strength. Returns (label, percentage)."""
    score = (
        (min(symptom_count, 8) / 8) * 40 +
        (confidence / 100) * 40 +
        (min(severity, 30) / 30) * 20
    )
    score = round(score, 1)

    if score >= 80:
        label = 'Very Strong'
    elif score >= 65:
        label = 'Strong'
    elif score >= 50:
        label = 'Moderate'
    elif score >= 35:
        label = 'Weak'
    else:
        label = 'Very Weak'

    return label, score


# ── Human-friendly explanation (Req #1) ─────────────────────────

def _generate_plain_explanation(
    symptoms: list, disease: str, conf_label: str,
) -> str:
    """
    ONE simple sentence a patient can understand immediately.
    e.g. "Based on your symptoms such as fever, cough, and fatigue,
          the system predicts flu with high confidence."
    """
    names = [_format_symptom_name(s) for s in symptoms[:3]]
    if len(symptoms) > 3:
        sym_text = ', '.join(names) + f', and {len(symptoms) - 3} more'
    else:
        sym_text = ', '.join(names[:-1]) + (' and ' + names[-1] if len(names) > 1 else names[0])

    level_word = conf_label.lower()
    return (
        f"Based on your symptoms such as {sym_text}, "
        f"the system predicts {disease} with {level_word} confidence."
    )


def _generate_xai_summary(
    symptoms, disease, confidence, top_symptoms,
    risk_factors, evidence_strength, conf_label,
) -> str:
    """Generate detailed human-readable explanation."""
    sym_names = [_format_symptom_name(s['symptom']) for s in top_symptoms[:3]]
    sym_text = ', '.join(sym_names)

    critical_count = sum(1 for rf in risk_factors if rf['level'] == 'critical')

    parts = []

    # Main explanation
    parts.append(
        f"Based on {len(symptoms)} reported "
        f"symptom{'s' if len(symptoms) > 1 else ''}, "
        f"the AI model identified '{disease}' as the most likely condition "
        f"with {confidence:.1f}% confidence ({conf_label})."
    )

    # Symptom evidence
    if sym_names:
        parts.append(
            f"The primary contributing symptoms are {sym_text}, "
            f"which align with known clinical patterns for {disease}."
        )

    # Evidence strength
    parts.append(
        f"Evidence strength is classified as '{evidence_strength}', "
        f"based on symptom count, severity weighting, and pattern match."
    )

    # Critical risk warning
    if critical_count > 0:
        parts.append(
            f"WARNING: {critical_count} critical symptom"
            f"{'s' if critical_count > 1 else ''} "
            f"detected -- seek immediate medical attention."
        )
    else:
        parts.append(
            "Consult a qualified doctor for proper diagnosis and treatment."
        )

    return ' '.join(parts)
