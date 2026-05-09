"""
health_intelligence/feature_engineering/feature_generator.py
───────────────────────────────────────────────
Generates clean, ML-ready feature vectors from validated
HealthProfile data.

Feature categories:
  1. Symptom vector   — 131-dim severity-weighted binary array
  2. Wearable metrics — normalized vitals/activity scores
  3. Health scores    — composite indices for risk profiling

All features are designed to be compatible with the existing
LightGBM model (131 symptom features) while also preparing
additional engineered features for future model evolution.
"""

import logging
from typing import Optional

import numpy as np

from health_intelligence.schemas.health_profile import (
    HealthProfile,
    WearableLog,
)
from health_intelligence.normalization.symptom_normalizer import (
    CANONICAL_SYMPTOMS,
)

log = logging.getLogger(__name__)


# ── Severity weights (from Symptom-severity.csv, cleaned) ────
# Key: canonical symptom name → weight (1–7)
# 'prognosis' entry removed; 'foul_smell_ofurine' corrected.

SEVERITY_WEIGHTS: dict[str, int] = {
    "abdominal_pain": 4, "abnormal_menstruation": 6, "acidity": 3,
    "acute_liver_failure": 6, "altered_sensorium": 2, "anxiety": 4,
    "back_pain": 3, "belly_pain": 4, "blackheads": 2,
    "bladder_discomfort": 4, "blister": 4, "blood_in_sputum": 5,
    "bloody_stool": 5, "blurred_and_distorted_vision": 5,
    "breathlessness": 4, "brittle_nails": 5, "bruising": 4,
    "burning_micturition": 6, "chest_pain": 7, "chills": 3,
    "cold_hands_and_feets": 5, "coma": 7, "congestion": 5,
    "constipation": 4, "continuous_feel_of_urine": 6,
    "continuous_sneezing": 4, "cough": 4, "cramps": 4,
    "dark_urine": 4, "dehydration": 4, "depression": 3,
    "diarrhoea": 6, "dischromic__patches": 6,
    "distention_of_abdomen": 4, "dizziness": 4,
    "drying_and_tingling_lips": 4, "enlarged_thyroid": 6,
    "excessive_hunger": 4, "extra_marital_contacts": 5,
    "family_history": 5, "fast_heart_rate": 5, "fatigue": 4,
    "fluid_overload": 4, "foul_smell_of_urine": 5, "headache": 3,
    "high_fever": 7, "hip_joint_pain": 2,
    "history_of_alcohol_consumption": 5, "increased_appetite": 5,
    "indigestion": 5, "inflammatory_nails": 2, "internal_itching": 4,
    "irregular_sugar_level": 5, "irritability": 2,
    "irritation_in_anus": 6, "itching": 1, "joint_pain": 3,
    "knee_pain": 3, "lack_of_concentration": 3, "lethargy": 2,
    "loss_of_appetite": 4, "loss_of_balance": 4, "loss_of_smell": 3,
    "malaise": 6, "mild_fever": 5, "mood_swings": 3,
    "movement_stiffness": 5, "mucoid_sputum": 4, "muscle_pain": 2,
    "muscle_wasting": 3, "muscle_weakness": 2, "nausea": 5,
    "neck_pain": 5, "nodal_skin_eruptions": 4, "obesity": 4,
    "pain_behind_the_eyes": 4, "pain_during_bowel_movements": 5,
    "pain_in_anal_region": 6, "painful_walking": 2,
    "palpitations": 4, "passage_of_gases": 5,
    "patches_in_throat": 6, "phlegm": 5, "polyuria": 4,
    "prominent_veins_on_calf": 6, "puffy_face_and_eyes": 5,
    "pus_filled_pimples": 2, "receiving_blood_transfusion": 5,
    "receiving_unsterile_injections": 2, "red_sore_around_nose": 2,
    "red_spots_over_body": 3, "redness_of_eyes": 5,
    "restlessness": 5, "runny_nose": 5, "rusty_sputum": 4,
    "scurring": 2, "shivering": 5, "silver_like_dusting": 2,
    "sinus_pressure": 4, "skin_peeling": 3, "skin_rash": 3,
    "slurred_speech": 4, "small_dents_in_nails": 2,
    "spinning_movements": 6, "spotting__urination": 6,
    "stiff_neck": 4, "stomach_bleeding": 6, "stomach_pain": 5,
    "sunken_eyes": 3, "sweating": 3, "swelled_lymph_nodes": 6,
    "swelling_joints": 5, "swelling_of_stomach": 7,
    "swollen_blood_vessels": 5, "swollen_extremeties": 5,
    "swollen_legs": 5, "throat_irritation": 4,
    "toxic_look_(typhos)": 5, "ulcers_on_tongue": 4,
    "unsteadiness": 4, "visual_disturbances": 3, "vomiting": 5,
    "watering_from_eyes": 4, "weakness_in_limbs": 7,
    "weakness_of_one_body_side": 4, "weight_gain": 3,
    "weight_loss": 3, "yellow_crust_ooze": 3, "yellow_urine": 4,
    "yellowing_of_eyes": 4, "yellowish_skin": 3,
}


