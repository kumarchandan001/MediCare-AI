"""
health_intelligence/differential_reasoning/hypothesis_ranker.py
───────────────────────────────────────────────────────────────
Ranks active, emerging, and weakening hypotheses with severity-weighted
clinical prioritization.

Key behaviours:
  • Dangerous conditions are investigated first even at lower probability.
  • Severity weight multiplier elevates red-flag conditions.
  • Temporal and wearable adjustments shift ranking dynamically.
  • Confidence is always probabilistic — never deterministic.
"""

from typing import Any, Dict, List, Optional


class HypothesisRanker:
    """Severity-weighted, probabilistic hypothesis ranking engine."""

    # ── Clinical knowledge base (simplified) ────────────────────
    CONDITION_MAP: Dict[str, List[str]] = {
        "fever":              ["Viral Respiratory Infection", "Flu", "Pneumonia", "COVID-19"],
        "cough":              ["Viral Respiratory Infection", "Flu", "Bronchitis", "Pneumonia"],
        "productive_cough":   ["Bronchitis", "Pneumonia"],
        "dry_cough":          ["Viral Respiratory Infection", "COVID-19", "Asthma"],
        "chest_pain":         ["Pneumonia", "Cardiac Event", "Costochondritis", "GERD"],
        "shortness_of_breath":["Pneumonia", "Asthma", "Cardiac Event", "Anxiety"],
        "headache":           ["Tension Headache", "Migraine", "Flu", "Sinusitis"],
        "fatigue":            ["Flu", "Anemia", "Depression", "Chronic Fatigue"],
        "nausea":             ["Gastroenteritis", "Migraine", "Food Poisoning"],
        "sore_throat":        ["Viral Respiratory Infection", "Flu", "Strep Throat"],
        "body_aches":         ["Flu", "Viral Respiratory Infection", "Fibromyalgia"],
        "runny_nose":         ["Common Cold", "Allergic Rhinitis", "Sinusitis"],
        "dizziness":          ["Vertigo", "Anemia", "Dehydration", "Cardiac Event"],
    }

    # Severity multipliers — high-risk conditions get investigation priority
    SEVERITY_WEIGHTS: Dict[str, float] = {
        "Cardiac Event":  2.5,
        "Pneumonia":      1.8,
        "COVID-19":       1.5,
        "Asthma":         1.4,
        "Strep Throat":   1.2,
    }

    EVIDENCE_STRONG_WEIGHT = 0.25
    EVIDENCE_WEAK_WEIGHT   = 0.10

    def rank_hypotheses(
        self,
        weighted_evidence: Dict[str, Any],
        temporal_adjustments: Optional[Dict[str, float]] = None,
        wearable_modifiers: Optional[Dict[str, float]] = None,
        contradictions: Optional[List[Dict[str, Any]]] = None,
    ) -> List[Dict[str, Any]]:
        """Return a ranked list of hypotheses from weighted evidence."""
        temporal_adjustments = temporal_adjustments or {}
        wearable_modifiers = wearable_modifiers or {}

        condition_scores: Dict[str, float] = {}

        # Score from strong evidence
        for symptom in weighted_evidence.get("strong", []):
            for cond in self.CONDITION_MAP.get(symptom, []):
                condition_scores[cond] = condition_scores.get(cond, 0) + self.EVIDENCE_STRONG_WEIGHT

        # Score from weak evidence
        for symptom in weighted_evidence.get("weak", []):
            for cond in self.CONDITION_MAP.get(symptom, []):
                condition_scores[cond] = condition_scores.get(cond, 0) + self.EVIDENCE_WEAK_WEIGHT

        # Apply severity priority multiplier
        for cond in condition_scores:
            severity_mult = self.SEVERITY_WEIGHTS.get(cond, 1.0)
            condition_scores[cond] *= severity_mult

        # Apply temporal adjustments
        for cond, adj in temporal_adjustments.items():
            if cond in condition_scores:
                condition_scores[cond] += adj

        # Apply wearable modifiers
        for cond, mod in wearable_modifiers.items():
            if cond in condition_scores:
                condition_scores[cond] += mod

        # Build hypothesis list
        hypotheses: List[Dict[str, Any]] = []
        for condition, raw_score in condition_scores.items():
            confidence = min(0.92, max(0.03, raw_score))
            hypotheses.append({
                "condition": condition,
                "confidence": round(confidence, 3),
                "raw_score": round(raw_score, 3),
                "severity_priority": self.SEVERITY_WEIGHTS.get(condition, 1.0),
                "trend": "emerging",
                "supporting_evidence": [],
                "conflicting_evidence": [],
            })

        # Sort by effective priority (confidence × severity_priority)
        hypotheses.sort(
            key=lambda h: h["confidence"] * h["severity_priority"],
            reverse=True,
        )
        return hypotheses
