"""
severity_classifier.py
──────────────────────
Dynamically classifies overall patient severity using multi-signal fusion.

Inputs:
  - Symptom severity scores
  - Wearable physiological data
  - Deterioration velocity
  - Hypothesis severity priorities

Output:
  - severity_level: minimal | mild | moderate | significant | severe | critical
  - severity_score: 0.0 - 1.0
"""

from typing import Any, Dict, List

MAX_SEVERITY = 0.92  # Never declare absolute certainty


class SeverityClassifier:

    # Symptom keywords that inherently carry high severity weight
    HIGH_SEVERITY_SYMPTOMS = {
        "chest_pain", "difficulty_breathing", "confusion", "severe_headache",
        "loss_of_consciousness", "coughing_blood", "severe_abdominal_pain",
        "sudden_weakness", "vision_loss", "slurred_speech",
    }

    WEARABLE_THRESHOLDS = {
        "spo2_critical": 90,
        "spo2_concerning": 93,
        "hr_high": 120,
        "hr_low": 45,
        "temp_high": 39.5,
    }

    def classify(
        self,
        active_symptoms: List[str],
        severity_map: Dict[str, float] | None = None,
        wearable: Dict[str, Any] | None = None,
        deterioration_score: float = 0.0,
        hypothesis_severity: float = 1.0,
    ) -> Dict[str, Any]:
        severity_map = severity_map or {}
        wearable = wearable or {}

        # 1. Symptom-based severity
        symptom_score = self._symptom_severity(active_symptoms, severity_map)

        # 2. Wearable-based severity
        wearable_score = self._wearable_severity(wearable)

        # 3. Composite
        raw = (
            symptom_score * 0.35
            + wearable_score * 0.25
            + deterioration_score * 0.25
            + min(1.0, hypothesis_severity / 3.0) * 0.15
        )
        score = min(MAX_SEVERITY, max(0, raw))
        level = self._level(score)

        return {
            "severity_score": round(score, 3),
            "severity_level": level,
            "symptom_contribution": round(symptom_score, 3),
            "wearable_contribution": round(wearable_score, 3),
            "deterioration_contribution": round(deterioration_score, 3),
            "explanation": self._explain(level, score),
        }

    # ── internals ────────────────────────────────

    def _symptom_severity(self, symptoms: List[str], sev_map: Dict[str, float]) -> float:
        if not symptoms:
            return 0.0
        scores = []
        for s in symptoms:
            base = sev_map.get(s, 0.3)
            if s in self.HIGH_SEVERITY_SYMPTOMS:
                base = max(base, 0.7)
            scores.append(base)
        return min(1.0, sum(sorted(scores, reverse=True)[:5]) / 3.0)

    def _wearable_severity(self, w: Dict[str, Any]) -> float:
        score = 0.0
        spo2 = w.get("spo2")
        if spo2 is not None:
            if spo2 < self.WEARABLE_THRESHOLDS["spo2_critical"]:
                score += 0.6
            elif spo2 < self.WEARABLE_THRESHOLDS["spo2_concerning"]:
                score += 0.3
        hr = w.get("heart_rate")
        if hr is not None:
            if hr > self.WEARABLE_THRESHOLDS["hr_high"] or hr < self.WEARABLE_THRESHOLDS["hr_low"]:
                score += 0.3
        temp = w.get("temperature")
        if temp is not None:
            if temp > self.WEARABLE_THRESHOLDS["temp_high"]:
                score += 0.25
        return min(1.0, score)

    @staticmethod
    def _level(score: float) -> str:
        if score < 0.1:
            return "minimal"
        if score < 0.25:
            return "mild"
        if score < 0.45:
            return "moderate"
        if score < 0.65:
            return "significant"
        if score < 0.8:
            return "severe"
        return "critical"

    @staticmethod
    def _explain(level: str, score: float) -> str:
        labels = {
            "minimal": "Clinical severity appears minimal based on current information.",
            "mild": "Mild clinical concern. Self-monitoring is likely appropriate.",
            "moderate": "Moderate clinical concern. Consider consulting a healthcare provider.",
            "significant": "Significant clinical concern warrants timely professional evaluation.",
            "severe": "Severe clinical indicators are present. Prompt medical attention is recommended.",
            "critical": "Critical indicators detected. Immediate medical evaluation is strongly advised.",
        }
        return labels.get(level, "Severity could not be determined.")
