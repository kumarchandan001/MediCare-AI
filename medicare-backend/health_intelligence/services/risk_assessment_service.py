"""
health_intelligence/services/risk_assessment_service.py
───────────────────────────────────────────────
Risk Assessment Service — integrates the existing
LightGBM model directly with fallback-safe logic and
confidence calibration.

This is NOT a diagnostic system. It performs:
  - Health risk assessment
  - Preventive monitoring
  - Risk profiling

Output includes:
  - calibrated confidence score
  - uncertainty level
  - explainable contributing factors
"""

import json
import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

from health_intelligence.schemas.health_profile import (
    HealthProfile,
    RiskAssessmentResult,
    SeverityLevel,
    UncertaintyLevel,
)
from health_intelligence.rules.medical_rules import RuleAlert
from health_intelligence.feature_engineering.feature_generator import (
    SEVERITY_WEIGHTS,
)

log = logging.getLogger(__name__)

# ── Model paths (reuse existing trained artifacts) ────────────
MODELS_DIR = Path(__file__).parent.parent.parent / "ai" / "models"


class RiskAssessmentService:
    """
    Integrates the trained LightGBM model with confidence
    calibration and fallback-safe logic for health risk
    assessment.
    """

    def __init__(self):
        self._model = None
        self._label_encoder = None
        self._feature_names: Optional[list[str]] = None
        self._feature_importances: Optional[dict] = None
        self._disease_descriptions: Optional[dict] = None
        self._disease_precautions: Optional[dict] = None
        self._model_info: Optional[dict] = None
        self._loaded = False

    # ── Model loading with fallback ──────────────────────────

    def _ensure_loaded(self) -> bool:
        """Load ML artifacts. Returns True if successful."""
        if self._loaded:
            return self._model is not None

        try:
            model_path = MODELS_DIR / "health_assistant_model.pkl"
            le_path = MODELS_DIR / "label_encoder.pkl"
            fn_path = MODELS_DIR / "feature_names.pkl"

            if not all(p.exists() for p in [model_path, le_path, fn_path]):
                log.warning(
                    "ML model files not found in %s — "
                    "risk assessment will use rule-based fallback",
                    MODELS_DIR,
                )
                self._loaded = True
                return False

            with open(model_path, "rb") as f:
                self._model = pickle.load(f)
            with open(le_path, "rb") as f:
                self._label_encoder = pickle.load(f)
            with open(fn_path, "rb") as f:
                self._feature_names = pickle.load(f)

            # Optional artifacts
            imp_path = MODELS_DIR / "feature_importances.pkl"
            if imp_path.exists():
                with open(imp_path, "rb") as f:
                    self._feature_importances = pickle.load(f)

            desc_path = MODELS_DIR / "disease_descriptions.pkl"
            if desc_path.exists():
                with open(desc_path, "rb") as f:
                    self._disease_descriptions = pickle.load(f)

            prec_path = MODELS_DIR / "disease_precautions.pkl"
            if prec_path.exists():
                with open(prec_path, "rb") as f:
                    self._disease_precautions = pickle.load(f)

            info_path = MODELS_DIR.parent / "model_info.json"
            if info_path.exists():
                with open(info_path) as f:
                    self._model_info = json.load(f)

            self._loaded = True
            log.info("LightGBM model loaded successfully from %s", MODELS_DIR)
            return True

        except Exception as e:
            log.error("Failed to load ML model: %s", e)
            self._loaded = True
            return False

    # ── Main assessment entry point ──────────────────────────

    def assess_risk(
        self,
        symptom_vector: np.ndarray,
        matched_symptoms: list[str],
        rule_alerts: list[RuleAlert],
        rule_severity: SeverityLevel,
        profile: HealthProfile,
    ) -> RiskAssessmentResult:
        """
        Perform a complete health risk assessment.

        Pipeline:
          1. Try LightGBM model prediction
          2. Apply confidence calibration
          3. Determine uncertainty level
          4. Merge with rule engine severity
          5. Build structured result

        Falls back to rule-based assessment if model is unavailable.
        """
        model_available = self._ensure_loaded()

        if model_available and self._model is not None:
            return self._ml_assess(
                symptom_vector, matched_symptoms,
                rule_alerts, rule_severity, profile,
            )
        else:
            return self._fallback_assess(
                matched_symptoms, rule_alerts, rule_severity,
            )

    # ── ML-powered assessment ────────────────────────────────

    def _ml_assess(
        self,
        symptom_vector: np.ndarray,
        matched_symptoms: list[str],
        rule_alerts: list[RuleAlert],
        rule_severity: SeverityLevel,
        profile: HealthProfile,
    ) -> RiskAssessmentResult:
        """Full ML-powered risk assessment with confidence calibration."""
        try:
            X = symptom_vector.reshape(1, -1)
            probabilities = self._model.predict_proba(X)[0]

            # ── Confidence calibration ───────────────────────
            display_conf, raw_conf = self._calibrate_confidence(
                probabilities,
                n_symptoms=len(matched_symptoms),
            )

            # ── Top prediction ───────────────────────────────
            top_idx = int(np.argmax(probabilities))
            risk_label = self._label_encoder.classes_[top_idx]

            # ── Uncertainty from probability distribution ────
            uncertainty = self._compute_uncertainty(probabilities)

            # ── Contributing factors ─────────────────────────
            contributing_factors = self._extract_contributing_factors(
                matched_symptoms, probabilities, top_idx,
            )

            # ── Merge ML severity with rule severity ─────────
            ml_severity = self._ml_severity(display_conf)
            final_severity = max(
                rule_severity, ml_severity,
                key=lambda s: [
                    SeverityLevel.LOW, SeverityLevel.MODERATE,
                    SeverityLevel.HIGH, SeverityLevel.EMERGENCY,
                ].index(s),
            )

            # ── Risk score (0–100) ───────────────────────────
            risk_score = self._compute_risk_score(
                display_conf, rule_alerts, matched_symptoms,
            )

            # ── Description and precautions ──────────────────
            description = ""
            precautions: list[str] = []
            if self._disease_descriptions:
                description = self._disease_descriptions.get(risk_label, "")
            if self._disease_precautions:
                precautions = self._disease_precautions.get(risk_label, [])

            model_name = "LightGBM"
            if self._model_info:
                model_name = self._model_info.get("algorithm", "LightGBM")

            return RiskAssessmentResult(
                primary_risk=f"{risk_label} risk",
                confidence=round(display_conf, 1),
                uncertainty=uncertainty,
                severity=final_severity,
                risk_score=round(risk_score, 1),
                contributing_factors=contributing_factors,
                matched_symptoms=matched_symptoms,
                unmatched_symptoms=[],
                rule_alerts=[a.to_dict() for a in rule_alerts],
                model_used=model_name,
                description=description,
                precautions=precautions,
            )

        except Exception as e:
            log.error("ML assessment failed, falling back: %s", e)
            return self._fallback_assess(
                matched_symptoms, rule_alerts, rule_severity,
            )

    # ── Confidence calibration ───────────────────────────────

    def _calibrate_confidence(
        self,
        probabilities: np.ndarray,
        n_symptoms: int,
        top_k: int = 5,
    ) -> tuple[float, float]:
        """
        Calibrate raw model probability into a meaningful
        display confidence using relative dominance normalization.

        Uses the same algorithm as ai/confidence_calibrator.py
        to maintain consistency.
        """
        if len(probabilities) == 0:
            return 50.0, 0.0

        top_indices = np.argsort(probabilities)[::-1][:top_k]
        top_probs = probabilities[top_indices]
        top_prob = float(top_probs[0])

        # Relative dominance
        top_sum = float(top_probs.sum())
        dominance = top_prob / top_sum if top_sum > 0 else 1.0 / top_k

        # Base confidence
        base = 50.0 + dominance * 48.0

        # Symptom count boost
        if n_symptoms >= 7:
            sym_boost = 6.0
        elif n_symptoms >= 5:
            sym_boost = 4.0
        elif n_symptoms >= 3:
            sym_boost = 2.0
        else:
            sym_boost = 0.0

        # Uniqueness boost
        uniqueness_boost = 0.0
        if len(top_probs) >= 2 and top_probs[1] > 0:
            ratio = top_probs[0] / top_probs[1]
            if ratio >= 5.0:
                uniqueness_boost = 4.0
            elif ratio >= 3.0:
                uniqueness_boost = 2.0

        display = round(
            min(98.0, max(50.0, base + sym_boost + uniqueness_boost)),
            1,
        )
        raw_pct = round(top_prob * 100, 1)
        return display, raw_pct

    # ── Uncertainty computation ──────────────────────────────

    @staticmethod
    def _compute_uncertainty(probabilities: np.ndarray) -> UncertaintyLevel:
        """
        Derive uncertainty level from the probability distribution.

        Uses entropy-based classification:
          - Low entropy → low uncertainty (model is confident)
          - High entropy → high uncertainty (model is unsure)
        """
        # Normalized entropy (0 = certain, 1 = uniform)
        probs = probabilities[probabilities > 0]
        if len(probs) <= 1:
            return UncertaintyLevel.LOW

        entropy = -np.sum(probs * np.log2(probs))
        max_entropy = np.log2(len(probabilities))
        normalized = entropy / max_entropy if max_entropy > 0 else 0

        if normalized < 0.3:
            return UncertaintyLevel.LOW
        elif normalized < 0.5:
            return UncertaintyLevel.MODERATE
        elif normalized < 0.7:
            return UncertaintyLevel.HIGH
        else:
            return UncertaintyLevel.VERY_HIGH

    # ── Contributing factors extraction ──────────────────────

    def _extract_contributing_factors(
        self,
        matched_symptoms: list[str],
        probabilities: np.ndarray,
        top_idx: int,
    ) -> list[str]:
        """
        Build a list of human-readable contributing factors
        based on feature importance and symptom severity.
        """
        factors: list[str] = []

        # Sort symptoms by importance
        if self._feature_importances:
            scored = [
                (s, self._feature_importances.get(s, 0))
                for s in matched_symptoms
            ]
        else:
            scored = [
                (s, SEVERITY_WEIGHTS.get(s, 3))
                for s in matched_symptoms
            ]

        scored.sort(key=lambda x: x[1], reverse=True)

        for symptom, score in scored[:5]:
            display = symptom.replace("_", " ").title()
            severity = SEVERITY_WEIGHTS.get(symptom, 3)
            if severity >= 7:
                factors.append(f"{display} (critical severity)")
            elif severity >= 5:
                factors.append(f"{display} (high severity)")
            else:
                factors.append(display)

        return factors

    # ── ML-based severity ────────────────────────────────────

    @staticmethod
    def _ml_severity(confidence: float) -> SeverityLevel:
        """Derive severity tier from model confidence."""
        if confidence >= 85:
            return SeverityLevel.MODERATE
        elif confidence >= 70:
            return SeverityLevel.LOW
        else:
            return SeverityLevel.LOW

    # ── Risk score computation ───────────────────────────────

    @staticmethod
    def _compute_risk_score(
        confidence: float,
        rule_alerts: list[RuleAlert],
        matched_symptoms: list[str],
    ) -> float:
        """
        Compute a composite risk score (0–100) incorporating
        model confidence, rule alerts, and symptom severity.
        """
        # Base from severity-weighted symptom count
        total_severity = sum(
            SEVERITY_WEIGHTS.get(s, 3) for s in matched_symptoms
        )
        max_severity = len(matched_symptoms) * 7
        symptom_component = (
            (total_severity / max_severity * 40)
            if max_severity > 0 else 0
        )

        # Rule component
        severity_scores = {
            SeverityLevel.EMERGENCY: 30,
            SeverityLevel.HIGH: 20,
            SeverityLevel.MODERATE: 10,
            SeverityLevel.LOW: 0,
        }
        rule_component = sum(
            severity_scores.get(a.severity, 0)
            for a in rule_alerts
        )
        rule_component = min(rule_component, 40)

        # Confidence component (higher conf → higher risk certainty)
        conf_component = confidence * 0.2

        return min(
            symptom_component + rule_component + conf_component,
            100.0,
        )

    # ── Fallback (no model) ──────────────────────────────────

    def _fallback_assess(
        self,
        matched_symptoms: list[str],
        rule_alerts: list[RuleAlert],
        rule_severity: SeverityLevel,
    ) -> RiskAssessmentResult:
        """
        Rule-based fallback when the ML model is not available.
        Provides conservative risk assessment based on symptom
        severity and safety rules alone.
        """
        log.info("Using rule-based fallback for risk assessment")

        # Simple symptom-based risk label
        if not matched_symptoms:
            primary_risk = "Insufficient data for assessment"
            conf = 0.0
        else:
            # Use the highest severity symptoms to guess risk area
            top_symptoms = sorted(
                matched_symptoms,
                key=lambda s: SEVERITY_WEIGHTS.get(s, 3),
                reverse=True,
            )
            primary_risk = self._infer_risk_category(top_symptoms)
            conf = min(55 + len(matched_symptoms) * 4, 72)

        contributing_factors = [
            s.replace("_", " ").title()
            for s in matched_symptoms[:5]
        ]

        return RiskAssessmentResult(
            primary_risk=primary_risk,
            confidence=float(conf),
            uncertainty=UncertaintyLevel.HIGH,
            severity=rule_severity,
            risk_score=self._compute_risk_score(
                conf, rule_alerts, matched_symptoms,
            ),
            contributing_factors=contributing_factors,
            matched_symptoms=matched_symptoms,
            unmatched_symptoms=[],
            rule_alerts=[a.to_dict() for a in rule_alerts],
            model_used="Rule-based Fallback",
        )

    @staticmethod
    def _infer_risk_category(symptoms: list[str]) -> str:
        """Infer a broad risk category from symptom patterns."""
        symptom_set = set(symptoms)
        categories = {
            "Respiratory risk": {
                "cough", "breathlessness", "phlegm", "congestion",
                "blood_in_sputum",
            },
            "Cardiac risk": {
                "chest_pain", "fast_heart_rate", "palpitations",
                "swollen_legs",
            },
            "Infection risk": {
                "high_fever", "chills", "shivering", "sweating",
                "swelled_lymph_nodes",
            },
            "Digestive risk": {
                "nausea", "vomiting", "diarrhoea", "stomach_pain",
                "abdominal_pain",
            },
            "Neurological risk": {
                "dizziness", "loss_of_balance", "slurred_speech",
                "spinning_movements",
            },
        }
        best_cat, best_overlap = "General health risk", 0
        for cat_name, cat_symptoms in categories.items():
            overlap = len(symptom_set & cat_symptoms)
            if overlap > best_overlap:
                best_overlap = overlap
                best_cat = cat_name

        return best_cat
