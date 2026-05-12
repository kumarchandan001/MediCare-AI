"""
health_intelligence/evidence_graph/symptom_relationship_graph.py
───────────────────────────────────────────────────────────────
Represents known medical relationships and symptom clustering.
"""

from typing import Any, Dict, List


class SymptomRelationshipGraph:

    RELATED_SYMPTOMS: Dict[str, List[str]] = {
        "fever":    ["fatigue", "body_aches", "headache"],
        "cough":    ["sore_throat", "shortness_of_breath"],
        "nausea":   ["dizziness", "fatigue"],
        "headache": ["dizziness", "nausea"],
    }

    def get_relationships(self, active_symptoms: List[str]) -> List[Dict[str, Any]]:
        """Return edges representing symptom co-occurrence relationships."""
        edges: List[Dict[str, Any]] = []
        seen = set()

        for symptom in active_symptoms:
            related = self.RELATED_SYMPTOMS.get(symptom, [])
            for rel in related:
                if rel in active_symptoms:
                    pair = tuple(sorted([symptom, rel]))
                    if pair not in seen:
                        seen.add(pair)
                        edges.append({
                            "source": f"s_{pair[0]}",
                            "target": f"s_{pair[1]}",
                            "type": "correlates",
                        })

        return edges
