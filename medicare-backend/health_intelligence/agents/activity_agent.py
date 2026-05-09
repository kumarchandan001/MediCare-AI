"""
health_intelligence/agents/activity_agent.py
───────────────────────────────────────────────
Autonomous activity agent — balances movement,
energy expenditure, and sedentary risk.

Watches:
  - Daily step count
  - Active minutes
  - Sedentary duration
  - Activity vs recovery balance
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class ActivityAgent:
    """
    Monitors activity patterns and proposes
    movement-balance interventions.
    """

    name = "activity_agent"
    domain = "activity"
    priority_weight = 0.60

    def evaluate(
        self,
        user_id: int,
        signals: dict[str, float],
        twin_state: Optional[dict] = None,
    ) -> dict:
        steps = signals.get("steps", 6000)
        active = signals.get("active_minutes", 25)
        fatigue = signals.get("fatigue", 30)
        recovery = signals.get("recovery_score", 70)

        interventions: list[dict] = []
        assessment = "Activity levels are balanced"
        urgency = "low"
        confidence = 0.5

        # Very sedentary
        if steps < 3000 and active < 10:
            urgency = "moderate"
            confidence = 0.65
            assessment = "Sedentary risk detected"
            interventions.append({
                "category": "movement_break",
                "title": "Break the Sedentary Streak",
                "description": (
                    f"Only {steps:.0f} steps and {active:.0f} active minutes "
                    "so far. Even a 5-minute walk can improve circulation "
                    "and reduce fatigue."
                ),
                "priority": "moderate",
                "estimated_impact": 0.4,
            })

        # Low activity but recovery is good (opportunity)
        elif steps < 5000 and recovery > 65:
            urgency = "low"
            confidence = 0.5
            assessment = "Room for more activity while recovery allows"
            interventions.append({
                "category": "exercise",
                "title": "Leverage Good Recovery",
                "description": (
                    "Recovery is strong — a great opportunity to add "
                    "some light exercise. A 15-minute walk or stretch "
                    "session would be beneficial."
                ),
                "priority": "low",
                "estimated_impact": 0.3,
            })

        # Over-exercising while fatigued
        elif active > 60 and fatigue > 55:
            urgency = "moderate"
            confidence = 0.6
            assessment = "Activity may be exceeding recovery capacity"
            interventions.append({
                "category": "recovery_protocol",
                "title": "Activity-Recovery Imbalance",
                "description": (
                    f"You've been active {active:.0f} minutes but fatigue "
                    f"is at {fatigue:.0f}. Consider a lighter activity "
                    "day to allow your body to catch up."
                ),
                "priority": "moderate",
                "estimated_impact": 0.35,
            })

        return {
            "agent": self.name,
            "domain": self.domain,
            "assessment": assessment,
            "urgency": urgency,
            "confidence": confidence,
            "rationale": (
                f"Steps={steps:.0f}, Active={active:.0f}min, "
                f"Fatigue={fatigue:.0f}, Recovery={recovery:.0f}"
            ),
            "interventions": interventions,
            "priority_weight": self.priority_weight,
            "evaluated_at": datetime.utcnow().isoformat(),
        }
