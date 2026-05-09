"""
health_intelligence/intervention/behavioral_friction.py
───────────────────────────────────────────────
Estimates likelihood of user adherence for proposed
interventions and prioritises low-friction options.

Friction factors:
  - Intervention complexity (how many steps?)
  - Cognitive load (mental effort required)
  - Time commitment (minutes needed)
  - Habit disruption (how much does it change routine?)
  - Current stress state (stressed users resist change)
  - Engagement history (does user follow through?)

Output:
  - adherence_probability (0–1)
  - friction_score (0–100)
  - friction_breakdown
  - adjustment_recommendations
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class InterventionFriction:
    """Friction assessment for a single intervention."""
    intervention_id: str
    friction_score: float            # 0–100 (lower = easier)
    adherence_probability: float     # 0–1
    complexity: float                # 0–1
    cognitive_load: float            # 0–1
    time_commitment_minutes: float
    habit_disruption: float          # 0–1
    user_readiness: float            # 0–1
    recommendation: str


# Complexity weights per intervention category
CATEGORY_COMPLEXITY = {
    "hydration": 0.1,
    "breathing": 0.15,
    "movement_break": 0.15,
    "sleep_hygiene": 0.3,
    "exercise": 0.4,
    "stress_management": 0.35,
    "diet": 0.5,
    "meditation": 0.25,
    "social": 0.45,
    "screen_reduction": 0.3,
    "sleep_schedule": 0.55,
    "recovery_protocol": 0.4,
}

TIME_ESTIMATES = {
    "hydration": 1,
    "breathing": 5,
    "movement_break": 5,
    "sleep_hygiene": 15,
    "exercise": 30,
    "stress_management": 15,
    "diet": 20,
    "meditation": 10,
    "social": 30,
    "screen_reduction": 0,
    "sleep_schedule": 0,
    "recovery_protocol": 20,
}


class BehavioralFrictionEstimator:
    """
    Estimates intervention adherence likelihood based on
    user state, history, and intervention complexity.
    """

    def __init__(self):
        # user_id → category → acceptance rate
        self._history: dict[int, dict[str, list[bool]]] = {}

    def estimate_friction(
        self,
        user_id: int,
        intervention_id: str,
        category: str,
        stress_level: float = 40,
        fatigue_level: float = 30,
        current_state: str = "normal",
        engagement_score: float = 0.5,
    ) -> InterventionFriction:
        """
        Estimate friction and adherence for an intervention.
        """
        # Base complexity
        complexity = CATEGORY_COMPLEXITY.get(category, 0.3)
        time_mins = TIME_ESTIMATES.get(category, 10)

        # Cognitive load: higher when stressed or fatigued
        cognitive = min(1.0, complexity * 0.5 + (stress_level / 100) * 0.3 + (fatigue_level / 100) * 0.2)

        # Habit disruption: higher for lifestyle changes
        disruption = min(1.0, complexity * 0.7 + 0.1)

        # User readiness: based on state and engagement
        if current_state in ("stressed", "fatigued", "abnormal"):
            readiness = max(0.1, engagement_score * 0.6)
        else:
            readiness = min(1.0, engagement_score * 0.8 + 0.2)

        # Historical acceptance rate
        hist = self._history.get(user_id, {}).get(category, [])
        if hist:
            hist_rate = sum(hist) / len(hist)
            readiness = readiness * 0.6 + hist_rate * 0.4

        # Friction score (0–100)
        friction = (
            complexity * 30
            + cognitive * 25
            + disruption * 20
            + (1 - readiness) * 25
        )
        friction = min(100, max(0, friction))

        # Adherence probability
        adherence = max(0.05, min(0.95, 1.0 - friction / 100))

        # Adjustment recommendation
        if friction > 70:
            rec = "Consider a simpler alternative — high friction risk."
        elif friction > 50:
            rec = "Moderate friction — break into smaller steps if possible."
        elif friction > 30:
            rec = "Reasonable friction — user likely to engage."
        else:
            rec = "Low friction — high likelihood of adherence."

        return InterventionFriction(
            intervention_id=intervention_id,
            friction_score=round(friction, 1),
            adherence_probability=round(adherence, 3),
            complexity=round(complexity, 3),
            cognitive_load=round(cognitive, 3),
            time_commitment_minutes=time_mins,
            habit_disruption=round(disruption, 3),
            user_readiness=round(readiness, 3),
            recommendation=rec,
        )

    def record_response(
        self,
        user_id: int,
        category: str,
        accepted: bool,
    ) -> None:
        """Record whether user accepted/completed an intervention."""
        if user_id not in self._history:
            self._history[user_id] = {}
        if category not in self._history[user_id]:
            self._history[user_id][category] = []
        self._history[user_id][category].append(accepted)
        # Keep last 30
        if len(self._history[user_id][category]) > 30:
            self._history[user_id][category] = self._history[user_id][category][-30:]

    def get_user_profile(self, user_id: int) -> dict:
        """Get user's friction profile."""
        hist = self._history.get(user_id, {})
        profile: dict[str, dict] = {}
        for cat, responses in hist.items():
            rate = sum(responses) / len(responses) if responses else 0
            profile[cat] = {
                "acceptance_rate": round(rate, 3),
                "total_offered": len(responses),
                "resistance_level": "high" if rate < 0.3 else "moderate" if rate < 0.6 else "low",
            }
        return profile

    def rank_by_adherence(
        self,
        interventions: list[InterventionFriction],
    ) -> list[InterventionFriction]:
        """Rank interventions by adherence probability (highest first)."""
        return sorted(
            interventions,
            key=lambda i: i.adherence_probability,
            reverse=True,
        )
