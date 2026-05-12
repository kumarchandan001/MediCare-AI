"""Wearable Policy Rules — Trust, influence limits, noise filtering."""
from .policy_engine import PolicyEngine


class WearablePolicyRules:
    def get_trust_level(self, trust_score: float) -> str:
        if trust_score >= PolicyEngine.WEARABLE["high_trust_threshold"]:
            return "high"
        elif trust_score >= PolicyEngine.WEARABLE["moderate_trust_threshold"]:
            return "moderate"
        return "low"

    def get_max_influence(self) -> float:
        return PolicyEngine.WEARABLE["max_influence_weight"]

    def should_suppress_anomaly(self, consecutive_anomalies: int) -> bool:
        return consecutive_anomalies < PolicyEngine.WEARABLE["anomaly_suppression_threshold"]
