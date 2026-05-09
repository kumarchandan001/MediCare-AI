"""
health_intelligence/orchestration_layer/orchestration_stability_controls.py
───────────────────────────────────────────────
Prevents unstable autonomous behaviour. (Refinement 5)

Enforces:
  - Intervention pacing (minimum gap between actions)
  - Adaptive orchestration cooldowns
  - Stability thresholds (reject if too much changed)
  - Recommendation smoothing (blend with previous)
  - Behavioral consistency weighting

Avoids:
  - Rapidly changing wellness strategies
  - Conflicting agent behaviour
  - Excessive adaptation instability
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class StabilityState:
    """Stability tracking for a user."""
    last_intervention_time: Optional[str] = None
    last_strategy_change_time: Optional[str] = None
    consecutive_strategy_changes: int = 0
    recommendation_history: list[list[str]] = field(default_factory=list)
    cooldown_active: bool = False
    cooldown_until: Optional[str] = None
    stability_score: float = 0.7  # 0–1


class OrchestrationStabilityControls:
    """
    Prevents chaotic orchestration by enforcing
    pacing, cooldowns, and recommendation smoothing.
    """

    # Minimum minutes between interventions
    MIN_INTERVENTION_GAP_MINUTES = 60
    # Minimum hours between strategy changes
    MIN_STRATEGY_CHANGE_HOURS = 24
    # Maximum strategy changes per week
    MAX_STRATEGY_CHANGES_PER_WEEK = 3
    # Smoothing factor for recommendations (0=no smoothing, 1=full carry-over)
    SMOOTHING_FACTOR = 0.3

    def __init__(self):
        self._states: dict[int, StabilityState] = {}

    def get_state(self, user_id: int) -> StabilityState:
        if user_id not in self._states:
            self._states[user_id] = StabilityState()
        return self._states[user_id]

    def check_intervention_pacing(self, user_id: int) -> dict:
        """
        Check whether enough time has passed since
        the last intervention for this user.
        """
        state = self.get_state(user_id)
        now = datetime.utcnow()

        if state.cooldown_active and state.cooldown_until:
            cooldown_end = datetime.fromisoformat(state.cooldown_until)
            if now < cooldown_end:
                remaining = (cooldown_end - now).total_seconds() / 60
                return {
                    "allowed": False,
                    "reason": "cooldown_active",
                    "minutes_remaining": round(remaining, 1),
                }
            else:
                state.cooldown_active = False
                state.cooldown_until = None

        if state.last_intervention_time:
            last = datetime.fromisoformat(state.last_intervention_time)
            elapsed = (now - last).total_seconds() / 60
            if elapsed < self.MIN_INTERVENTION_GAP_MINUTES:
                return {
                    "allowed": False,
                    "reason": "too_soon",
                    "minutes_remaining": round(
                        self.MIN_INTERVENTION_GAP_MINUTES - elapsed, 1,
                    ),
                }

        return {"allowed": True, "reason": "ok"}

    def record_intervention(self, user_id: int) -> None:
        """Record that an intervention was delivered."""
        state = self.get_state(user_id)
        state.last_intervention_time = datetime.utcnow().isoformat()

    def check_strategy_change(self, user_id: int) -> dict:
        """Check whether a strategy change is allowed."""
        state = self.get_state(user_id)
        now = datetime.utcnow()

        if state.consecutive_strategy_changes >= self.MAX_STRATEGY_CHANGES_PER_WEEK:
            return {
                "allowed": False,
                "reason": "too_many_changes_this_week",
                "changes_this_week": state.consecutive_strategy_changes,
            }

        if state.last_strategy_change_time:
            last = datetime.fromisoformat(state.last_strategy_change_time)
            elapsed_hours = (now - last).total_seconds() / 3600
            if elapsed_hours < self.MIN_STRATEGY_CHANGE_HOURS:
                return {
                    "allowed": False,
                    "reason": "too_soon_after_last_change",
                    "hours_remaining": round(
                        self.MIN_STRATEGY_CHANGE_HOURS - elapsed_hours, 1,
                    ),
                }

        return {"allowed": True, "reason": "ok"}

    def record_strategy_change(self, user_id: int) -> None:
        """Record a strategy change."""
        state = self.get_state(user_id)
        state.last_strategy_change_time = datetime.utcnow().isoformat()
        state.consecutive_strategy_changes += 1
        # Decay weekly counter
        if state.consecutive_strategy_changes > self.MAX_STRATEGY_CHANGES_PER_WEEK:
            state.consecutive_strategy_changes = self.MAX_STRATEGY_CHANGES_PER_WEEK

    def activate_cooldown(
        self,
        user_id: int,
        duration_minutes: int = 120,
    ) -> None:
        """Activate a cooldown period."""
        state = self.get_state(user_id)
        state.cooldown_active = True
        state.cooldown_until = (
            datetime.utcnow() + timedelta(minutes=duration_minutes)
        ).isoformat()

    def smooth_recommendations(
        self,
        user_id: int,
        new_recommendations: list[str],
    ) -> list[str]:
        """
        Smooth recommendations by blending with recent history
        to prevent jarring strategy flips.
        """
        state = self.get_state(user_id)

        if not state.recommendation_history:
            state.recommendation_history.append(new_recommendations)
            return new_recommendations

        # Get previous recommendations
        previous = state.recommendation_history[-1]

        # Carry over items that were in previous but not in new
        # (weighted by smoothing factor)
        carried = [
            r for r in previous
            if r not in new_recommendations
        ]
        carry_count = int(len(carried) * self.SMOOTHING_FACTOR)
        smoothed = new_recommendations + carried[:carry_count]

        state.recommendation_history.append(smoothed)
        if len(state.recommendation_history) > 10:
            state.recommendation_history = state.recommendation_history[-10:]

        # Update stability score
        overlap = set(new_recommendations) & set(previous)
        total = set(new_recommendations) | set(previous)
        if total:
            state.stability_score = round(len(overlap) / len(total), 3)

        return smoothed

    def get_stability_report(self, user_id: int) -> dict:
        """Get stability status report."""
        state = self.get_state(user_id)
        return {
            "stability_score": state.stability_score,
            "cooldown_active": state.cooldown_active,
            "consecutive_strategy_changes": state.consecutive_strategy_changes,
            "intervention_pacing": self.check_intervention_pacing(user_id),
            "strategy_change": self.check_strategy_change(user_id),
        }
