"""Contradiction Policy Engine — Rules for conflicting signal handling."""
from .policy_engine import PolicyEngine


class ContradictionPolicyEngine:
    def get_severity_level(self, count: int) -> str:
        if count >= PolicyEngine.CONTRADICTION["severe_threshold"]:
            return "severe"
        elif count >= PolicyEngine.CONTRADICTION["moderate_threshold"]:
            return "moderate"
        elif count >= PolicyEngine.CONTRADICTION["minor_threshold"]:
            return "minor"
        return "none"

    def get_confidence_penalty(self, count: int) -> float:
        return min(PolicyEngine.CONFIDENCE["max_contradiction_penalty"],
                   count * PolicyEngine.CONTRADICTION["confidence_penalty_per"])

    def should_boost_escalation(self, count: int) -> bool:
        return count >= PolicyEngine.CONTRADICTION["escalation_boost_threshold"]
