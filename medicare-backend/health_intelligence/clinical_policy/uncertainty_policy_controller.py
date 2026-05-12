"""Uncertainty Policy Controller — Rules for ambiguity handling."""
from .policy_engine import PolicyEngine


class UncertaintyPolicyController:
    def get_max_acceptable_uncertainty(self) -> float:
        return PolicyEngine.UNCERTAINTY["max_acceptable_uncertainty"]

    def should_preserve_ambiguity(self, ambiguity_score: float) -> bool:
        return ambiguity_score >= PolicyEngine.UNCERTAINTY["ambiguity_preservation_threshold"]

    def get_evidence_sufficiency_level(self, score: float) -> str:
        if score >= PolicyEngine.UNCERTAINTY["evidence_sufficiency_strong"]:
            return "strong"
        elif score >= PolicyEngine.UNCERTAINTY["evidence_sufficiency_adequate"]:
            return "adequate"
        return "limited"
