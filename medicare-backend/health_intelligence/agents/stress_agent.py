"""
health_intelligence/agents/stress_agent.py
───────────────────────────────────────────────
Autonomous stress agent — reduces chronic stress
overload and prevents burnout accumulation.

Watches:
  - Sustained stress levels
  - Stress-recovery imbalance
  - HRV depression
  - Burnout risk trajectory
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class StressAgent:
    """
    Monitors stress patterns and proposes interventions
    to reduce chronic overload.
    """

    name = "stress_agent"
    domain = "stress"
    priority_weight = 0.90  # Highest priority

    def evaluate(
        self,
        user_id: int,
        signals: dict[str, float],
        twin_state: Optional[dict] = None,
    ) -> dict:
        stress = signals.get("stress_level", 40)
        hrv = signals.get("hrv_ms", 45)
        burnout = signals.get("burnout_risk", 0.1)
        recovery = signals.get("recovery_score", 70)
        fatigue = signals.get("fatigue", 30)

        interventions: list[dict] = []
        assessment = "Stress levels are manageable"
        urgency = "low"
        confidence = 0.5

        # Critical: burnout territory
        if burnout > 0.7 or (stress > 75 and recovery < 40):
            urgency = "critical"
            confidence = 0.8
            assessment = "Burnout risk is critically elevated"
            interventions.append({
                "category": "stress_management",
                "title": "Immediate Stress Reduction",
                "description": (
                    "Your stress-recovery balance is critically strained. "
                    "Take a 10-minute break now: step outside, breathe "
                    "deeply, and disconnect from work tasks."
                ),
                "priority": "critical",
                "estimated_impact": 0.6,
            })
            interventions.append({
                "category": "recovery_protocol",
                "title": "Protected Recovery Window",
                "description": (
                    "Block 2 hours tonight for complete rest — no screens, "
                    "no demands. Your body needs uninterrupted recovery."
                ),
                "priority": "high",
                "estimated_impact": 0.5,
            })

        # High sustained stress
        elif stress > 60:
            urgency = "high"
            confidence = 0.7
            assessment = "Sustained stress above safe levels"
            interventions.append({
                "category": "breathing",
                "title": "Structured Breathing Break",
                "description": (
                    f"Stress is at {stress:.0f}. Try box breathing: "
                    "4 seconds in, 4 seconds hold, 4 seconds out, "
                    "4 seconds hold. Repeat 5 times."
                ),
                "priority": "high",
                "estimated_impact": 0.45,
            })

        # HRV depression (autonomic stress)
        elif hrv < 25 and stress > 45:
            urgency = "moderate"
            confidence = 0.6
            assessment = "Autonomic stress indicators elevated"
            interventions.append({
                "category": "meditation",
                "title": "Parasympathetic Activation",
                "description": (
                    "Your HRV suggests autonomic stress. A 5-minute "
                    "body scan meditation can help activate your "
                    "parasympathetic nervous system."
                ),
                "priority": "moderate",
                "estimated_impact": 0.4,
            })

        # Moderate stress with fatigue
        elif stress > 50 and fatigue > 45:
            urgency = "moderate"
            confidence = 0.55
            assessment = "Stress-fatigue combination wearing on recovery"
            interventions.append({
                "category": "movement_break",
                "title": "Active Stress Release",
                "description": (
                    "A short walk or gentle stretch can reduce both "
                    "stress and fatigue simultaneously."
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
                f"Stress={stress:.0f}, HRV={hrv:.0f}ms, "
                f"Burnout={burnout:.2f}, Recovery={recovery:.0f}"
            ),
            "interventions": interventions,
            "priority_weight": self.priority_weight,
            "evaluated_at": datetime.utcnow().isoformat(),
        }
