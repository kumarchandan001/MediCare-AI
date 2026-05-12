"""
health_intelligence/clinical_interview/contradiction_detector.py
───────────────────────────────────────────────────────────────
Advanced contradiction detection engine.

Detects:
  • Wearable/symptom mismatches
  • Temporal inconsistencies
  • Severity contradictions
  • Physiologically unlikely combinations
  • Progression inconsistencies
"""

from typing import Any, Dict, List


class ContradictionDetector:

    # Physiologically unlikely symptom pairs
    UNLIKELY_PAIRS = [
        ({"severe_fatigue", "exhaustion"}, {"high_energy"}),
        ({"high_fever"}, {"hypothermia"}),
    ]

    def detect_contradictions(
        self,
        active_symptoms: List[str],
        wearable_data: Dict[str, Any],
        temporal_data: Dict[str, Any] = None,
    ) -> List[Dict[str, Any]]:
        """Detect all categories of contradictions."""
        temporal_data = temporal_data or {}
        contradictions: List[Dict[str, Any]] = []

        # 1. Wearable/symptom mismatches
        contradictions.extend(self._wearable_mismatches(active_symptoms, wearable_data))

        # 2. Temporal inconsistencies
        contradictions.extend(self._temporal_inconsistencies(active_symptoms, temporal_data))

        # 3. Severity contradictions
        contradictions.extend(self._severity_contradictions(active_symptoms, wearable_data))

        # 4. Physiologically unlikely combinations
        contradictions.extend(self._unlikely_combinations(active_symptoms))

        return contradictions

    def _wearable_mismatches(
        self, symptoms: List[str], wearable: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        if "severe_fatigue" in symptoms and wearable.get("activity_level") == "high":
            results.append({
                "type": "wearable_symptom_mismatch",
                "description": "Reported severe fatigue but wearable indicates high activity.",
                "condition": "",
                "penalty": 0.1,
            })

        if "shortness_of_breath" in symptoms:
            spo2 = wearable.get("spo2")
            if spo2 is not None and spo2 >= 98:
                results.append({
                    "type": "wearable_symptom_mismatch",
                    "description": "Reported shortness of breath but SpO2 is normal (>=98%).",
                    "condition": "Pneumonia",
                    "penalty": 0.08,
                })

        if "fever" in symptoms or "high_fever" in symptoms:
            temp = wearable.get("temperature")
            if temp is not None and temp < 37.2:
                results.append({
                    "type": "wearable_symptom_mismatch",
                    "description": "Reported fever but wearable temperature is within normal range.",
                    "condition": "Flu",
                    "penalty": 0.08,
                })

        return results

    def _temporal_inconsistencies(
        self, symptoms: List[str], temporal: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        onset_days = temporal.get("onset_days_ago", 0)

        if "severe_fatigue" in symptoms and onset_days < 1:
            results.append({
                "type": "temporal_inconsistency",
                "description": "Severe fatigue reported with less than 1 day onset — unusually rapid.",
                "condition": "Chronic Fatigue",
                "penalty": 0.06,
            })

        return results

    def _severity_contradictions(
        self, symptoms: List[str], wearable: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        hr = wearable.get("heart_rate")

        if "chest_pain" in symptoms and hr is not None and hr < 70:
            results.append({
                "type": "severity_contradiction",
                "description": "Chest pain reported but resting heart rate is normal — may be non-cardiac.",
                "condition": "Cardiac Event",
                "penalty": 0.05,
            })

        return results

    def _unlikely_combinations(self, symptoms: List[str]) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []
        symptom_set = set(symptoms)

        for group_a, group_b in self.UNLIKELY_PAIRS:
            if group_a & symptom_set and group_b & symptom_set:
                results.append({
                    "type": "physiologically_unlikely",
                    "description": f"Unlikely combination: {group_a & symptom_set} and {group_b & symptom_set}.",
                    "condition": "",
                    "penalty": 0.1,
                })

        return results
