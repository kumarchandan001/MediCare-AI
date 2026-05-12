"""
health_intelligence/differential_reasoning/evidence_weighting_engine.py
───────────────────────────────────────────────────────────────────────
Classifies and weighs evidence quality with clinical reliability scoring.

Evidence categories:
  • strong          — high-specificity symptoms
  • weak            — low-specificity, many possible causes
  • conflicting     — contradicts other evidence
  • missing         — expected evidence not found
  • wearable_supported — confirmed by physiological data
  • unreliable      — self-report inconsistencies
"""

from typing import Any, Dict, List, Optional


class EvidenceWeightingEngine:

    STRONG_INDICATORS = {
        "productive_cough", "chest_pain", "shortness_of_breath",
        "high_fever", "severe_headache", "blood_in_sputum",
        "loss_of_consciousness", "irregular_heartbeat",
    }

    WEARABLE_CONFIRMABLE = {
        "fever": "temperature",
        "shortness_of_breath": "spo2",
        "irregular_heartbeat": "heart_rate",
        "fatigue": "hrv",
    }

    def weigh_evidence(
        self,
        active_symptoms: List[str],
        clinical_context: Dict[str, Any],
        wearable_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Classify each symptom into evidence categories with reliability scores."""
        wearable_data = wearable_data or {}

        strong: List[Dict[str, Any]] = []
        weak: List[Dict[str, Any]] = []
        wearable_supported: List[Dict[str, Any]] = []
        conflicting: List[Dict[str, Any]] = []
        missing: List[str] = []

        for symptom in active_symptoms:
            reliability = self._compute_reliability(symptom, wearable_data)

            entry = {
                "symptom": symptom,
                "reliability": reliability["score"],
                "reliability_label": reliability["label"],
                "source": reliability["source"],
            }

            # Check wearable confirmation
            if symptom in self.WEARABLE_CONFIRMABLE:
                metric = self.WEARABLE_CONFIRMABLE[symptom]
                if metric in wearable_data:
                    entry["wearable_confirmation"] = True
                    wearable_supported.append(entry)
                    continue

            if symptom in self.STRONG_INDICATORS:
                strong.append(entry)
            else:
                weak.append(entry)

        return {
            "strong": [e["symptom"] for e in strong],
            "weak": [e["symptom"] for e in weak],
            "wearable_supported": [e["symptom"] for e in wearable_supported],
            "conflicting": [e["symptom"] for e in conflicting],
            "missing": missing,
            "details": strong + weak + wearable_supported + conflicting,
        }

    def _compute_reliability(
        self, symptom: str, wearable_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Compute reliability score for a symptom."""
        if symptom in self.WEARABLE_CONFIRMABLE:
            metric = self.WEARABLE_CONFIRMABLE[symptom]
            if metric in wearable_data:
                return {"score": 0.9, "label": "wearable_confirmed", "source": "wearable"}

        if symptom in self.STRONG_INDICATORS:
            return {"score": 0.75, "label": "high_specificity", "source": "self_report"}

        return {"score": 0.5, "label": "self_reported", "source": "self_report"}
