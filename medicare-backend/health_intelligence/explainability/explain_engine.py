"""
health_intelligence/explainability/explain_engine.py
───────────────────────────────────────────────
Generates human-readable, explainable health reasoning
from the intelligence pipeline's outputs.

Each explanation is a plain-English statement that connects
a specific data signal (symptom, vital, wearable metric) to
the risk assessment outcome.

Examples:
  "Elevated heart rate contributed to cardiac risk profiling."
  "Poor sleep trend over the past week increased fatigue risk."
  "Low SpO2 reading triggered an emergency safety alert."
"""

import logging
from typing import Optional

from health_intelligence.schemas.health_profile import (
    HealthProfile,
    SeverityLevel,
    WearableLog,
)
from health_intelligence.rules.medical_rules import RuleAlert
from health_intelligence.feature_engineering.feature_generator import (
    SEVERITY_WEIGHTS,
)

log = logging.getLogger(__name__)


class ExplainEngine:
    """
    Produces structured, human-readable explanations from
    the health intelligence pipeline's intermediate results.
    """

    def generate_explanations(
        self,
        matched_symptoms: list[str],
        rule_alerts: list[RuleAlert],
        profile: HealthProfile,
        primary_risk: str,
        confidence: float,
        wearable_features: Optional[dict] = None,
    ) -> list[str]:
        """
        Build a comprehensive list of explanation strings.

        Sources of reasoning:
          1. Symptom severity contributions
          2. Medical rule alerts
          3. Vital sign observations
          4. Wearable metric insights
          5. Lifestyle context
        """
        explanations: list[str] = []

        # ── 1. Symptom-based reasoning ───────────────────────
        explanations.extend(
            self._explain_symptoms(matched_symptoms)
        )

        # ── 2. Rule-based reasoning ──────────────────────────
        explanations.extend(
            self._explain_rules(rule_alerts)
        )

        # ── 3. Vital sign reasoning ──────────────────────────
        explanations.extend(
            self._explain_vitals(profile)
        )

        # ── 4. Wearable reasoning ────────────────────────────
        explanations.extend(
            self._explain_wearables(profile, wearable_features)
        )

        # ── 5. Lifestyle reasoning ───────────────────────────
        explanations.extend(
            self._explain_lifestyle(profile, primary_risk)
        )

        return explanations

    def generate_summary(
        self,
        primary_risk: str,
        confidence: float,
        severity: SeverityLevel,
        matched_symptoms: list[str],
        rule_alerts: list[RuleAlert],
    ) -> str:
        """
        Generate a single plain-English summary of the
        health risk assessment.
        """
        # Confidence descriptor
        conf_label = (
            "high confidence"     if confidence >= 80 else
            "moderate confidence" if confidence >= 60 else
            "limited confidence"  if confidence >= 40 else
            "low confidence"
        )

        # Top symptoms
        top_symptoms = self._get_top_symptoms(matched_symptoms, n=3)
        symptom_str = ", ".join(
            s.replace("_", " ").title() for s in top_symptoms
        ) or "the reported symptoms"

        # Build summary
        summary = (
            f"Health risk assessment identified {primary_risk} with "
            f"{conf_label} ({confidence:.0f}%). "
            f"Key indicators: {symptom_str}."
        )

        # Add severity context
        if severity == SeverityLevel.EMERGENCY:
            summary += (
                " ⚠️ EMERGENCY: Critical safety rules were triggered. "
                "Seek immediate medical attention."
            )
        elif severity == SeverityLevel.HIGH:
            summary += (
                " Important: Multiple high-risk indicators detected. "
                "Please consult a healthcare professional soon."
            )

        # Add rule context
        emergency_rules = [
            a for a in rule_alerts
            if a.severity == SeverityLevel.EMERGENCY
        ]
        if emergency_rules:
            summary += (
                f" {len(emergency_rules)} emergency rule(s) triggered."
            )

        return summary

    # ── Symptom explanations ─────────────────────────────────

    def _explain_symptoms(self, matched_symptoms: list[str]) -> list[str]:
        explanations: list[str] = []

        # High-severity symptoms
        for symptom in matched_symptoms:
            weight = SEVERITY_WEIGHTS.get(symptom, 3)
            display = symptom.replace("_", " ").title()

            if weight >= 7:
                explanations.append(
                    f"{display} is a critical-severity indicator "
                    "and strongly influenced the risk assessment."
                )
            elif weight >= 5:
                explanations.append(
                    f"{display} is a high-severity symptom that "
                    "contributed significantly to the risk profile."
                )

        # Symptom count insight
        count = len(matched_symptoms)
        if count >= 7:
            explanations.append(
                f"A large number of symptoms ({count}) were reported, "
                "increasing overall pattern confidence."
            )
        elif count <= 2:
            explanations.append(
                f"Only {count} symptom(s) reported — assessment confidence "
                "may be limited. Providing more details can improve accuracy."
            )

        return explanations

    # ── Rule-based explanations ──────────────────────────────

    def _explain_rules(self, rule_alerts: list[RuleAlert]) -> list[str]:
        explanations: list[str] = []
        for alert in rule_alerts:
            factors_str = ", ".join(alert.contributing_factors[:3])
            explanations.append(
                f"Safety rule '{alert.category.replace('_', ' ')}' triggered: "
                f"{alert.message} (factors: {factors_str})"
            )
        return explanations

    # ── Vital sign explanations ──────────────────────────────

    def _explain_vitals(self, profile: HealthProfile) -> list[str]:
        explanations: list[str] = []
        v = profile.vitals
        if not v:
            return explanations

        if v.heart_rate_bpm is not None:
            if v.heart_rate_bpm > 100:
                explanations.append(
                    f"Elevated resting heart rate ({v.heart_rate_bpm} bpm) "
                    "contributed to cardiac risk profiling."
                )
            elif v.heart_rate_bpm < 50:
                explanations.append(
                    f"Unusually low heart rate ({v.heart_rate_bpm} bpm) detected."
                )

        if v.spo2_percent is not None and v.spo2_percent < 95:
            explanations.append(
                f"Low SpO2 reading ({v.spo2_percent}%) "
                "triggered respiratory concern."
            )

        if v.temperature_celsius is not None and v.temperature_celsius > 38.0:
            explanations.append(
                f"Elevated body temperature ({v.temperature_celsius}°C) "
                "suggests possible fever or infection."
            )

        if v.systolic_bp is not None and v.systolic_bp > 140:
            explanations.append(
                f"High systolic blood pressure ({v.systolic_bp} mmHg) "
                "factored into cardiovascular risk."
            )

        if v.blood_glucose_mgdl is not None:
            if v.blood_glucose_mgdl > 200:
                explanations.append(
                    f"Elevated blood glucose ({v.blood_glucose_mgdl} mg/dL) "
                    "contributed to metabolic risk assessment."
                )
            elif v.blood_glucose_mgdl < 70:
                explanations.append(
                    f"Low blood glucose ({v.blood_glucose_mgdl} mg/dL) "
                    "indicates possible hypoglycemia risk."
                )

        return explanations

    # ── Wearable explanations ────────────────────────────────

    def _explain_wearables(
        self,
        profile: HealthProfile,
        wearable_features: Optional[dict] = None,
    ) -> list[str]:
        explanations: list[str] = []
        latest = profile.get_latest_wearable()

        if not latest:
            return explanations

        if latest.sleep_hours is not None and latest.sleep_hours < 5:
            explanations.append(
                f"Poor sleep ({latest.sleep_hours:.1f} hrs) detected — "
                "insufficient sleep increases fatigue and health risk."
            )

        if latest.stress_level is not None and latest.stress_level > 70:
            explanations.append(
                f"High stress level ({latest.stress_level}/100) from "
                "wearable data factored into risk assessment."
            )

        if latest.steps is not None and latest.steps < 2000:
            explanations.append(
                f"Low daily activity ({latest.steps} steps) may "
                "contribute to deconditioning risk."
            )

        # Trend-based reasoning
        if wearable_features:
            hr_avg = wearable_features.get("wearable_hr_avg_7d")
            if hr_avg and hr_avg > 90:
                explanations.append(
                    f"7-day average heart rate is elevated ({hr_avg:.0f} bpm), "
                    "suggesting sustained cardiovascular stress."
                )

            spo2_min = wearable_features.get("wearable_spo2_min_7d")
            if spo2_min and spo2_min < 93:
                explanations.append(
                    f"Minimum SpO2 over the past week dropped to {spo2_min:.0f}%, "
                    "indicating intermittent oxygen desaturation."
                )

            sleep_avg = wearable_features.get("wearable_sleep_avg_7d")
            if sleep_avg and sleep_avg < 5:
                explanations.append(
                    f"Average sleep over the past week is only {sleep_avg:.1f} hrs — "
                    "chronic sleep deficit increases multiple health risks."
                )

        return explanations

    # ── Lifestyle explanations ───────────────────────────────

    def _explain_lifestyle(
        self,
        profile: HealthProfile,
        primary_risk: str,
    ) -> list[str]:
        explanations: list[str] = []
        ls = profile.lifestyle
        if not ls:
            return explanations

        risk_lower = primary_risk.lower()

        if ls.smoker:
            explanations.append(
                "Smoking status is an established risk factor "
                "for respiratory and cardiovascular conditions."
            )
        if ls.drinker:
            explanations.append(
                "Regular alcohol consumption may affect liver "
                "function and overall health risk."
            )
        if ls.diabetic and any(
            kw in risk_lower for kw in ["diabetes", "metabolic", "glucose"]
        ):
            explanations.append(
                "Known diabetic history significantly influences "
                "the metabolic risk profile."
            )
        if ls.hypertensive and any(
            kw in risk_lower for kw in ["cardiac", "heart", "hypertension"]
        ):
            explanations.append(
                "Pre-existing hypertension elevates "
                "cardiovascular risk assessment."
            )

        return explanations

    # ── Helpers ──────────────────────────────────────────────

    @staticmethod
    def _get_top_symptoms(symptoms: list[str], n: int = 3) -> list[str]:
        """Return the top-N symptoms sorted by severity weight."""
        scored = [
            (s, SEVERITY_WEIGHTS.get(s, 3)) for s in symptoms
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [s for s, _ in scored[:n]]
