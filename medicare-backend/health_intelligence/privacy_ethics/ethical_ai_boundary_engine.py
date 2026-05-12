"""Ethical AI Boundary Engine — Prevents unsafe AI behavior patterns."""
import time


class EthicalAIBoundaryEngine:
    BOUNDARIES = [
        {"id": "no_replace_doctor", "rule": "AI must never claim to replace professional medical judgment."},
        {"id": "no_withhold_safety", "rule": "Critical safety information must never be suppressed."},
        {"id": "no_discriminate", "rule": "Reasoning must not discriminate based on demographic factors."},
        {"id": "transparency_required", "rule": "AI must always explain its reasoning process."},
        {"id": "uncertainty_honesty", "rule": "AI must honestly report its confidence limits."},
        {"id": "user_autonomy", "rule": "AI must respect user decisions and not coerce behavior."},
    ]

    def check_boundaries(self, output_text: str, hypotheses: list = None) -> dict:
        violations = []
        # Check for replacement claims
        replace_phrases = ["i am your doctor", "no need to see a doctor", "replace medical advice"]
        for p in replace_phrases:
            if p in output_text.lower():
                violations.append({"boundary": "no_replace_doctor", "found": p})

        # Check for coercion
        coerce_phrases = ["you must", "you have to", "failure to act will"]
        for p in coerce_phrases:
            if p in output_text.lower():
                violations.append({"boundary": "user_autonomy", "found": p})

        return {
            "generated_at": time.time(),
            "is_within_bounds": len(violations) == 0,
            "violations": violations,
            "boundaries_checked": len(self.BOUNDARIES),
        }
