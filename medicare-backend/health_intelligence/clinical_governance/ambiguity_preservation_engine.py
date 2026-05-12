"""
Ambiguity Preservation Engine — Protects Valid Uncertainty

Prevents the system from prematurely resolving ambiguity.
When evidence is insufficient or contradictory, ambiguity should
be preserved and communicated honestly rather than artificially resolved.
"""
import time


class AmbiguityPreservationEngine:
    def evaluate_ambiguity(
        self,
        hypotheses: list[dict],
        evidence_sufficiency: float = 0.5,
        contradiction_count: int = 0,
        reasoning_stability: float = 0.7,
    ) -> dict:
        confs = sorted([h.get("confidence", 0) for h in hypotheses], reverse=True)
        ambiguity_score = 0.0
        preservation_actions = []

        # Close confidence gap = high ambiguity
        if len(confs) >= 2 and abs(confs[0] - confs[1]) < 0.12:
            ambiguity_score += 0.3
            preservation_actions.append({
                "type": "close_confidence_gap",
                "action": "Multiple hypotheses have similar likelihoods. Ambiguity should be communicated.",
            })

        # Low evidence = preserve ambiguity
        if evidence_sufficiency < 0.4:
            ambiguity_score += 0.25
            preservation_actions.append({
                "type": "insufficient_evidence",
                "action": "Evidence is limited. Confidence should reflect this uncertainty.",
            })

        # Contradictions = preserve ambiguity
        if contradiction_count > 1:
            ambiguity_score += min(0.3, contradiction_count * 0.1)
            preservation_actions.append({
                "type": "contradictory_evidence",
                "action": "Contradictions exist. The system should not force resolution.",
            })

        # Reasoning instability = preserve ambiguity
        if reasoning_stability < 0.4:
            ambiguity_score += 0.15
            preservation_actions.append({
                "type": "unstable_reasoning",
                "action": "Reasoning is shifting. Premature certainty should be avoided.",
            })

        ambiguity_score = min(1.0, round(ambiguity_score, 3))
        level = ("low" if ambiguity_score < 0.2 else "moderate" if ambiguity_score < 0.45
                 else "elevated" if ambiguity_score < 0.7 else "high")

        should_preserve = ambiguity_score >= 0.3

        return {
            "generated_at": time.time(),
            "ambiguity_score": ambiguity_score,
            "ambiguity_level": level,
            "should_preserve": should_preserve,
            "preservation_actions": preservation_actions,
            "summary": (f"Ambiguity is {level} ({ambiguity_score:.0%}). "
                        + ("The system is preserving uncertainty honestly." if should_preserve
                           else "Evidence is sufficient for reasonable confidence.")),
        }
