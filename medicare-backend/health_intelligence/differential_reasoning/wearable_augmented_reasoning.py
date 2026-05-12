"""
health_intelligence/differential_reasoning/wearable_augmented_reasoning.py
──────────────────────────────────────────────────────────────────────────
Uses physiological signals as probabilistic evidence modifiers.

Supported signals:
  • SpO2            → respiratory conditions
  • heart_rate      → cardiac, anxiety
  • hrv             → stress, fatigue
  • sleep_quality   → recovery, chronic conditions
  • respiration_rate → respiratory distress
  • temperature     → fever/infection

IMPORTANT: Wearable data influences reasoning probabilistically, never
deterministically.
"""

from typing import Any, Dict


class WearableAugmentedReasoning:

    def compute_modifiers(self, wearable_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Return per-condition confidence modifiers based on wearable signals.
        Positive values strengthen the hypothesis; negative values weaken it.
        """
        modifiers: Dict[str, float] = {}

        if not wearable_data:
            return modifiers

        # SpO2 — low oxygen supports respiratory concerns
        spo2 = wearable_data.get("spo2")
        if spo2 is not None:
            if spo2 < 93:
                modifiers["Pneumonia"] = modifiers.get("Pneumonia", 0) + 0.12
                modifiers["Asthma"] = modifiers.get("Asthma", 0) + 0.08
                modifiers["COVID-19"] = modifiers.get("COVID-19", 0) + 0.08
            elif spo2 >= 97:
                modifiers["Pneumonia"] = modifiers.get("Pneumonia", 0) - 0.05
                modifiers["Asthma"] = modifiers.get("Asthma", 0) - 0.04

        # Heart rate — elevated supports cardiac/anxiety
        hr = wearable_data.get("heart_rate")
        if hr is not None:
            if hr > 100:
                modifiers["Cardiac Event"] = modifiers.get("Cardiac Event", 0) + 0.08
                modifiers["Anxiety"] = modifiers.get("Anxiety", 0) + 0.06
            elif hr < 60:
                modifiers["Cardiac Event"] = modifiers.get("Cardiac Event", 0) + 0.04

        # HRV — low HRV supports stress/fatigue
        hrv = wearable_data.get("hrv")
        if hrv is not None:
            if hrv < 30:
                modifiers["Chronic Fatigue"] = modifiers.get("Chronic Fatigue", 0) + 0.06
                modifiers["Anxiety"] = modifiers.get("Anxiety", 0) + 0.05
            elif hrv > 60:
                modifiers["Chronic Fatigue"] = modifiers.get("Chronic Fatigue", 0) - 0.04

        # Sleep quality — poor sleep supports fatigue-related conditions
        sleep = wearable_data.get("sleep_quality")
        if sleep is not None:
            if sleep < 0.5:
                modifiers["Chronic Fatigue"] = modifiers.get("Chronic Fatigue", 0) + 0.05
                modifiers["Depression"] = modifiers.get("Depression", 0) + 0.04

        # Temperature — elevated supports infection
        temp = wearable_data.get("temperature")
        if temp is not None:
            if temp > 38.0:
                modifiers["Flu"] = modifiers.get("Flu", 0) + 0.08
                modifiers["COVID-19"] = modifiers.get("COVID-19", 0) + 0.06
                modifiers["Pneumonia"] = modifiers.get("Pneumonia", 0) + 0.06

        return {k: round(v, 3) for k, v in modifiers.items()}
