"""
health_intelligence/differential_reasoning/ambiguity_resolution_engine.py
─────────────────────────────────────────────────────────────────────────
Multi-dimensional uncertainty model that tracks different categories
of clinical ambiguity separately.

Dimensions:
  • evidence_insufficiency — not enough data
  • conflicting_evidence  — contradictory signals
  • unstable_progression  — rapidly changing hypotheses
  • missing_context        — no wearable/history data
  • low_wearable_conf     — unreliable physiological signals
  • symptom_overlap        — many conditions share symptoms
"""

from typing import Any, Dict, List, Optional


class AmbiguityResolutionEngine:

    def calculate_ambiguity(
        self,
        weighted_evidence: Dict[str, Any],
        hypotheses: List[Dict[str, Any]],
        wearable_modifiers: Optional[Dict[str, float]] = None,
        stability: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Produce a multi-dimensional ambiguity assessment."""
        wearable_modifiers = wearable_modifiers or {}
        stability = stability or {}

        dimensions: Dict[str, float] = {}

        # Evidence insufficiency
        total_evidence = len(weighted_evidence.get("strong", [])) + len(weighted_evidence.get("weak", []))
        dimensions["evidence_insufficiency"] = max(0, 1.0 - total_evidence * 0.15)

        # Conflicting evidence
        conflict_count = len(weighted_evidence.get("conflicting", []))
        dimensions["conflicting_evidence"] = min(1.0, conflict_count * 0.25)

        # Unstable progression
        volatile_count = stability.get("volatile_count", 0) if stability else 0
        dimensions["unstable_progression"] = min(1.0, volatile_count * 0.2)

        # Missing context
        has_wearable = len(wearable_modifiers) > 0
        dimensions["missing_context"] = 0.3 if not has_wearable else 0.0

        # Low wearable confidence
        dimensions["low_wearable_confidence"] = 0.0  # Updated when wearable signals are unreliable

        # Symptom overlap
        if len(hypotheses) >= 2:
            top_two_gap = abs(hypotheses[0]["confidence"] - hypotheses[1]["confidence"])
            dimensions["symptom_overlap"] = max(0, 0.5 - top_two_gap)
        else:
            dimensions["symptom_overlap"] = 0.0

        # Overall ambiguity score
        overall = sum(dimensions.values()) / max(len(dimensions), 1)

        # Warnings
        warnings: List[str] = []
        if dimensions["evidence_insufficiency"] > 0.6:
            warnings.append("More information is needed to narrow possibilities.")
        if dimensions["conflicting_evidence"] > 0.3:
            warnings.append("Some evidence is conflicting — investigation should continue.")
        if dimensions["unstable_progression"] > 0.4:
            warnings.append("Hypotheses are shifting rapidly — reasoning is still evolving.")
        if dimensions["symptom_overlap"] > 0.3:
            warnings.append("Multiple conditions share similar symptoms — differentiation is ongoing.")

        return {
            "overall": round(overall, 3),
            "dimensions": {k: round(v, 3) for k, v in dimensions.items()},
            "warnings": warnings,
            "level": "high" if overall > 0.5 else "moderate" if overall > 0.25 else "low",
        }
