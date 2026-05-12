"""
health_intelligence/evidence_graph/causal_evidence_mapper.py
────────────────────────────────────────────────────────────
Maps causal relationships between symptoms and conditions.
"""

from typing import Any, Dict, List


class CausalEvidenceMapper:

    SYMPTOM_CONDITION_MAP: Dict[str, List[str]] = {
        "fever":              ["Flu", "Pneumonia", "COVID-19", "Viral Respiratory Infection"],
        "cough":              ["Bronchitis", "Pneumonia", "Viral Respiratory Infection"],
        "chest_pain":         ["Cardiac Event", "Pneumonia", "Costochondritis"],
        "shortness_of_breath":["Pneumonia", "Asthma", "Cardiac Event"],
        "headache":           ["Tension Headache", "Migraine", "Flu"],
        "fatigue":            ["Flu", "Chronic Fatigue", "Depression"],
    }

    def map_evidence(
        self,
        active_symptoms: List[str],
        hypotheses: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Generate causal edges between symptom nodes and condition nodes."""
        active_conditions = {h["condition"] for h in hypotheses}
        edges: List[Dict[str, Any]] = []

        for symptom in active_symptoms:
            conditions = self.SYMPTOM_CONDITION_MAP.get(symptom, [])
            for cond in conditions:
                if cond in active_conditions:
                    edges.append({
                        "source": f"s_{symptom}",
                        "target": f"c_{cond.replace(' ', '_')}",
                        "type": "supports",
                        "strength": "strong" if symptom in ("chest_pain", "shortness_of_breath") else "moderate",
                    })

        return edges
