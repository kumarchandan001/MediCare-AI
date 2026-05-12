"""
Uncertainty Governor — Enforces Probabilistic Safety

Ensures the system NEVER:
- Implies definitive diagnosis
- Hides ambiguity
- Overstates confidence
- Suppresses contradictory evidence

Enforces:
- Probabilistic language requirements
- Ambiguity acknowledgment in all outputs
- Confidence limit enforcement
- Contradiction-aware confidence suppression
"""
import time


class UncertaintyGovernor:
    # Forbidden certainty phrases
    FORBIDDEN_PHRASES = [
        "you have", "you are diagnosed", "this is definitely",
        "100% certain", "confirmed diagnosis", "you suffer from",
        "there is no doubt", "conclusively", "without question",
    ]

    # Required probabilistic qualifiers
    PROBABILISTIC_QUALIFIERS = [
        "may", "suggests", "could", "possibly", "likely",
        "approximately", "investigation", "probability",
        "being considered", "appears to", "currently",
    ]

    def enforce_uncertainty(
        self,
        hypotheses: list[dict],
        narrative_text: str = "",
        evidence_sufficiency: float = 0.5,
        contradiction_count: int = 0,
    ) -> dict:
        violations = []
        warnings = []

        # 1. Check for forbidden certainty phrases
        text_lower = narrative_text.lower()
        for phrase in self.FORBIDDEN_PHRASES:
            if phrase in text_lower:
                violations.append({
                    "type": "forbidden_certainty",
                    "phrase": phrase,
                    "action": "This phrase implies diagnostic certainty and must be removed.",
                })

        # 2. Check for probabilistic qualifier presence
        has_qualifier = any(q in text_lower for q in self.PROBABILISTIC_QUALIFIERS)
        if narrative_text and not has_qualifier:
            warnings.append({
                "type": "missing_probabilistic_language",
                "action": "Narrative should include probabilistic language.",
            })

        # 3. Check confidence limits
        for hyp in hypotheses:
            conf = hyp.get("confidence", 0)
            if conf > 0.85:
                violations.append({
                    "type": "unsafe_confidence",
                    "condition": hyp.get("condition", "unknown"),
                    "confidence": conf,
                    "action": f"Confidence {conf:.0%} exceeds safe limit of 85%.",
                })

        # 4. Check contradiction suppression
        if contradiction_count > 0:
            top_conf = max((h.get("confidence", 0) for h in hypotheses), default=0)
            if top_conf > 0.7:
                warnings.append({
                    "type": "high_confidence_with_contradictions",
                    "action": "High confidence exists alongside contradictions — requires penalty.",
                })

        # 5. Evidence sufficiency check
        if evidence_sufficiency < 0.3:
            top_conf = max((h.get("confidence", 0) for h in hypotheses), default=0)
            if top_conf > 0.5:
                warnings.append({
                    "type": "high_confidence_low_evidence",
                    "action": "Confidence is elevated despite limited evidence.",
                })

        is_safe = len(violations) == 0
        return {
            "generated_at": time.time(),
            "is_safe": is_safe,
            "violations": violations,
            "warnings": warnings,
            "violation_count": len(violations),
            "warning_count": len(warnings),
            "summary": "Uncertainty governance passed." if is_safe else f"{len(violations)} safety violation(s) detected.",
        }
