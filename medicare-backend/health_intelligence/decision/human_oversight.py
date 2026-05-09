"""
health_intelligence/decision/human_oversight.py
───────────────────────────────────────────────
Human oversight and safe escalation layer — ensures
autonomous reasoning never acts as unsupervised
medical authority.

Provides:
  - Escalation boundaries (when to suggest a professional)
  - Uncertainty-triggered escalation
  - High-risk intervention safeguards
  - Recommendation confidence gating
  - "Consult healthcare professional" escalation paths
  - Non-diagnostic enforcement

The system can suggest, guide, and optimize —
but never diagnose, prescribe, or replace
professional medical judgement.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class EscalationDecision:
    """Result of an escalation assessment."""
    should_escalate: bool
    escalation_level: str            # none | advisory | recommended | urgent
    reason: str
    triggers: list[str]
    professional_recommendation: str
    system_action: str               # proceed | gate | block


# Escalation trigger thresholds
ESCALATION_TRIGGERS = {
    "high_deterioration": {
        "condition": lambda ctx: ctx.get("deterioration_severity", 0) >= 0.7,
        "level": "urgent",
        "reason": "Significant wellness deterioration detected over sustained period",
        "action": "block",
    },
    "critical_vitals": {
        "condition": lambda ctx: (
            ctx.get("heart_rate_bpm", 70) > 120
            or ctx.get("heart_rate_bpm", 70) < 40
            or ctx.get("spo2_percent", 98) < 90
        ),
        "level": "urgent",
        "reason": "Vital signs outside safe wellness monitoring range",
        "action": "block",
    },
    "low_overall_confidence": {
        "condition": lambda ctx: ctx.get("overall_confidence", 1) < 0.2,
        "level": "advisory",
        "reason": "System confidence too low for reliable autonomous recommendations",
        "action": "gate",
    },
    "chronic_risk_compound": {
        "condition": lambda ctx: ctx.get("compound_risk", 0) >= 0.7,
        "level": "recommended",
        "reason": "Multiple chronic health risks accumulating simultaneously",
        "action": "gate",
    },
    "burnout_critical": {
        "condition": lambda ctx: ctx.get("burnout_risk", 0) >= 0.8,
        "level": "recommended",
        "reason": "Burnout risk has reached a level where professional support is advisable",
        "action": "gate",
    },
    "intervention_resistance": {
        "condition": lambda ctx: ctx.get("intervention_failure_rate", 0) > 0.8,
        "level": "advisory",
        "reason": "User consistently not responding to wellness interventions",
        "action": "proceed",
    },
    "sustained_abnormal_state": {
        "condition": lambda ctx: (
            ctx.get("physiological_state") == "abnormal"
            and ctx.get("abnormal_duration_hours", 0) > 4
        ),
        "level": "recommended",
        "reason": "Prolonged abnormal physiological state detected",
        "action": "gate",
    },
}

# Professional consultation messages per level
PROFESSIONAL_MESSAGES = {
    "urgent": (
        "We strongly recommend consulting a healthcare professional "
        "as soon as possible. Your wellness patterns suggest this "
        "is beyond what autonomous coaching can safely address."
    ),
    "recommended": (
        "Consider scheduling a check-in with your healthcare provider. "
        "Your wellness patterns could benefit from professional guidance "
        "alongside the support this system provides."
    ),
    "advisory": (
        "A healthcare professional can provide additional insight "
        "into your current wellness patterns. This is not urgent, "
        "but could be helpful for a more complete picture."
    ),
    "none": "",
}


class HumanOversightLayer:
    """
    Ensures autonomous health reasoning operates within
    safe boundaries and escalates appropriately.
    """

    def assess_escalation(
        self,
        context: dict,
    ) -> EscalationDecision:
        """
        Assess whether the current situation requires
        escalation to a human healthcare professional.
        """
        triggered: list[str] = []
        max_level = "none"
        max_action = "proceed"
        reasons: list[str] = []

        level_order = {"none": 0, "advisory": 1, "recommended": 2, "urgent": 3}
        action_order = {"proceed": 0, "gate": 1, "block": 2}

        for trigger_name, config in ESCALATION_TRIGGERS.items():
            try:
                if config["condition"](context):
                    triggered.append(trigger_name)
                    reasons.append(config["reason"])

                    if level_order.get(config["level"], 0) > level_order.get(max_level, 0):
                        max_level = config["level"]

                    if action_order.get(config["action"], 0) > action_order.get(max_action, 0):
                        max_action = config["action"]
            except (KeyError, TypeError):
                pass

        should_escalate = max_level != "none"
        professional_msg = PROFESSIONAL_MESSAGES.get(max_level, "")

        return EscalationDecision(
            should_escalate=should_escalate,
            escalation_level=max_level,
            reason="; ".join(reasons) if reasons else "No escalation needed",
            triggers=triggered,
            professional_recommendation=professional_msg,
            system_action=max_action,
        )

    def enforce_non_diagnostic(self, message: str) -> str:
        """
        Ensure a message does not contain diagnostic language.
        """
        diagnostic_terms = [
            "diagnosed", "diagnosis", "disease", "disorder",
            "condition", "syndrome", "pathology", "clinical",
            "medical condition", "you have", "suffering from",
        ]

        lower = message.lower()
        for term in diagnostic_terms:
            if term in lower:
                message = message.replace(
                    term,
                    "wellness pattern",
                )
                # Case-insensitive
                import re
                pattern = re.compile(re.escape(term), re.IGNORECASE)
                message = pattern.sub("wellness pattern", message)

        return message

    def apply_safeguards(
        self,
        interventions: list[dict],
        escalation: EscalationDecision,
    ) -> list[dict]:
        """
        Apply safety guardrails to interventions based
        on escalation assessment.
        """
        if escalation.system_action == "block":
            # Block all autonomous interventions
            return [{
                "type": "escalation_notice",
                "priority": "critical",
                "message": escalation.professional_recommendation,
                "reason": escalation.reason,
                "note": (
                    "Autonomous wellness recommendations have been paused. "
                    "Please consult a healthcare professional."
                ),
            }]

        if escalation.system_action == "gate":
            # Downgrade and annotate interventions
            for intervention in interventions:
                intervention["safety_note"] = (
                    "This suggestion is provided alongside a recommendation "
                    "to consult a healthcare professional."
                )
                if intervention.get("priority") == "high":
                    intervention["priority"] = "moderate"

            # Add escalation as first item
            interventions.insert(0, {
                "type": "professional_consultation",
                "priority": "high",
                "message": escalation.professional_recommendation,
                "reason": escalation.reason,
            })

        return interventions
