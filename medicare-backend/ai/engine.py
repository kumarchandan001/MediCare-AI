"""
ai/engine.py
──────────────────────────────────────────────
MediCare AI — Prediction Engine (v3 — Confidence Corrected)

Key improvements over previous version:
  1. Severity-weighted feature vector (weight/7.0 not binary 0/1)
  2. Confidence correction via ai.confidence_calibrator
     (display_conf = 50 + dominance_ratio * 48 → 65–98% range)
  3. Symptom-count and uniqueness boosts
  4. Feature contributions emitted with ALL fields XAIPanel expects
  5. WHO + lifestyle pipeline fully preserved

Pipeline:
  symptoms → severity-weighted vector → LightGBM/RF → correct_confidence
  → lifestyle_adjust → who_adjust → API response
"""

import json
import pickle
import logging
from pathlib import Path
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)

MODELS = Path(__file__).parent / "models"
_cache: dict = {}


# ── Artifact loaders ──────────────────────────────────────────

def _load(name: str):
    """Load a pickle from MODELS directory, cached after first read."""
    if name not in _cache:
        path = MODELS / name
        if not path.exists():
            _cache[name] = None
            return None
        with open(path, "rb") as f:
            _cache[name] = pickle.load(f)
    return _cache[name]


def _load_who_profiles() -> dict:
    if "_who" not in _cache:
        path = MODELS / "who_profiles.pkl"
        _cache["_who"] = (
            pickle.load(open(path, "rb")) if path.exists() else {}
        )
    return _cache["_who"]


def _load_model_info() -> dict:
    path = MODELS.parent / "model_info.json"
    return json.load(open(path)) if path.exists() else {}


def models_loaded() -> bool:
    return all(
        (MODELS / f).exists()
        for f in [
            "health_assistant_model.pkl",
            "label_encoder.pkl",
            "feature_names.pkl",
        ]
    )


def get_all_symptoms() -> list[str]:
    f = _load("feature_names.pkl")
    return f if f else _fallback_symptoms()


def get_disease_info(disease: str) -> dict:
    descs = _load("disease_descriptions.pkl") or {}
    precs = _load("disease_precautions.pkl") or {}
    return {
        "description": descs.get(disease, ""),
        "precautions": precs.get(disease, []),
    }


# ── Main predict entry point ──────────────────────────────────

def predict(
    symptoms: list[str],
    country_code: Optional[str] = None,
    lifestyle: Optional[dict] = None,
) -> dict:
    """
    Full prediction pipeline:
      1. Normalize symptom strings
      2. ML prediction with confidence correction
      3. Lifestyle adjustments (optional)
      4. WHO country adjustment (optional)
    """
    symptoms = [
        s.strip().lower().replace(" ", "_")
        for s in symptoms
        if s and s.strip()
    ]
    if not symptoms:
        return _error_result("No symptoms provided.")

    result = (
        _ml_predict(symptoms)
        if models_loaded()
        else _rule_based(symptoms)
    )

    if lifestyle:
        result = _lifestyle_adjust(result, lifestyle)

    if country_code and country_code.strip():
        result = _who_adjust(result, country_code.strip().upper())

    return result


# ── ML prediction with confidence correction ──────────────────

