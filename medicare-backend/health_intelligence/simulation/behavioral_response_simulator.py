"""
health_intelligence/simulation/behavioral_response_simulator.py
───────────────────────────────────────────────
Predicts likely user response to proposed interventions.

Estimates:
  - Adherence probability
  - Motivation changes
  - Intervention fatigue
  - Resistance patterns
  - Recovery compliance

Uses historical intervention memory from twin.
"""

import logging
import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class BehavioralResponseSimulator:
    """
    Predicts how a user will likely respond to
    proposed interventions based on historical patterns.
    """

    def __init__(self):
        # user_id → category → list of (accepted, completed)
        self._history: dict[int, dict[str, list[tuple[bool, bool]]]] = defaultdict(
            lambda: defaultdict(list),
        )

    def record_response(
        self,
        user_id: int,
        category: str,
        accepted: bool,
        completed: bool = False,
    ) -> None:
        """Record a historical response."""
        self._history[user_id][category].append((accepted, completed))
        # Keep last 50 per category
        if len(self._history[user_id][category]) > 50:
            self._history[user_id][category] = (
                self._history[user_id][category][-50:]
            )

    def predict_response(
        self,
        user_id: int,
        category: str,
        stress_level: float = 40,
        fatigue: float = 30,
        interventions_today: int = 0,
    ) -> dict:
        """
        Predict user response to a proposed intervention.
        """
        history = self._history.get(user_id, {}).get(category, [])

        # Base rates from history
        if history:
            acceptance_rate = sum(1 for a, _ in history if a) / len(history)
            completion_rate = (
                sum(1 for a, c in history if c) /
                max(sum(1 for a, _ in history if a), 1)
            )
        else:
            acceptance_rate = 0.6  # default optimistic
            completion_rate = 0.5

        # Contextual adjustments
        # High stress reduces acceptance
        stress_penalty = max(0, (stress_level - 50) * 0.008)
        # Fatigue reduces completion
        fatigue_penalty = max(0, (fatigue - 40) * 0.006)
        # Intervention fatigue (more today = less likely)
        saturation_penalty = interventions_today * 0.1

        adjusted_acceptance = max(0.05, min(0.95,
            acceptance_rate - stress_penalty - saturation_penalty,
        ))
        adjusted_completion = max(0.05, min(0.95,
            completion_rate - fatigue_penalty - saturation_penalty * 0.5,
        ))

        # Motivation estimate
        motivation = adjusted_acceptance * 0.6 + adjusted_completion * 0.4

        # Resistance detection
        recent = history[-5:] if history else []
        recent_rejections = sum(1 for a, _ in recent if not a)
        resistance_detected = recent_rejections >= 3

        # Fatigue detection
        intervention_fatigue = saturation_penalty > 0.3

        return {
            "category": category,
            "predicted_acceptance": round(adjusted_acceptance, 3),
            "predicted_completion": round(adjusted_completion, 3),
            "motivation_score": round(motivation, 3),
            "resistance_detected": resistance_detected,
            "intervention_fatigue": intervention_fatigue,
            "historical_samples": len(history),
            "recommendation": self._recommendation(
                adjusted_acceptance, resistance_detected,
                intervention_fatigue,
            ),
        }

    def predict_batch(
        self,
        user_id: int,
        categories: list[str],
        stress_level: float = 40,
        fatigue: float = 30,
        interventions_today: int = 0,
    ) -> list[dict]:
        """Predict responses for multiple categories."""
        return [
            self.predict_response(
                user_id, cat, stress_level, fatigue,
                interventions_today + i,
            )
            for i, cat in enumerate(categories)
        ]

    def get_user_profile(self, user_id: int) -> dict:
        """Get the user's behavioral response profile."""
        all_history = self._history.get(user_id, {})
        profile: dict[str, dict] = {}

        for category, responses in all_history.items():
            if not responses:
                continue
            acceptance = sum(1 for a, _ in responses if a) / len(responses)
            completion = (
                sum(1 for a, c in responses if c) /
                max(sum(1 for a, _ in responses if a), 1)
            )
            profile[category] = {
                "acceptance_rate": round(acceptance, 3),
                "completion_rate": round(completion, 3),
                "total_interactions": len(responses),
            }

        return {
            "user_id": user_id,
            "categories": profile,
            "total_categories": len(profile),
        }

    @staticmethod
    def _recommendation(
        acceptance: float,
        resistance: bool,
        fatigue: bool,
    ) -> str:
        if resistance:
            return "User shows resistance to this category. Consider alternative approaches."
        if fatigue:
            return "Intervention fatigue detected. Defer non-essential recommendations."
        if acceptance < 0.3:
            return "Low predicted acceptance. Use low-friction alternatives."
        if acceptance > 0.7:
            return "High predicted acceptance. Good candidate for delivery."
        return "Moderate acceptance expected. Consider timing and framing."
