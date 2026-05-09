"""
health_intelligence/agents/sleep_agent.py
───────────────────────────────────────────────
Autonomous sleep agent — improves sleep consistency,
duration, and quality.

Watches:
  - Sleep duration vs ideal
  - Sleep debt accumulation
  - Sleep timing consistency
  - Impact on recovery and stress
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class SleepAgent:
    """
    Monitors sleep patterns and proposes interventions
    to improve sleep consistency and quality.
    """

    name = "sleep_agent"
    domain = "sleep"
    priority_weight = 0.80

    def evaluate(
        self,
        user_id: int,
        signals: dict[str, float],
        twin_state: Optional[dict] = None,
    ) -> dict:
        sleep = signals.get("sleep_hours", 7.5)
        fatigue = signals.get("fatigue", 30)
        stress = signals.get("stress_level", 40)
        recovery = signals.get("recovery_score", 70)

        interventions: list[dict] = []
        assessment = "Sleep patterns are healthy"
        urgency = "low"
        confidence = 0.5

        # Severe sleep deficit
        if sleep < 5.0:
            urgency = "high"
            confidence = 0.8
            assessment = "Critical sleep deficit"
            interventions.append({
                "category": "sleep_schedule",
                "title": "Urgent Sleep Recovery",
                "description": (
                    f"You slept only {sleep:.1f}h. Your body needs "
                    "at least 7 hours to maintain recovery capacity. "
                    "Tonight, aim to be in bed 30 minutes earlier."
                ),
                "priority": "high",
                "estimated_impact": 0.7,
            })

        # Moderate deficit
        elif sleep < 6.5:
            urgency = "moderate"
            confidence = 0.65
            assessment = "Sleep duration below optimal"
            interventions.append({
                "category": "sleep_hygiene",
                "title": "Improve Sleep Duration",
                "description": (
                    f"At {sleep:.1f}h, you're below the recommended "
                    "7–8 hours. Reduce screen time 1 hour before bed "
                    "and keep a consistent bedtime."
                ),
                "priority": "moderate",
                "estimated_impact": 0.5,
            })

        # Sleep okay but fatigue high (quality issue)
        elif sleep >= 7.0 and fatigue > 55:
            urgency = "moderate"
            confidence = 0.55
            assessment = "Adequate duration but poor sleep quality"
            interventions.append({
                "category": "sleep_hygiene",
                "title": "Enhance Sleep Quality",
                "description": (
                    "You're sleeping enough hours but still fatigued. "
                    "Consider evaluating sleep environment: darkness, "
                    "temperature (18–20°C), and noise levels."
                ),
                "priority": "moderate",
                "estimated_impact": 0.4,
            })

        # Good sleep, stress-driven insomnia risk
        elif stress > 60:
            urgency = "low"
            confidence = 0.45
            assessment = "Stress may impact tonight's sleep"
            interventions.append({
                "category": "meditation",
                "title": "Pre-Sleep Relaxation",
                "description": (
                    "Your stress is elevated, which may affect sleep onset. "
                    "A 5-minute guided breathing exercise before bed can help."
                ),
                "priority": "low",
                "estimated_impact": 0.3,
            })

        return {
            "agent": self.name,
            "domain": self.domain,
            "assessment": assessment,
            "urgency": urgency,
            "confidence": confidence,
            "rationale": f"Sleep={sleep:.1f}h, Fatigue={fatigue:.0f}, Stress={stress:.0f}",
            "interventions": interventions,
            "priority_weight": self.priority_weight,
            "evaluated_at": datetime.utcnow().isoformat(),
        }