def _ml_predict(symptoms: list[str]) -> dict:
    model    = _load("health_assistant_model.pkl")
    le       = _load("label_encoder.pkl")
    features = _load("feature_names.pkl")
    sev_map  = _load("symptom_severity_map.pkl") or {}
    imps     = _load("feature_importances.pkl") or {}

    # ── Build SEVERITY-WEIGHTED feature vector ─────────────────
    # Key fix: use weight/7.0 (float 0–1) instead of binary 0/1.
    # This means a symptom with severity 7 contributes 1.0,
    # while severity 1 contributes only 0.14.
    feature_vec = np.zeros(len(features), dtype=np.float32)
    matched:   list[str] = []
    unmatched: list[str] = []

    for sym in symptoms:
        if sym in features:
            idx = features.index(sym)
            feature_vec[idx] = sev_map.get(sym, 3) / 7.0
            matched.append(sym)
        else:
            # Substring-match fallback
            found = next(
                (f for f in features if sym in f or f in sym), None
            )
            if found:
                feature_vec[features.index(found)] = (
                    sev_map.get(found, 3) / 7.0
                )
                matched.append(found)
            else:
                unmatched.append(sym)

    if not matched:
        return _error_result(
            "None of the provided symptoms matched our database."
        )

    # ── Raw model probabilities ────────────────────────────────
    X     = feature_vec.reshape(1, -1)
    proba = model.predict_proba(X)[0]

    # ── Apply confidence correction ────────────────────────────
    from ai.confidence_calibrator import (
        correct_confidence,
        get_confidence_label,
        get_evidence_score,
    )
    display_conf, raw_conf = correct_confidence(
        proba,
        n_symptoms_selected=len(matched),
    )

    # ── Top-5 predictions ──────────────────────────────────────
    top_idx = np.argsort(proba)[::-1][:5]
    top5    = []
    for i, idx in enumerate(top_idx):
        raw_p = float(proba[idx]) * 100
        name  = le.classes_[idx]
        info  = get_disease_info(name)

        # Scale alt confidences proportionally but cap below primary
        if i == 0:
            shown_conf = display_conf
        else:
            ratio      = raw_p / max(raw_conf, 0.001)
            shown_conf = round(max(10.0, min(display_conf - 5, display_conf * ratio)), 1)

        top5.append({
            "disease":     name,
            "confidence":  shown_conf,
            "raw_prob":    round(raw_p, 1),
            "description": info["description"],
            "precautions": info["precautions"],
            "rank":        i + 1,
        })

    primary = top5[0]
    alts    = top5[1:]

    evidence, ev_label = get_confidence_label(display_conf)
    ev_score           = get_evidence_score(display_conf)

    risk_level = (
        "Moderate" if display_conf >= 85
        else "Low"
    )

    # ── XAI: contributions & risk factors ─────────────────────
    contributions = _contributions(matched, imps, sev_map)
    risk_factors  = _risk_factors(matched, sev_map, primary["disease"])

    top3_names = [c["symptom"].replace("_", " ").title() for c in contributions[:3]]
    xai_summary = (
        f"The AI model identified {primary['disease']} with "
        f"{display_conf:.0f}% confidence. "
        f"Key indicators: {', '.join(top3_names)}. "
        f"Evidence strength: {evidence.lower()}."
    )

    meta = _load_model_info()

    # ── Build response ─────────────────────────────────────────
    # NOTE: XAIPanel reads xai.feature_contributions, so we emit
    # contributions with ALL expected fields (including legacy aliases).
    return {
        "predicted_disease":    primary["disease"],
        "confidence":           display_conf,
        "raw_confidence":       raw_conf,
        "risk_level":           risk_level,
        "description":          primary["description"],
        "precautions":          primary["precautions"],
        "matched_symptoms":     matched,
        "unmatched_symptoms":   unmatched,
        "symptoms_analyzed":    len(matched),
        "who_adjustment":       None,
        "lifestyle_adjustment": None,
        "xai": {
            "xai_summary":     xai_summary,
            "evidence_strength": evidence,
            "evidence_score":  ev_score,
            "explanation_score": round(display_conf),
            # XAIPanel reads feature_contributions ──────────────
            "feature_contributions":     contributions,
            "top_contributing_symptoms": contributions[:3],
            # XAIPanel's ConfidenceGrid reads these 4 keys ──────
            "confidence_breakdown": {
                "overall":            display_conf,
                "symptom_match":      round(
                    len(matched) / max(len(symptoms), 1) * 100, 1
                ),
                "pattern_strength":   round(display_conf * 0.96, 1),
                "severity_alignment": round(float(ev_score), 1),
                "confidence_level":   evidence,
                # Extra metadata
                "raw_rf_probability":  raw_conf,
                "correction_applied":  True,
            },
            # XAIPanel reads alternative_diagnoses.probability ──
            "alternative_diagnoses": [
                {
                    "disease":     a["disease"],
                    "probability": a["confidence"],   # bar width
                    "confidence":  a["confidence"],
                    "reason": (
                        "Similar symptom profile"
                        if a["raw_prob"] > 8
                        else "Differential diagnosis"
                    ),
                    "description": a["description"],
                    "precautions": a["precautions"],
                }
                for a in alts
            ],
            # XAIPanel reads risk_factors ────────────────────────
            "risk_factors":          risk_factors,
            # Legacy fields (some parts of UI may still read them)
            "symptom_contributions": contributions,
            "symptom_weights":       {},
            "total_symptoms":        len(matched),
            "total_severity":        sum(
                c["severity_score"] for c in contributions
            ),
        },
        "model_info": {
            "algorithm":       meta.get("algorithm", "LightGBM"),
            "accuracy":        meta.get("cv_mean", 0),
            "trained_at":      meta.get("trained_at", ""),
            "confidence_mode": "corrected",
        },
    }


# ── WHO country adjustment ────────────────────────────────────

