"""
Ethical Reasoning Guardrails — Ethical Boundary Enforcement

Prevents unsafe AI behavior patterns:
- Never replace clinical judgment
- Never withhold critical safety information
- Never minimize emergency symptoms
- Always maintain honesty about limitations
"""
import time


class EthicalReasoningGuardrails:
    ETHICAL_RULES = [
        {"id": "no_diagnosis", "rule": "The system must never provide a definitive diagnosis.",
         "check": lambda text: not any(p in text.lower() for p in ["you have", "diagnosed with", "confirmed case"])},
        {"id": "no_treatment_prescription", "rule": "The system must never prescribe treatments.",
         "check": lambda text: not any(p in text.lower() for p in ["take this medication", "you should take", "prescribed"])},
        {"id": "emergency_honesty", "rule": "Emergency symptoms must never be downplayed.",
         "check": lambda text: True},  # Enforced by EscalationBoundaryManager
        {"id": "limitation_transparency", "rule": "System limitations must be acknowledged.",
         "check": lambda text: True},  # Enforced by disclaimers
    ]

    def evaluate_ethics(self, output_text: str, escalation_level: str = "routine",
                        has_disclaimer: bool = True) -> dict:
        violations = []
        for rule in self.ETHICAL_RULES:
            if not rule["check"](output_text):
                violations.append({
                    "rule_id": rule["id"],
                    "rule": rule["rule"],
                    "severity": "critical",
                })

        # Check disclaimer presence
        if not has_disclaimer:
            violations.append({
                "rule_id": "missing_disclaimer",
                "rule": "All outputs must include a probabilistic reasoning disclaimer.",
                "severity": "warning",
            })

        # Check emergency downplaying
        emergency_words = ["chest pain", "difficulty breathing", "seizure", "stroke"]
        has_emergency = any(w in output_text.lower() for w in emergency_words)
        calming_words = ["don't worry", "nothing serious", "probably fine", "no concern"]
        has_calming = any(w in output_text.lower() for w in calming_words)
        if has_emergency and has_calming:
            violations.append({
                "rule_id": "emergency_minimization",
                "rule": "Emergency symptoms must not be minimized with dismissive language.",
                "severity": "critical",
            })

        is_ethical = len(violations) == 0
        return {
            "generated_at": time.time(),
            "is_ethical": is_ethical,
            "violations": violations,
            "violation_count": len(violations),
            "summary": ("Ethical guardrails passed." if is_ethical
                        else f"{len(violations)} ethical concern(s) detected."),
        }
