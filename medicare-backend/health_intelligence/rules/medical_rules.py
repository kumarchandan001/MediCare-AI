"""
health_intelligence/rules/medical_rules.py
───────────────────────────────────────────────
Medical Safety Rule Engine — evaluates the HealthProfile
BEFORE any ML model runs, catching emergencies and
high-risk patterns that require immediate attention.

Severity tiers:
  LOW       → routine monitoring
  MODERATE  → schedule a consultation
  HIGH      → see a doctor soon
  EMERGENCY → seek immediate medical help

This is NOT a diagnostic system. It performs preventive
risk flagging based on well-established clinical thresholds.
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.schemas.health_profile import (
    HealthProfile,
    SeverityLevel,
    VitalSigns,
    WearableLog,
)

log = logging.getLogger(__name__)


# ── Rule result structure ────────────────────────────────────

class RuleAlert:
    """A single triggered safety rule."""

    def __init__(
        self,
        rule_id: str,
        category: str,
        severity: SeverityLevel,
        message: str,
        contributing_factors: list[str],
    ):
        self.rule_id = rule_id
        self.category = category
        self.severity = severity
        self.message = message
        self.contributing_factors = contributing_factors
        self.triggered_at = datetime.utcnow()

    def to_dict(self) -> dict:
        return {
            "rule_id": self.rule_id,
            "category": self.category,
            "severity": self.severity.value,
            "message": self.message,
            "contributing_factors": self.contributing_factors,
            "triggered_at": self.triggered_at.isoformat(),
        }


# ── Emergency symptom sets ───────────────────────────────────

EMERGENCY_SYMPTOMS: set[str] = {
    "chest_pain", "coma", "slurred_speech", "weakness_of_one_body_side",
    "acute_liver_failure", "stomach_bleeding",
}

HIGH_RISK_SYMPTOMS: set[str] = {
    "high_fever", "breathlessness", "blood_in_sputum", "bloody_stool",
    "altered_sensorium", "swelling_of_stomach", "spinning_movements",
    "loss_of_balance",
}

INFECTION_MARKERS: set[str] = {
    "high_fever", "chills", "shivering", "sweating", "fatigue",
    "swelled_lymph_nodes", "malaise", "toxic_look_(typhos)",
    "patches_in_throat",
}

FATIGUE_CLUSTER: set[str] = {
    "fatigue", "lethargy", "weakness_in_limbs", "muscle_weakness",
    "lack_of_concentration", "restlessness", "depression",
    "mood_swings", "malaise",
}

CARDIAC_MARKERS: set[str] = {
    "chest_pain", "fast_heart_rate", "palpitations", "breathlessness",
    "swollen_legs", "swollen_blood_vessels", "cold_hands_and_feets",
    "sweating", "dizziness",
}


class MedicalRuleEngine:
    """
    Evaluates a HealthProfile against medical safety rules.
    Returns a list of RuleAlerts ordered by severity (highest first).
    """

    def evaluate(self, profile: HealthProfile) -> list[RuleAlert]:
        """
        Run all safety rules against the profile.
        Returns alerts sorted by severity (emergency first).
        """
        alerts: list[RuleAlert] = []

        symptom_names = set(profile.get_current_symptom_names())

        # ── Rule checks ──────────────────────────────────────
        alerts.extend(self._check_emergency_symptoms(symptom_names))
        alerts.extend(self._check_vital_emergencies(profile.vitals))
        alerts.extend(self._check_wearable_anomalies(profile.get_latest_wearable()))
        alerts.extend(self._check_infection_risk(symptom_names))
        alerts.extend(self._check_fatigue_risk(symptom_names))
        alerts.extend(self._check_cardiac_risk(symptom_names, profile.vitals))
        alerts.extend(self._check_respiratory_risk(symptom_names, profile.vitals))
        alerts.extend(self._check_combined_risk(symptom_names, profile))

        # Sort: EMERGENCY > HIGH > MODERATE > LOW
        severity_order = {
            SeverityLevel.EMERGENCY: 0,
            SeverityLevel.HIGH: 1,
            SeverityLevel.MODERATE: 2,
            SeverityLevel.LOW: 3,
        }
        alerts.sort(key=lambda a: severity_order.get(a.severity, 4))

        return alerts

    def get_max_severity(self, alerts: list[RuleAlert]) -> SeverityLevel:
        """Return the highest severity among all triggered alerts."""
        if not alerts:
            return SeverityLevel.LOW
        for level in [SeverityLevel.EMERGENCY, SeverityLevel.HIGH,
                      SeverityLevel.MODERATE, SeverityLevel.LOW]:
            if any(a.severity == level for a in alerts):
                return level
        return SeverityLevel.LOW

    # ── Emergency symptom rules ──────────────────────────────

    def _check_emergency_symptoms(self, symptoms: set[str]) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        triggered = symptoms & EMERGENCY_SYMPTOMS
        if triggered:
            alerts.append(RuleAlert(
                rule_id="RULE_EMERGENCY_SYMPTOM",
                category="emergency_detection",
                severity=SeverityLevel.EMERGENCY,
                message=(
                    "Critical symptoms detected that may require "
                    "immediate medical attention. Please consult a "
                    "healthcare professional urgently."
                ),
                contributing_factors=[
                    s.replace("_", " ").title() for s in triggered
                ],
            ))
        return alerts

    # ── Vital sign emergencies ───────────────────────────────

    def _check_vital_emergencies(
        self, vitals: Optional[VitalSigns],
    ) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        if not vitals:
            return alerts

        factors: list[str] = []

        # SpO2 critical
        if vitals.spo2_percent is not None and vitals.spo2_percent < 90:
            factors.append(
                f"Critically low SpO2 ({vitals.spo2_percent}%)"
            )

        # Heart rate extreme
        if vitals.heart_rate_bpm is not None:
            if vitals.heart_rate_bpm > 150:
                factors.append(
                    f"Dangerously high heart rate ({vitals.heart_rate_bpm} bpm)"
                )
            elif vitals.heart_rate_bpm < 40:
                factors.append(
                    f"Dangerously low heart rate ({vitals.heart_rate_bpm} bpm)"
                )

        # Temperature extreme
        if vitals.temperature_celsius is not None:
            if vitals.temperature_celsius >= 40.0:
                factors.append(
                    f"Very high fever ({vitals.temperature_celsius}°C)"
                )
            elif vitals.temperature_celsius < 35.0:
                factors.append(
                    f"Hypothermia risk ({vitals.temperature_celsius}°C)"
                )

        # Blood pressure extreme
        if vitals.systolic_bp is not None and vitals.systolic_bp >= 180:
            factors.append(
                f"Hypertensive crisis ({vitals.systolic_bp} mmHg systolic)"
            )

        # Blood glucose extreme
        if vitals.blood_glucose_mgdl is not None:
            if vitals.blood_glucose_mgdl < 54:
                factors.append(
                    f"Severe hypoglycemia ({vitals.blood_glucose_mgdl} mg/dL)"
                )
            elif vitals.blood_glucose_mgdl > 400:
                factors.append(
                    f"Severe hyperglycemia ({vitals.blood_glucose_mgdl} mg/dL)"
                )

        if factors:
            alerts.append(RuleAlert(
                rule_id="RULE_VITAL_EMERGENCY",
                category="abnormal_vitals",
                severity=SeverityLevel.EMERGENCY,
                message=(
                    "One or more vital signs are at critically abnormal "
                    "levels. Seek immediate medical assistance."
                ),
                contributing_factors=factors,
            ))

        # ── Moderate vital abnormalities ─────────────────────
        moderate_factors: list[str] = []

        if vitals.spo2_percent is not None and 90 <= vitals.spo2_percent < 95:
            moderate_factors.append(
                f"Low SpO2 ({vitals.spo2_percent}%) — below normal range"
            )
        if vitals.heart_rate_bpm is not None:
            if 100 < vitals.heart_rate_bpm <= 150:
                moderate_factors.append(
                    f"Elevated resting heart rate ({vitals.heart_rate_bpm} bpm)"
                )
            elif 40 <= vitals.heart_rate_bpm < 50:
                moderate_factors.append(
                    f"Low resting heart rate ({vitals.heart_rate_bpm} bpm)"
                )
        if vitals.temperature_celsius is not None:
            if 38.5 <= vitals.temperature_celsius < 40.0:
                moderate_factors.append(
                    f"Elevated temperature ({vitals.temperature_celsius}°C)"
                )
        if vitals.systolic_bp is not None:
            if 140 <= vitals.systolic_bp < 180:
                moderate_factors.append(
                    f"High blood pressure ({vitals.systolic_bp} mmHg systolic)"
                )

        if moderate_factors:
            alerts.append(RuleAlert(
                rule_id="RULE_VITAL_ABNORMAL",
                category="abnormal_vitals",
                severity=SeverityLevel.MODERATE,
                message=(
                    "Some vital signs are outside normal ranges. "
                    "Consider scheduling a health check-up."
                ),
                contributing_factors=moderate_factors,
            ))

        return alerts

    # ── Wearable anomaly detection ───────────────────────────

    def _check_wearable_anomalies(
        self, wearable: Optional[WearableLog],
    ) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        if not wearable:
            return alerts

        factors: list[str] = []

        if wearable.spo2_percent is not None and wearable.spo2_percent < 92:
            factors.append(
                f"Wearable SpO2 reading low ({wearable.spo2_percent}%)"
            )

        if wearable.heart_rate_bpm is not None and wearable.heart_rate_bpm > 120:
            factors.append(
                f"Wearable detected elevated heart rate ({wearable.heart_rate_bpm} bpm)"
            )

        if wearable.sleep_hours is not None and wearable.sleep_hours < 3.0:
            factors.append(
                f"Very poor sleep ({wearable.sleep_hours} hrs) — "
                "may increase health risk"
            )

        if wearable.stress_level is not None and wearable.stress_level > 80:
            factors.append(
                f"High stress level detected ({wearable.stress_level}/100)"
            )

        if factors:
            severity = (
                SeverityLevel.HIGH
                if any("SpO2" in f for f in factors)
                else SeverityLevel.MODERATE
            )
            alerts.append(RuleAlert(
                rule_id="RULE_WEARABLE_ANOMALY",
                category="wearable_anomaly",
                severity=severity,
                message=(
                    "Wearable data indicates potential health anomalies. "
                    "Monitor trends and consult if persistent."
                ),
                contributing_factors=factors,
            ))

        return alerts

    # ── Infection risk ───────────────────────────────────────

    def _check_infection_risk(self, symptoms: set[str]) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        infection_hits = symptoms & INFECTION_MARKERS
        if len(infection_hits) >= 3:
            severity = (
                SeverityLevel.HIGH if len(infection_hits) >= 5
                else SeverityLevel.MODERATE
            )
            alerts.append(RuleAlert(
                rule_id="RULE_INFECTION_RISK",
                category="infection_risk",
                severity=severity,
                message=(
                    "Multiple symptoms suggest possible infection. "
                    "A healthcare professional can help determine the cause."
                ),
                contributing_factors=[
                    s.replace("_", " ").title() for s in infection_hits
                ],
            ))
        return alerts

    # ── Fatigue risk ─────────────────────────────────────────

    def _check_fatigue_risk(self, symptoms: set[str]) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        fatigue_hits = symptoms & FATIGUE_CLUSTER
        if len(fatigue_hits) >= 3:
            alerts.append(RuleAlert(
                rule_id="RULE_FATIGUE_RISK",
                category="fatigue_risk",
                severity=SeverityLevel.MODERATE,
                message=(
                    "A cluster of fatigue-related symptoms has been detected. "
                    "Poor sleep, stress, or underlying conditions may contribute."
                ),
                contributing_factors=[
                    s.replace("_", " ").title() for s in fatigue_hits
                ],
            ))
        return alerts

    # ── Cardiac risk ─────────────────────────────────────────

    def _check_cardiac_risk(
        self,
        symptoms: set[str],
        vitals: Optional[VitalSigns],
    ) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        cardiac_hits = symptoms & CARDIAC_MARKERS
        factors = [s.replace("_", " ").title() for s in cardiac_hits]

        # Amplify if vitals confirm
        if vitals:
            if vitals.heart_rate_bpm and vitals.heart_rate_bpm > 100:
                factors.append(f"Elevated heart rate ({vitals.heart_rate_bpm} bpm)")
            if vitals.systolic_bp and vitals.systolic_bp > 140:
                factors.append(f"High blood pressure ({vitals.systolic_bp} mmHg)")

        if len(factors) >= 3:
            severity = (
                SeverityLevel.HIGH if "chest_pain" in symptoms
                else SeverityLevel.MODERATE
            )
            alerts.append(RuleAlert(
                rule_id="RULE_CARDIAC_RISK",
                category="cardiac_risk",
                severity=severity,
                message=(
                    "Several indicators point toward cardiac stress. "
                    "Consider a cardiovascular evaluation."
                ),
                contributing_factors=factors,
            ))
        return alerts

    # ── Respiratory risk ─────────────────────────────────────

    def _check_respiratory_risk(
        self,
        symptoms: set[str],
        vitals: Optional[VitalSigns],
    ) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        resp_symptoms = {
            "breathlessness", "cough", "blood_in_sputum", "phlegm",
            "congestion", "mucoid_sputum", "rusty_sputum",
        }
        resp_hits = symptoms & resp_symptoms
        factors = [s.replace("_", " ").title() for s in resp_hits]

        if vitals and vitals.spo2_percent and vitals.spo2_percent < 94:
            factors.append(f"Low SpO2 ({vitals.spo2_percent}%)")

        if vitals and vitals.respiratory_rate and vitals.respiratory_rate > 25:
            factors.append(
                f"Elevated respiratory rate ({vitals.respiratory_rate}/min)"
            )

        if len(factors) >= 3:
            alerts.append(RuleAlert(
                rule_id="RULE_RESPIRATORY_RISK",
                category="respiratory_risk",
                severity=SeverityLevel.HIGH,
                message=(
                    "Respiratory indicators suggest possible airway compromise. "
                    "Please seek medical assessment."
                ),
                contributing_factors=factors,
            ))
        return alerts

    # ── Combined risk (symptoms + lifestyle + vitals) ────────

    def _check_combined_risk(
        self,
        symptoms: set[str],
        profile: HealthProfile,
    ) -> list[RuleAlert]:
        alerts: list[RuleAlert] = []
        factors: list[str] = []

        # Diabetic with sugar-related symptoms
        if profile.lifestyle and profile.lifestyle.diabetic:
            sugar_symptoms = symptoms & {
                "excessive_hunger", "polyuria", "fatigue",
                "blurred_and_distorted_vision", "weight_loss",
                "irregular_sugar_level",
            }
            if sugar_symptoms:
                factors.extend([
                    "Known diabetic status",
                    *(s.replace("_", " ").title() for s in sugar_symptoms),
                ])

        # Hypertensive with cardiac symptoms
        if profile.lifestyle and profile.lifestyle.hypertensive:
            if symptoms & {"chest_pain", "headache", "dizziness"}:
                factors.append("Known hypertension with cardiac-adjacent symptoms")

        # Smoker with respiratory symptoms
        if profile.lifestyle and profile.lifestyle.smoker:
            if symptoms & {"cough", "breathlessness", "blood_in_sputum", "phlegm"}:
                factors.append("Active smoker with respiratory symptoms")

        if factors:
            alerts.append(RuleAlert(
                rule_id="RULE_COMBINED_RISK",
                category="combined_lifestyle_risk",
                severity=SeverityLevel.MODERATE,
                message=(
                    "Your reported symptoms combined with lifestyle "
                    "or medical history factors may elevate your risk profile."
                ),
                contributing_factors=factors,
            ))

        return alerts
