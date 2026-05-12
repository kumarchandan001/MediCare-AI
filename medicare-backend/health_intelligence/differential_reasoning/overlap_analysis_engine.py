"""
health_intelligence/differential_reasoning/overlap_analysis_engine.py
─────────────────────────────────────────────────────────────────────
Analyzes overlapping symptom clusters for coexisting conditions,
secondary complications, and stress-induced symptom overlap.
"""

from typing import Any, Dict, List


class OverlapAnalysisEngine:

    COEXISTENCE_RULES: Dict[str, List[str]] = {
        "Flu": ["Sinusitis", "Bronchitis"],
        "Viral Respiratory Infection": ["Sinusitis"],
        "Depression": ["Chronic Fatigue", "Insomnia"],
        "Anxiety": ["Tension Headache", "Gastroenteritis"],
    }

    def analyze(
        self,
        active_symptoms: List[str],
        hypotheses: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Detect coexisting conditions and secondary complication risk."""
        active_conditions = {h["condition"] for h in hypotheses}
        coexisting: List[Dict[str, str]] = []
        overlap_clusters: List[Dict[str, Any]] = []

        # Check coexistence rules
        for primary, secondaries in self.COEXISTENCE_RULES.items():
            if primary in active_conditions:
                for sec in secondaries:
                    if sec in active_conditions:
                        coexisting.append({
                            "primary": primary,
                            "secondary": sec,
                            "explanation": f"{sec} may coexist with {primary}.",
                        })

        # Build overlap clusters (conditions sharing many symptoms)
        cond_symptoms: Dict[str, set] = {}
        for h in hypotheses:
            cond_symptoms[h["condition"]] = set(h.get("supporting_evidence", []))

        conditions = list(cond_symptoms.keys())
        for i in range(len(conditions)):
            for j in range(i + 1, len(conditions)):
                shared = cond_symptoms[conditions[i]] & cond_symptoms[conditions[j]]
                if shared:
                    overlap_clusters.append({
                        "condition_a": conditions[i],
                        "condition_b": conditions[j],
                        "shared_symptoms": list(shared),
                    })

        return {
            "coexisting_conditions": coexisting,
            "overlap_clusters": overlap_clusters,
            "multi_condition_possible": len(coexisting) > 0,
        }
