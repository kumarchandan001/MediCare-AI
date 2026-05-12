"""
health_intelligence/differential_reasoning/temporal_differential_engine.py
──────────────────────────────────────────────────────────────────────────
Handles time-aware clinical reasoning:
  • symptom sequence reasoning
  • progression compatibility
  • timeline-based exclusion
  • acute vs chronic differentiation
  • recurrence weighting
"""

from typing import Any, Dict, List


class TemporalDifferentialEngine:

    # Conditions by expected onset type
    ACUTE_CONDITIONS = {
        "Flu", "Cardiac Event", "Food Poisoning", "Gastroenteritis",
        "Pneumonia", "COVID-19",
    }
    CHRONIC_CONDITIONS = {
        "Chronic Fatigue", "Fibromyalgia", "Depression", "Asthma",
    }

    # Expected progression speeds
    RAPID_PROGRESSION = {"Cardiac Event", "Pneumonia", "Food Poisoning"}
    SLOW_PROGRESSION = {"Chronic Fatigue", "Depression", "Fibromyalgia"}

    def analyze(
        self,
        active_symptoms: List[str],
        temporal_data: Dict[str, Any],
    ) -> Dict[str, float]:
        """
        Return per-condition confidence adjustments based on temporal data.

        temporal_data expected keys:
          onset_type: "acute" | "chronic" | "unknown"
          onset_days_ago: int
          progression_speed: "rapid" | "gradual" | "stable"
          is_recurring: bool
        """
        adjustments: Dict[str, float] = {}

        onset_type = temporal_data.get("onset_type", "unknown")
        progression = temporal_data.get("progression_speed", "stable")
        onset_days = temporal_data.get("onset_days_ago", 0)
        is_recurring = temporal_data.get("is_recurring", False)

        if onset_type == "unknown":
            return adjustments

        # Acute onset boosts acute conditions, penalises chronic
        if onset_type == "acute":
            for cond in self.ACUTE_CONDITIONS:
                adjustments[cond] = adjustments.get(cond, 0) + 0.05
            for cond in self.CHRONIC_CONDITIONS:
                adjustments[cond] = adjustments.get(cond, 0) - 0.08

        # Chronic onset boosts chronic conditions
        if onset_type == "chronic":
            for cond in self.CHRONIC_CONDITIONS:
                adjustments[cond] = adjustments.get(cond, 0) + 0.05
            for cond in self.ACUTE_CONDITIONS:
                adjustments[cond] = adjustments.get(cond, 0) - 0.05

        # Rapid progression boosts rapid conditions
        if progression == "rapid":
            for cond in self.RAPID_PROGRESSION:
                adjustments[cond] = adjustments.get(cond, 0) + 0.06

        # Recurrence boosts chronic/recurring conditions
        if is_recurring:
            for cond in self.CHRONIC_CONDITIONS:
                adjustments[cond] = adjustments.get(cond, 0) + 0.04
            adjustments["Migraine"] = adjustments.get("Migraine", 0) + 0.05

        return {k: round(v, 3) for k, v in adjustments.items()}
