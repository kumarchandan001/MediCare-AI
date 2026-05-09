"""
health_intelligence/agents/recovery_agent.py
───────────────────────────────────────────────
Autonomous recovery agent — monitors recovery capacity
and proposes interventions to optimise resilience
restoration.

Watches:
  - Recovery score trends
  - Post-stress recovery speed
  - Sleep quality impact on recovery
  - Activity-recovery balance
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class RecoveryAgent:
    """
    Monitors recovery capacity and proposes
    resilience restoration interventions.
    """

    name = "recovery_agent"
    domain = "recovery"
    priority_weight = 0.85  # High priority agent

    def evaluate(
        self,
        user_id: int,
        signals: dict[str, float],
        twin_state: Optional[dict] = None,
    ) -> dict:
        """
        Evaluate recovery state and propose interventions.
        """
        recovery = signals.get("recovery_score", 70)
        fatigue = signals.get("fatigue", 30)
        stress = signals.get("stress_level", 40)
        sleep = signals.get("sleep_hours", 7.5)

        interventions: list[dict] = []
        assessment = "Recovery is adequate"
        urgency = "low"
        confidence = 0.5

        # Critical recovery deficit
        if recovery < 40:
            urgency = "high"
            confidence = 0.75
            assessment = "Recovery capacity is critically low"
            interventions.append({
                "category": "recovery_protocol",
                "title": "Active Recovery Protocol",
                "description": (
                    "Your recovery reserves are low. Consider light stretching, "
                    "deep breathing, and an early bedtime tonight."
                ),
                "priority": "high",
                "estimated_impact": 0.6,
            })

        # Recovery hampered by poor sleep
        elif recovery < 55 and sleep < 6.5:
            urgency = "moderate"
            confidence = 0.65
            assessment = "Recovery limited by sleep deficit"
            interventions.append({
                "category": "sleep_schedule",
                "title": "Prioritise Sleep for Recovery",
                "description": (
                    f"You slept {sleep:.1f}h — recovery needs at least 7h. "
                    "Try to create a wind-down routine 30 minutes before bed."
                ),
                "priority": "moderate",
                "estimated_impact": 0.5,
            })

        # Recovery strained by high stress
        elif recovery < 60 and stress > 55:
            urgency = "moderate"
            confidence = 0.6
            assessment = "Recovery competing with elevated stress"
            interventions.append({
                "category": "stress_management",
                "title": "Stress-Recovery Balance",
                "description": (
                    "Stress is consuming recovery resources. "
                    "A 5-minute breathing exercise can help redistribute energy."
                ),
                "priority": "moderate",
                "estimated_impact": 0.4,
            })

        # Recovery adequate but could improve
        elif recovery < 70:
            urgency = "low"
            confidence = 0.5
            assessment = "Recovery is acceptable but has room to improve"
            interventions.append({
                "category": "movement_break",
                "title": "Gentle Movement for Recovery",
                "description": (
                    "Light activity like a short walk can enhance recovery. "
                    "Avoid intense exercise until recovery improves."
                ),
                "priority": "low",
                "estimated_impact": 0.25,
            })

        return {
            "agent": self.name,
            "domain": self.domain,
            "assessment": assessment,
            "urgency": urgency,
            "confidence": confidence,
            "rationale": (
                f"Recovery={recovery:.0f}, Fatigue={fatigue:.0f}, "
                f"Stress={stress:.0f}, Sleep={sleep:.1f}h"
            ),
            "interventions": interventions,
            "priority_weight": self.priority_weight,
            "evaluated_at": datetime.utcnow().isoformat(),
        }