class FeatureGenerator:
    """
    Generates ML-ready features from a validated HealthProfile.

    Primary output: a 131-dimensional severity-weighted vector
    aligned with the trained LightGBM model's feature_names.pkl.

    Secondary output: engineered wearable and composite scores
    for future model integration.
    """

    def __init__(self):
        self.feature_names: list[str] = list(CANONICAL_SYMPTOMS)
        self.feature_index: dict[str, int] = {
            name: idx for idx, name in enumerate(self.feature_names)
        }
        self.n_features: int = len(self.feature_names)

    # ── Primary: symptom feature vector ──────────────────────

    def generate_symptom_vector(
        self,
        matched_symptoms: list[str],
    ) -> np.ndarray:
        """
        Build a 131-dimensional severity-weighted feature vector.

        Each matched symptom's slot is set to (severity_weight / 7.0),
        giving a float in [0.14, 1.0]. Unmatched slots remain 0.

        This matches the existing ai/engine.py encoding scheme.
        """
        vector = np.zeros(self.n_features, dtype=np.float32)

        for symptom in matched_symptoms:
            idx = self.feature_index.get(symptom)
            if idx is not None:
                weight = SEVERITY_WEIGHTS.get(symptom, 3)
                vector[idx] = weight / 7.0

        return vector

    # ── Wearable feature extraction ──────────────────────────

    def generate_wearable_features(
        self,
        profile: HealthProfile,
    ) -> dict[str, float]:
        """
        Extract engineered wearable features from the profile's
        wearable log history.

        Returns a dict of named features for future model input.
        """
        features: dict[str, float] = {}
        latest = profile.get_latest_wearable()

        if latest:
            features["wearable_hr_current"] = float(
                latest.heart_rate_bpm or 0
            )
            features["wearable_spo2_current"] = float(
                latest.spo2_percent or 0
            )
            features["wearable_sleep_current"] = float(
                latest.sleep_hours or 0
            )
            features["wearable_steps_current"] = float(
                latest.steps or 0
            )
            features["wearable_stress_current"] = float(
                latest.stress_level or 0
            )

        # ── Trend features (last 7 entries) ──────────────────
        hr_trend = profile.get_wearable_trend("heart_rate_bpm", last_n=7)
        if hr_trend:
            features["wearable_hr_avg_7d"] = sum(hr_trend) / len(hr_trend)
            features["wearable_hr_max_7d"] = max(hr_trend)
            features["wearable_hr_min_7d"] = min(hr_trend)

        spo2_trend = profile.get_wearable_trend("spo2_percent", last_n=7)
        if spo2_trend:
            features["wearable_spo2_avg_7d"] = sum(spo2_trend) / len(spo2_trend)
            features["wearable_spo2_min_7d"] = min(spo2_trend)

        sleep_trend = profile.get_wearable_trend("sleep_hours", last_n=7)
        if sleep_trend:
            features["wearable_sleep_avg_7d"] = sum(sleep_trend) / len(sleep_trend)

        steps_trend = profile.get_wearable_trend("steps", last_n=7)
        if steps_trend:
            features["wearable_steps_avg_7d"] = sum(steps_trend) / len(steps_trend)

        return features

    # ── Composite health scores ──────────────────────────────

    def compute_symptom_severity_score(
        self,
        matched_symptoms: list[str],
    ) -> float:
        """
        Compute a composite severity score (0–100) based on
        matched symptoms and their individual weights.
        """
        if not matched_symptoms:
            return 0.0

        total_weight = sum(
            SEVERITY_WEIGHTS.get(s, 3) for s in matched_symptoms
        )
        max_possible = len(matched_symptoms) * 7
        score = (total_weight / max(max_possible, 1)) * 100
        return round(min(score, 100.0), 1)

    def compute_vitals_risk_score(
        self,
        profile: HealthProfile,
    ) -> float:
        """
        Compute a vitals-based risk score (0–100).
        Higher scores indicate more abnormal readings.
        """
        if not profile.vitals:
            return 0.0

        score = 0.0
        checks = 0
        v = profile.vitals

        if v.heart_rate_bpm is not None:
            checks += 1
            if v.heart_rate_bpm > 100 or v.heart_rate_bpm < 60:
                deviation = abs(v.heart_rate_bpm - 80) / 80
                score += min(deviation * 50, 30)

        if v.spo2_percent is not None:
            checks += 1
            if v.spo2_percent < 95:
                score += (95 - v.spo2_percent) * 5

        if v.temperature_celsius is not None:
            checks += 1
            if v.temperature_celsius > 37.2:
                score += (v.temperature_celsius - 37.2) * 10

        if v.systolic_bp is not None:
            checks += 1
            if v.systolic_bp > 120:
                score += (v.systolic_bp - 120) * 0.5

        return round(min(score, 100.0), 1) if checks > 0 else 0.0

    # ── Full feature bundle ──────────────────────────────────

    def generate_all_features(
        self,
        profile: HealthProfile,
        matched_symptoms: list[str],
    ) -> dict:
        """
        Generate the complete feature bundle:
          - symptom_vector: np.ndarray (131-dim)
          - wearable_features: dict
          - symptom_severity_score: float
          - vitals_risk_score: float
          - symptom_count: int
        """
        return {
            "symptom_vector": self.generate_symptom_vector(matched_symptoms),
            "wearable_features": self.generate_wearable_features(profile),
            "symptom_severity_score": self.compute_symptom_severity_score(
                matched_symptoms
            ),
            "vitals_risk_score": self.compute_vitals_risk_score(profile),
            "symptom_count": len(matched_symptoms),
            "feature_names": self.feature_names,
        }