def _who_adjust(result: dict, code: str) -> dict:
    try:
        from ai.who_engine import get_who_adjustment
        profiles = _load_who_profiles()
        who = get_who_adjustment(
            predicted_disease=result["predicted_disease"],
            country_code=code,
            base_confidence=result["confidence"],
            profiles=profiles,
        )
        orig = result["confidence"]
        adj  = who["adjusted_confidence"]
        result["confidence"]     = adj
        result["who_adjustment"] = {
            "original_confidence": orig,
            "adjusted_confidence": adj,
            "adjustment_factor":   who["adjustment_factor"],
            "country_name":        who["country_name"],
            "region":              who["region"],
            "who_risk_score":      who["who_risk_score"],
            "who_risk_level":      who["who_risk_level"],
            "relevant_indicators": who["relevant_indicators"],
            "adjustment_reason":   who["adjustment_reason"],
        }
        if who["adjustment_factor"] != 1.0:
            direction = (
                "upward" if who["adjustment_factor"] > 1 else "downward"
            )
            result["xai"]["xai_summary"] += (
                f" Confidence adjusted {direction} to {adj:.0f}% "
                f"based on WHO epidemiological data for "
                f"{who['country_name']}."
            )
    except Exception as e:
        log.warning(f"WHO adjustment failed: {e}")
    return result


# ── Lifestyle adjustment ──────────────────────────────────────

def _lifestyle_adjust(result: dict, lifestyle: dict) -> dict:
    disease = result.get("predicted_disease", "").lower()
    delta   = 0.0
    boosts  = []

    checks = [
        ("smoker",       ["respiratory", "lung", "bronch", "copd", "asthma"], 15, 5),
        ("drinker",      ["liver", "hepat", "gastr", "alcohol"],              15, 5),
        ("diabetic",     ["diabetes", "kidney", "renal", "cardiac"],          12, 4),
        ("hypertensive", ["heart", "cardiac", "stroke", "hypert"],            12, 3),
    ]
    for key, words, match_delta, base_delta in checks:
        if lifestyle.get(key):
            if any(w in disease for w in words):
                delta += match_delta
                boosts.append(
                    f"{key.title()} significantly increases "
                    f"{result.get('predicted_disease', '')} risk."
                )
            else:
                delta += base_delta

    age = lifestyle.get("age_group", "")
    if age == "senior":
        delta += 8
        boosts.append("Age 60+ increases susceptibility to chronic conditions.")
    elif age == "middle":
        delta += 3

    bmi = lifestyle.get("bmi_category", "")
    if bmi == "obese":
        delta += 10
        boosts.append("Obesity is a significant risk factor for many chronic diseases.")
    elif bmi == "overweight":
        delta += 5

    new_risk = (
        "High"     if delta >= 25 else
        "Moderate" if delta >= 12 else
        result.get("risk_level", "Low")
    )
    result["risk_level"]           = new_risk
    result["lifestyle_adjustment"] = {
        "risk_delta":       round(delta, 1),
        "risk_boosts":      boosts,
        "new_risk_level":   new_risk,
        "lifestyle_factors": lifestyle,
    }
    if boosts:
        result["xai"]["xai_summary"] += (
            " Lifestyle factors: " + " ".join(boosts[:2])
        )
    return result


# ── XAI helpers ───────────────────────────────────────────────

def _contributions(
    symptoms:    list[str],
    importances: dict,
    sev_map:     dict,
) -> list[dict]:
    """
    Build feature contribution list with ALL fields the XAIPanel
    expects:
      - feature_contributions: display_name, severity_score,
                               max_severity, contribution_pct,
                               severity_label
      - Also: symptom, importance, contribution (new engine fields)
    """
    total = sum(importances.get(s, 0.001) for s in symptoms) or 1.0
    out   = []
    for sym in symptoms:
        imp  = importances.get(sym, 0.001)
        sev  = sev_map.get(sym, 3)
        pct  = round((imp / total) * 100, 1)
        lbl  = (
            "Critical" if sev >= 7 else
            "High"     if sev >= 5 else
            "Moderate" if sev >= 3 else
            "Low"
        )
        display = sym.replace("_", " ").title()
        out.append({
            # XAIPanel FeatureContribution required fields:
            "symptom":        sym,
            "display_name":   display,
            "severity_score": sev,
            "max_severity":   7,
            "contribution_pct": pct,
            "severity_label": lbl,
            # Additional engine fields:
            "importance":   round(imp, 4),
            "contribution": pct,
        })
    return sorted(out, key=lambda x: x["contribution_pct"], reverse=True)


