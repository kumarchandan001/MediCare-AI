"""
Escalation Policy Manager — Rules for escalation behavior.
"""
from .policy_engine import PolicyEngine


class EscalationPolicyManager:
    def get_escalation_threshold(self, level: str) -> float:
        return PolicyEngine.ESCALATION.get(f"{level}_max_severity", 0.5)

    def is_emergency_keyword(self, symptom: str) -> bool:
        return symptom in PolicyEngine.ESCALATION["emergency_keywords"]

    def get_cooldown_hours(self) -> int:
        return PolicyEngine.ESCALATION["cooldown_hours"]

    def get_max_daily_alerts(self) -> int:
        return PolicyEngine.ESCALATION["max_alerts_per_day"]

    def should_escalate(self, severity: float, deterioration: float) -> str:
        if severity > PolicyEngine.ESCALATION["urgent_max_severity"]:
            return "emergency"
        elif severity > PolicyEngine.ESCALATION["elevated_max_severity"]:
            return "urgent"
        elif severity > PolicyEngine.ESCALATION["watchful_max_severity"]:
            return "elevated"
        elif severity > PolicyEngine.ESCALATION["routine_max_severity"]:
            return "watchful"
        return "routine"
