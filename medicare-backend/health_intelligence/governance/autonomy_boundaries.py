"""
health_intelligence/governance/autonomy_boundaries.py
───────────────────────────────────────────────
Defines hard limits on what autonomous agents can
execute without human approval.

Boundaries:
  - Maximum intervention intensity
  - Prohibited recommendation categories
  - Required human escalation triggers
  - Agent action scoping
"""

import logging
from dataclasses import dataclass
from datetime import datetime

log = logging.getLogger(__name__)


@dataclass
class BoundaryViolation:
    """Record of a boundary violation."""
    boundary_name: str
    agent_name: str
    action_attempted: str
    severity: str
    timestamp: str


# Categories that ALWAYS require human oversight
RESTRICTED_CATEGORIES = {
    "medication",
    "supplement",
    "dietary_restriction",
    "fasting",
    "intense_exercise",
    "medical_referral",
    "mental_health_intervention",
}

# Maximum autonomous intervention intensity per urgency
MAX_AUTONOMOUS_INTENSITY = {
    "low": "gentle",
    "moderate": "moderate",
    "high": "moderate",       # Can't go to "strong" autonomously
    "critical": "gentle",     # Critical → escalate, don't intensify
}


class AutonomyBoundaries:
    """
    Defines and enforces hard limits on autonomous
    agent actions.
    """

    def __init__(self):
        self._violations: dict[int, list[BoundaryViolation]] = {}

    def check_intervention(
        self,
        user_id: int,
        agent_name: str,
        intervention: dict,
    ) -> dict:
        """
        Check if an intervention is within autonomy bounds.
        """
        category = intervention.get("category", "")
        priority = intervention.get("priority", "low")
        description = str(intervention.get("description", ""))

        # Check restricted categories
        if category in RESTRICTED_CATEGORIES:
            self._record_violation(
                user_id, "restricted_category", agent_name,
                f"Attempted restricted category: {category}",
                "high",
            )
            return {
                "allowed": False,
                "reason": f"Category '{category}' requires human oversight",
                "action": "escalate_to_human",
            }

        # Check diagnostic language
        diagnostic_phrases = [
            "you have", "you are suffering from",
            "this indicates", "diagnosis",
            "you should take", "prescribe",
        ]
        desc_lower = description.lower()
        for phrase in diagnostic_phrases:
            if phrase in desc_lower:
                self._record_violation(
                    user_id, "diagnostic_language", agent_name,
                    f"Diagnostic phrase detected: '{phrase}'",
                    "high",
                )
                return {
                    "allowed": False,
                    "reason": f"Diagnostic language detected: '{phrase}'",
                    "action": "reframe_as_wellness",
                }

        # Check intensity bounds
        max_intensity = MAX_AUTONOMOUS_INTENSITY.get(priority, "gentle")
        if priority == "critical":
            return {
                "allowed": True,
                "reason": "Critical priority — deliver with escalation",
                "action": "deliver_and_escalate",
                "max_intensity": max_intensity,
            }

        return {
            "allowed": True,
            "reason": "Within autonomy bounds",
            "action": "deliver",
            "max_intensity": max_intensity,
        }

    def check_agent_scope(
        self,
        agent_name: str,
        target_domain: str,
    ) -> bool:
        """
        Check if an agent is operating within its
        designated domain scope.
        """
        # Agents should only propose within their domain
        agent_domains = {
            "recovery_agent": {"recovery", "recovery_protocol"},
            "sleep_agent": {"sleep", "sleep_schedule", "sleep_hygiene"},
            "stress_agent": {"stress", "stress_management", "breathing", "meditation"},
            "activity_agent": {"activity", "exercise", "movement_break"},
            "resilience_agent": {"resilience", "recovery_protocol", "encouragement"},
        }
        allowed = agent_domains.get(agent_name, set())
        return target_domain in allowed or not allowed

    def get_violations(self, user_id: int) -> list[dict]:
        """Get recorded violations."""
        violations = self._violations.get(user_id, [])
        return [
            {
                "boundary": v.boundary_name,
                "agent": v.agent_name,
                "action": v.action_attempted,
                "severity": v.severity,
                "timestamp": v.timestamp,
            }
            for v in violations
        ]

    def _record_violation(
        self,
        user_id: int,
        boundary: str,
        agent: str,
        action: str,
        severity: str,
    ) -> None:
        if user_id not in self._violations:
            self._violations[user_id] = []
        self._violations[user_id].append(BoundaryViolation(
            boundary_name=boundary,
            agent_name=agent,
            action_attempted=action,
            severity=severity,
            timestamp=datetime.utcnow().isoformat(),
        ))
        log.warning(f"Boundary violation [{boundary}]: {action}")
