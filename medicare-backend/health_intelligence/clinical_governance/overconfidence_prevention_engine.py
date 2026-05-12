"""
Overconfidence Prevention Engine — Confidence Caps & Contradiction Penalties

Prevents unsafe clinical certainty by enforcing:
- Hard confidence ceilings (no hypothesis can exceed a safety cap)
- Contradiction penalties (conflicting evidence suppresses confidence)
- Evidence sufficiency thresholds (low evidence = lower confidence limit)
- Wearable reliability moderation
- Escalation-aware confidence reduction
"""
import time


class OverconfidencePreventionEngine:
    # Hard ceiling: AI must never exceed this confidence
    ABSOLUTE_CONFIDENCE_CAP = 0.85

    # Thresholds
    MIN_EVIDENCE_FOR_HIGH_CONF = 3
    CONTRADICTION_PENALTY_PER = 0.08
    WEARABLE_UNRELIABLE_PENALTY = 0.07
    INSTABILITY_PENALTY = 0.10
    ESCALATION_CONFIDENCE_REDUCTION = 0.05

    def apply_confidence_governance(
        self,
        hypotheses: list[dict],
        observations: list[dict],
        contradiction_count: int = 0,
        evidence_sufficiency: float = 0.5,
        wearable_trust: float = 0.5,
        reasoning_stability: float = 0.7,
        escalation_active: bool = False,
    ) -> dict:
        governed = []
        adjustments = []

        for hyp in hypotheses:
            cond = hyp.get("condition", "unknown")
            raw_conf = hyp.get("confidence", 0)
            governed_conf = raw_conf

            reasons = []

            # 1. Hard cap
            if governed_conf > self.ABSOLUTE_CONFIDENCE_CAP:
                governed_conf = self.ABSOLUTE_CONFIDENCE_CAP
                reasons.append(f"capped at {self.ABSOLUTE_CONFIDENCE_CAP * 100:.0f}% safety ceiling")

            # 2. Contradiction penalty
            if contradiction_count > 0:
                penalty = min(0.25, contradiction_count * self.CONTRADICTION_PENALTY_PER)
                governed_conf = max(0.05, governed_conf - penalty)
                reasons.append(f"-{penalty * 100:.0f}% contradiction penalty")

            # 3. Evidence insufficiency
            matched = sum(1 for o in observations if o.get("symptom") in hyp.get("evidence_for", []))
            if matched < self.MIN_EVIDENCE_FOR_HIGH_CONF and governed_conf > 0.6:
                governed_conf = min(governed_conf, 0.6)
                reasons.append("limited to 60% due to insufficient evidence")

            # 4. Wearable unreliability
            if wearable_trust < 0.4:
                governed_conf = max(0.05, governed_conf - self.WEARABLE_UNRELIABLE_PENALTY)
                reasons.append(f"-{self.WEARABLE_UNRELIABLE_PENALTY * 100:.0f}% wearable uncertainty")

            # 5. Reasoning instability
            if reasoning_stability < 0.4:
                governed_conf = max(0.05, governed_conf - self.INSTABILITY_PENALTY)
                reasons.append(f"-{self.INSTABILITY_PENALTY * 100:.0f}% reasoning instability")

            # 6. Escalation-active reduction
            if escalation_active:
                governed_conf = max(0.05, governed_conf - self.ESCALATION_CONFIDENCE_REDUCTION)
                reasons.append(f"-{self.ESCALATION_CONFIDENCE_REDUCTION * 100:.0f}% escalation caution")

            governed_conf = round(max(0.05, min(self.ABSOLUTE_CONFIDENCE_CAP, governed_conf)), 3)

            governed.append({**hyp, "confidence": governed_conf, "raw_confidence": raw_conf})
            if reasons:
                adjustments.append({"condition": cond, "raw": round(raw_conf, 3),
                                    "governed": governed_conf, "reasons": reasons})

        return {
            "generated_at": time.time(),
            "hypotheses": governed,
            "adjustments": adjustments,
            "governance_applied": len(adjustments) > 0,
            "summary": self._summarize(adjustments),
        }

    def _summarize(self, adjustments):
        if not adjustments:
            return "Confidence levels are within safe clinical boundaries."
        n = len(adjustments)
        return (f"Confidence governance applied to {n} hypothesis{'es' if n != 1 else ''}. "
                f"This ensures the AI maintains clinically realistic, probabilistic reasoning.")
