"""
health_intelligence/agents/resilience_agent.py
───────────────────────────────────────────────
Autonomous resilience agent — focuses on long-term
stress tolerance capacity and adaptive growth.

Watches:
  - Resilience capacity trends
  - Stress tolerance ceiling
  - Recovery consistency
  - Adaptation patterns over weeks
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class ResilienceAgent:
    """
    Monitors long-term resilience capacity and proposes
    interventions for sustained stress tolerance growth.
    """

    name = "resilience_agent"
    domain = "resilience"
    priority_weight = 0.55  # Lower urgency, long-term focus

    def evaluate(
        self,
        user_id: int,
        signals: dict[str, float],
        twin_state: Optional[dict] = None,
    ) -> dict:
        recovery = signals.get("recovery_score", 70)
        stress = signals.get("stress_level", 40)
        fatigue = signals.get("fatigue", 30)
        wellness = signals.get("wellness_score", 65)
        resilience = signals.get("resilience", recovery * 0.8)

        # Extract identity archetype if available
        archetype = "steady"
        if twin_state and "identity" in twin_state:
            archetype = twin_state["identity"].get("archetype", "steady")

        interventions: list[dict] = []
        assessment = "Resilience capacity is stable"
        urgency = "low"
        confidence = 0.45

        # Resilience critically low
        if resilience < 35:
            urgency = "high"
            confidence = 0.7
            assessment = "Resilience reserves are depleted"
            interventions.append({
                "category": "recovery_protocol",
                "title": "Resilience Restoration",
                "description": (
                    "Your stress tolerance reserves are low. "
                    "Focus on protective habits: consistent sleep, "
                    "minimal cognitive demands, and gentle movement."
                ),
                "priority": "high",
                "estimated_impact": 0.5,
            })

        # Low resilience with ongoing stress
        elif resilience < 50 and stress > 50:
            urgency = "moderate"
            confidence = 0.6
            assessment = "Resilience eroding under sustained stress"
            interventions.append({
                "category": "stress_management",
                "title": "Resilience Protection",
                "description": (
                    "Stress is consuming resilience faster than it "
                    "regenerates. Introduce one stress-boundary today — "
                    "a 'no work after 8pm' rule, for example."
                ),
                "priority": "moderate",
                "estimated_impact": 0.4,
            })

        # Resilience growing — reinforce
        elif resilience > 70 and wellness > 65:
            urgency = "low"
            confidence = 0.5
            assessment = "Resilience is growing — reinforce current habits"
            interventions.append({
                "category": "encouragement",
                "title": "Resilience Growth Recognised",
                "description": (
                    "Your resilience capacity is strong. The habits "
                    "you've built are working — keep this consistency."
                ),
                "priority": "low",
                "estimated_impact": 0.15,
            })

        # Fragile archetype — extra protection
        elif archetype == "fragile":
            urgency = "moderate"
            confidence = 0.55
            assessment = "Sensitive resilience profile needs protection"
            interventions.append({
                "category": "recovery_protocol",
                "title": "Gentle Resilience Building",
                "description": (
                    "Your wellness profile benefits from gradual, "
                    "low-pressure resilience building. One small "
                    "positive habit at a time is the most effective path."
                ),
                "priority": "moderate",
                "estimated_impact": 0.3,
            })

        return {
            "agent": self.name,
            "domain": self.domain,
            "assessment": assessment,
            "urgency": urgency,
            "confidence": confidence,
            "rationale": (
                f"Resilience={resilience:.0f}, Recovery={recovery:.0f}, "
                f"Stress={stress:.0f}, Archetype={archetype}"
            ),
            "interventions": interventions,
            "priority_weight": self.priority_weight,
            "evaluated_at": datetime.utcnow().isoformat(),
        }
