"""
health_intelligence/adaptation/intervention_adaptation.py
───────────────────────────────────────────────
Adjusts intervention selection and delivery based
on accumulated success/failure feedback.

Adapts:
  - Category selection per user profile
  - Intervention intensity (gentle → moderate → strong)
  - Timing preferences
  - Framing style
  - Frequency based on resistance
"""

import logging
from collections import defaultdict
from datetime import datetime

log = logging.getLogger(__name__)


class InterventionAdaptation:
    """
    Adapts intervention strategies based on
    accumulated feedback loops.
    """

    def __init__(self):
        # user_id → category → adaptation state
        self._state: dict[int, dict[str, dict]] = defaultdict(
            lambda: defaultdict(lambda: {
                "intensity": "gentle",
                "frequency_bias": 1.0,
                "consecutive_rejections": 0,
                "consecutive_completions": 0,
                "adaptation_stage": "exploring",
            }),
        )

    def adapt(
        self,
        user_id: int,
        category: str,
        accepted: bool,
        completed: bool = False,
    ) -> dict:
        """Update adaptation state from feedback."""
        s = self._state[user_id][category]

        if accepted:
            s["consecutive_rejections"] = 0
            if completed:
                s["consecutive_completions"] += 1
                # Escalate intensity if consistently completing
                if s["consecutive_completions"] >= 3 and s["intensity"] == "gentle":
                    s["intensity"] = "moderate"
                    s["adaptation_stage"] = "progressing"
                elif s["consecutive_completions"] >= 5 and s["intensity"] == "moderate":
                    s["intensity"] = "strong"
                    s["adaptation_stage"] = "advanced"
            else:
                s["consecutive_completions"] = 0
        else:
            s["consecutive_rejections"] += 1
            s["consecutive_completions"] = 0

            # De-escalate on rejection
            if s["consecutive_rejections"] >= 2:
                if s["intensity"] == "strong":
                    s["intensity"] = "moderate"
                elif s["intensity"] == "moderate":
                    s["intensity"] = "gentle"
                s["adaptation_stage"] = "retreating"

            # Reduce frequency on sustained rejection
            if s["consecutive_rejections"] >= 3:
                s["frequency_bias"] = max(0.2, s["frequency_bias"] - 0.2)
                s["adaptation_stage"] = "paused"

            # Recover frequency slowly on acceptance
        if accepted:
            s["frequency_bias"] = min(1.0, s["frequency_bias"] + 0.05)

        return dict(s)

    def get_adapted_settings(
        self,
        user_id: int,
        category: str,
    ) -> dict:
        """Get adapted settings for a category."""
        s = self._state.get(user_id, {}).get(category, {})
        return {
            "category": category,
            "intensity": s.get("intensity", "gentle"),
            "frequency_bias": round(s.get("frequency_bias", 1.0), 2),
            "adaptation_stage": s.get("adaptation_stage", "exploring"),
            "consecutive_completions": s.get("consecutive_completions", 0),
            "consecutive_rejections": s.get("consecutive_rejections", 0),
        }

    def should_deliver(
        self,
        user_id: int,
        category: str,
    ) -> bool:
        """Check if an intervention should be delivered based on adaptation."""
        s = self._state.get(user_id, {}).get(category, {})
        if s.get("adaptation_stage") == "paused":
            return False
        return s.get("frequency_bias", 1.0) > 0.3

    def get_all_adaptations(self, user_id: int) -> dict:
        """Get all adaptation states for a user."""
        states = self._state.get(user_id, {})
        return {
            cat: self.get_adapted_settings(user_id, cat)
            for cat in states
        }