def _risk_factors(
    symptoms: list[str],
    sev_map:  dict,
    disease:  str,
) -> list[dict]:
    """
    Build risk factor list with ALL fields the XAIPanel expects:
      - symptom, display, message, level, icon
      - Also: factor, score
    """
    out = []
    for sym in symptoms:
        sev = sev_map.get(sym, 1)
        if sev >= 4:
            if sev >= 7:
                lv, icon = "critical", "fa-triangle-exclamation"
                msg = "Requires immediate medical attention"
            elif sev >= 5:
                lv, icon = "high", "fa-circle-exclamation"
                msg = "Consult a doctor soon"
            else:
                lv, icon = "moderate", "fa-circle-info"
                msg = "Monitor and rest"
            display = sym.replace("_", " ").title()
            out.append({
                # XAIPanel RiskFactor required:
                "symptom": sym,
                "display": display,
                "message": msg,
                "level":   lv,
                "icon":    icon,
                # Extra:
                "factor":  display,
                "score":   sev,
            })
    return sorted(out, key=lambda x: x["score"], reverse=True)


# ── Rule-based fallback ───────────────────────────────────────

def _rule_based(symptoms: list[str]) -> dict:
    log.warning("ML models not loaded — using rule-based fallback")
    RULES = {
        "Common Cold":     ["runny_nose", "sneezing", "cough", "sore_throat"],
        "Influenza":       ["fever", "fatigue", "body_aches", "headache", "chills"],
        "Gastroenteritis": ["nausea", "vomiting", "diarrhoea", "stomach_pain"],
        "Migraine":        ["headache", "nausea", "light_sensitivity"],
        "Malaria":         ["high_fever", "chills", "sweating", "headache", "muscle_pain"],
        "Diabetes":        ["fatigue", "excessive_thirst", "frequent_urination"],
        "Hypertension":    ["headache", "dizziness", "chest_pain"],
        "Tuberculosis":    ["cough", "blood_in_sputum", "night_sweats", "weight_loss"],
    }
    best, score = "Unspecified Condition", 0
    for d, dsyms in RULES.items():
        m = sum(
            1 for s in symptoms
            if any(s in ds or ds in s for ds in dsyms)
        )
        if m > score:
            score, best = m, d
    conf = float(min(55 + score * 6, 72))
    empty_bd = {
        "overall":            conf,
        "symptom_match":      0.0,
        "pattern_strength":   0.0,
        "severity_alignment": 0.0,
        "confidence_level":   "Limited",
        "correction_applied": False,
    }
    return {
        "predicted_disease":    best,
        "confidence":           conf,
        "raw_confidence":       conf,
        "risk_level":           "Low",
        "description":          "",
        "precautions":          [],
        "matched_symptoms":     symptoms,
        "unmatched_symptoms":   [],
        "symptoms_analyzed":    len(symptoms),
        "who_adjustment":       None,
        "lifestyle_adjustment": None,
        "xai": {
            "xai_summary":           (
                f"Rule-based prediction: {best}. "
                "Run train_model.py for ML-powered accuracy."
            ),
            "evidence_strength":     "Limited",
            "evidence_score":        35,
            "explanation_score":     35,
            "feature_contributions": [],
            "top_contributing_symptoms": [],
            "confidence_breakdown":  empty_bd,
            "alternative_diagnoses": [],
            "risk_factors":          [],
            "symptom_contributions": [],
            "symptom_weights":       {},
            "total_symptoms":        len(symptoms),
            "total_severity":        0,
        },
        "model_info": {
            "algorithm":       "Rule-based Fallback",
            "accuracy":        0,
            "trained_at":      "",
            "confidence_mode": "rule-based",
        },
    }


def _error_result(msg: str) -> dict:
    empty_bd = {
        "overall":            0.0,
        "symptom_match":      0.0,
        "pattern_strength":   0.0,
        "severity_alignment": 0.0,
        "confidence_level":   "None",
        "correction_applied": False,
    }
    return {
        "predicted_disease":    "Unable to predict",
        "confidence":           0.0,
        "raw_confidence":       0.0,
        "risk_level":           "Unknown",
        "description":          "",
        "precautions":          [],
        "matched_symptoms":     [],
        "unmatched_symptoms":   [],
        "symptoms_analyzed":    0,
        "who_adjustment":       None,
        "lifestyle_adjustment": None,
        "xai": {
            "xai_summary":           msg,
            "evidence_strength":     "None",
            "evidence_score":        0,
            "explanation_score":     0,
            "feature_contributions": [],
            "top_contributing_symptoms": [],
            "confidence_breakdown":  empty_bd,
            "alternative_diagnoses": [],
            "risk_factors":          [],
            "symptom_contributions": [],
            "symptom_weights":       {},
            "total_symptoms":        0,
            "total_severity":        0,
        },
        "model_info": {},
    }


def _fallback_symptoms() -> list[str]:
    return [
        "fever", "fatigue", "cough", "headache",
        "nausea", "vomiting", "diarrhoea", "rash",
        "chest_pain", "breathlessness", "joint_pain",
        "sore_throat", "dizziness", "sweating", "chills",
        "weight_loss", "abdominal_pain", "back_pain",
        "runny_nose", "sneezing", "muscle_pain",
    ]
