"""
follow_up_strategy_engine.py
─────────────────────────────
Guides long-term investigation intelligently.

Responsibilities:
  - Determine follow-up urgency and timing
  - Generate re-evaluation prompts
  - Trigger escalation-driven follow-ups
  - Verify recovery with check-in logic
  - Behave like continuous clinical supervision, not periodic polling
"""

from typing import Any, Dict, List


class FollowUpStrategyEngine:

    # Triage level -> recommended follow-up hours
    FOLLOW_UP_TIMING = {
        "self_monitoring": 72,
        "routine_consultation": 48,
        "urgent_evaluation": 12,
        "emergency_escalation": 1,
    }

    def generate_follow_up(
        self,
        triage_level: str,
        trajectory: str,
        recovery_quality: float,
        escalation_likelihood: float,
        recurrence_score: float,
    ) -> Dict[str, Any]:
        """Generate a follow-up recommendation."""
        urgency = self._compute_urgency(triage_level, trajectory, escalation_likelihood)
        timing_hours = self._compute_timing(triage_level, urgency)
        prompts = self._generate_prompts(trajectory, recovery_quality, recurrence_score)
        reason = self._explain_follow_up(triage_level, trajectory, urgency)

        return {
            "urgency": urgency,
            "follow_up_hours": timing_hours,
            "prompts": prompts,
            "type": self._follow_up_type(trajectory, recovery_quality, escalation_likelihood),
            "reason": reason,
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _compute_urgency(triage: str, trajectory: str, escalation: float) -> str:
        if triage == "emergency_escalation" or escalation > 0.6:
            return "critical"
        if triage == "urgent_evaluation" or trajectory == "deteriorating":
            return "high"
        if trajectory == "fluctuating":
            return "moderate"
        return "routine"

    def _compute_timing(self, triage: str, urgency: str) -> int:
        base = self.FOLLOW_UP_TIMING.get(triage, 48)
        if urgency == "critical":
            return min(base, 2)
        if urgency == "high":
            return min(base, 12)
        if urgency == "moderate":
            return min(base, 24)
        return base

    @staticmethod
    def _generate_prompts(trajectory: str, recovery_quality: float, recurrence: float) -> List[str]:
        prompts = []
        if trajectory == "deteriorating":
            prompts.append("Please update us on any changes in your symptoms.")
        if trajectory == "improving" and recovery_quality < 0.4:
            prompts.append("Your recovery is early — let us know if symptoms return or worsen.")
        if trajectory == "fluctuating":
            prompts.append("Your symptoms have been varying. A brief check-in would help us track your progress.")
        if recurrence > 0.3:
            prompts.append("We've noticed similar patterns in the past. Are these symptoms familiar to you?")
        if not prompts:
            prompts.append("A routine follow-up will help us ensure continued progress.")
        return prompts

    @staticmethod
    def _follow_up_type(trajectory: str, recovery_quality: float, escalation: float) -> str:
        if escalation > 0.5:
            return "escalation_triggered"
        if trajectory == "deteriorating":
            return "deterioration_check"
        if trajectory == "improving" and recovery_quality > 0.3:
            return "recovery_verification"
        if trajectory == "fluctuating":
            return "symptom_reassessment"
        return "routine_monitoring"

    @staticmethod
    def _explain_follow_up(triage: str, trajectory: str, urgency: str) -> str:
        if urgency == "critical":
            return "Immediate follow-up is recommended due to clinical urgency."
        if urgency == "high":
            return "A timely follow-up is advised to monitor the evolving situation."
        if trajectory == "improving":
            return "A follow-up is suggested to confirm continued improvement."
        return "Routine follow-up to maintain clinical awareness."
