"""
Medical Safety Enforcer — Blocks Diagnostic Determinism

Ensures the system never produces outputs that could be mistaken
for medical diagnosis. Enforces disclaimers and probabilistic framing.
"""
import time
import re


class MedicalSafetyEnforcer:
    DIAGNOSTIC_PATTERNS = [
        r"\byou have\b.*\b(disease|condition|disorder|syndrome|infection)\b",
        r"\bdiagnosed with\b",
        r"\bconfirmed?\b.*\b(diagnosis|case)\b",
        r"\byou are suffering from\b",
        r"\bthis is\b.*\b(disease|condition)\b",
        r"\bdefinitely\b.*\b(have|suffering|affected)\b",
    ]

    REQUIRED_DISCLAIMER = ("This assessment reflects probabilistic clinical reasoning "
                           "and is not a medical diagnosis. Always consult a healthcare professional.")

    def enforce_safety(self, output_text: str, hypotheses: list[dict] = None) -> dict:
        violations = []
        text_lower = output_text.lower()

        # Pattern matching for diagnostic language
        for pattern in self.DIAGNOSTIC_PATTERNS:
            if re.search(pattern, text_lower):
                violations.append({
                    "type": "diagnostic_language",
                    "pattern": pattern,
                    "action": "Remove or rephrase to use probabilistic language.",
                })

        # Check all hypotheses are framed probabilistically
        if hypotheses:
            for hyp in hypotheses:
                conf = hyp.get("confidence", 0)
                if conf >= 1.0:
                    violations.append({
                        "type": "absolute_certainty",
                        "condition": hyp.get("condition", "unknown"),
                        "action": "No hypothesis may have 100% confidence.",
                    })

        is_safe = len(violations) == 0

        # Build safe output
        safe_text = output_text
        if not is_safe:
            # Auto-remediate: append disclaimer
            safe_text = output_text + f"\n\n{self.REQUIRED_DISCLAIMER}"

        return {
            "generated_at": time.time(),
            "is_safe": is_safe,
            "violations": violations,
            "safe_text": safe_text,
            "disclaimer": self.REQUIRED_DISCLAIMER,
            "summary": "Medical safety check passed." if is_safe else f"{len(violations)} safety issue(s) auto-remediated.",
        }
