"""
health_intelligence/differential_reasoning/exclusion_reasoning_engine.py
────────────────────────────────────────────────────────────────────────
Tracks and explains why conditions become less likely or are ruled out.

Generates transparent, clinician-like explanations for:
  • Missing expected symptoms
  • Timeline mismatches
  • Wearable inconsistencies
  • Severity incompatibilities
"""

from typing import Any, Dict, List, Optional


class ExclusionReasoningEngine:

    # Expected hallmark symptoms per condition
    EXPECTED_SYMPTOMS: Dict[str, List[str]] = {
        "Pneumonia":       ["shortness_of_breath", "productive_cough", "fever"],
        "Cardiac Event":   ["chest_pain", "shortness_of_breath", "dizziness"],
        "Flu":             ["fever", "body_aches", "fatigue"],
        "Asthma":          ["shortness_of_breath", "wheezing"],
        "Strep Throat":    ["sore_throat", "fever"],
        "COVID-19":        ["fever", "cough", "fatigue", "loss_of_taste"],
    }

    def process_exclusions(
        self,
        hypotheses: List[Dict[str, Any]],
        active_symptoms: List[str],
        temporal_data: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Identify exclusion reasoning for each hypothesis."""
        temporal_data = temporal_data or {}
        exclusions: List[Dict[str, Any]] = []

        for h in hypotheses:
            cond = h["condition"]
            reasons: List[str] = []

            # Missing expected symptoms
            expected = self.EXPECTED_SYMPTOMS.get(cond, [])
            missing = [s for s in expected if s not in active_symptoms]
            if missing:
                reasons.append(
                    f"Missing expected symptom(s): {', '.join(s.replace('_', ' ') for s in missing)}."
                )

            # Timeline incompatibility
            onset_type = temporal_data.get("onset_type")
            if onset_type == "chronic" and cond in ("Flu", "COVID-19"):
                reasons.append(
                    "Chronic progression is inconsistent with acute viral onset."
                )
            if onset_type == "acute" and cond == "Chronic Fatigue":
                reasons.append(
                    "Acute onset is inconsistent with a chronic fatigue pattern."
                )

            if reasons:
                exclusions.append({
                    "condition": cond,
                    "status": "weakened",
                    "reasons": reasons,
                    "confidence_impact": -0.05 * len(reasons),
                })

        return exclusions
