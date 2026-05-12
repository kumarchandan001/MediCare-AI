"""
health_intelligence/differential_reasoning/competing_conditions_engine.py
─────────────────────────────────────────────────────────────────────────
Compares overlapping conditions and performs distinguishing-evidence
analysis so the user understands why one condition is favored over another.
"""

from typing import Any, Dict, List


class CompetingConditionsEngine:

    DISTINGUISHING_FEATURES: Dict[str, Dict[str, str]] = {
        "Viral Respiratory Infection": {
            "vs_Flu": "URI typically has milder body aches and slower onset than influenza.",
            "vs_Bronchitis": "URI usually lacks prolonged productive cough.",
        },
        "Flu": {
            "vs_Viral Respiratory Infection": "Flu presents with sudden onset, high fever, and severe body aches.",
            "vs_COVID-19": "Flu is less likely to cause loss of taste or prolonged fatigue.",
        },
        "Pneumonia": {
            "vs_Bronchitis": "Pneumonia is associated with higher fever, rigors, and crackles on auscultation.",
            "vs_Flu": "Pneumonia may present with localised chest pain and persistent productive cough.",
        },
        "Cardiac Event": {
            "vs_Costochondritis": "Cardiac events typically include radiating pain, diaphoresis, and dyspnoea.",
            "vs_GERD": "GERD pain is related to meals and posture; cardiac pain is exertional.",
        },
    }

    def compare(self, hypotheses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate pairwise comparisons for the top competing hypotheses."""
        if len(hypotheses) < 2:
            return []

        comparisons: List[Dict[str, Any]] = []
        top_pairs = min(3, len(hypotheses) - 1)

        for i in range(top_pairs):
            cond_a = hypotheses[i]["condition"]
            cond_b = hypotheses[i + 1]["condition"]

            key_ab = f"vs_{cond_b}"
            key_ba = f"vs_{cond_a}"

            distinction_a = self.DISTINGUISHING_FEATURES.get(cond_a, {}).get(key_ab, "")
            distinction_b = self.DISTINGUISHING_FEATURES.get(cond_b, {}).get(key_ba, "")

            conf_diff = abs(hypotheses[i]["confidence"] - hypotheses[i + 1]["confidence"])

            comparisons.append({
                "condition_a": cond_a,
                "condition_b": cond_b,
                "confidence_a": hypotheses[i]["confidence"],
                "confidence_b": hypotheses[i + 1]["confidence"],
                "confidence_gap": round(conf_diff, 3),
                "distinction_a": distinction_a or f"{cond_a} has more supporting evidence in this investigation.",
                "distinction_b": distinction_b or f"{cond_b} requires additional evidence to differentiate.",
                "verdict": "closely_competing" if conf_diff < 0.1 else "leading",
            })

        return comparisons
