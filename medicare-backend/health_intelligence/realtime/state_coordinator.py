"""
health_intelligence/realtime/state_coordinator.py
───────────────────────────────────────────────
Cross-module state coordinator — ensures the realtime
engine, longitudinal intelligence, personalization layer,
forecasting engine, and alert systems share synchronized
health state context.

This is the "shared brain" that all modules read from
and write to, preventing isolated processing.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

log = logging.getLogger(__name__)


@dataclass
class UserHealthContext:
    """
    Synchronized health state context for one user.
    All modules read from and write to this shared state.
    """
    user_id: int

    # Current physiological state
    current_state: str = "unknown"
    state_confidence: float = 0.0
    state_updated_at: Optional[datetime] = None

    # Current scores
    health_score: Optional[float] = None
    recovery_score: Optional[float] = None
    wellness_index: Optional[float] = None
    fatigue_score: Optional[float] = None

    # Current baselines
    baselines: dict[str, float] = field(default_factory=dict)
    baseline_confidence: float = 0.0

    # Active session
    active_session_type: Optional[str] = None
    active_session_id: Optional[int] = None

    # Trend context
    trend_direction: str = "stable"  # improving | stable | declining
    deterioration_score: float = 0.0

    # Recovery context
    recovery_state: Optional[str] = None  # recovering | stable | declining
    recovery_velocity: float = 0.5

    # Alert context
    active_alert_count: int = 0
    last_alert_time: Optional[datetime] = None

    # Circadian
    circadian_phase: str = "unknown"

    # Data quality
    stream_health: float = 1.0
    last_data_time: Optional[datetime] = None

    # Last full update
    last_synchronized: Optional[datetime] = None


class StateCoordinator:
    """
    Central state coordinator that maintains a synchronized
    view of each user's health context across all modules.
    """

    def __init__(self):
        self._contexts: dict[int, UserHealthContext] = {}

    def get_context(self, user_id: int) -> UserHealthContext:
        """Get or create the health context for a user."""
        if user_id not in self._contexts:
            self._contexts[user_id] = UserHealthContext(user_id=user_id)
        return self._contexts[user_id]

    # ── State updates ────────────────────────────────────────

    def update_physiological_state(
        self,
        user_id: int,
        state: str,
        confidence: float,
    ) -> None:
        """Update the current physiological state."""
        ctx = self.get_context(user_id)
        ctx.current_state = state
        ctx.state_confidence = confidence
        ctx.state_updated_at = datetime.utcnow()

    def update_scores(
        self,
        user_id: int,
        health_score: Optional[float] = None,
        recovery_score: Optional[float] = None,
        wellness_index: Optional[float] = None,
        fatigue_score: Optional[float] = None,
    ) -> None:
        """Update current health scores."""
        ctx = self.get_context(user_id)
        if health_score is not None:
            ctx.health_score = health_score
        if recovery_score is not None:
            ctx.recovery_score = recovery_score
        if wellness_index is not None:
            ctx.wellness_index = wellness_index
        if fatigue_score is not None:
            ctx.fatigue_score = fatigue_score

    def update_baselines(
        self,
        user_id: int,
        baselines: dict[str, float],
        confidence: float,
    ) -> None:
        """Update current baselines."""
        ctx = self.get_context(user_id)
        ctx.baselines = baselines
        ctx.baseline_confidence = confidence

    def update_session(
        self,
        user_id: int,
        session_type: Optional[str],
        session_id: Optional[int] = None,
    ) -> None:
        """Update active session info."""
        ctx = self.get_context(user_id)
        ctx.active_session_type = session_type
        ctx.active_session_id = session_id

    def update_trends(
        self,
        user_id: int,
        direction: str,
        deterioration: float,
    ) -> None:
        """Update trend context."""
        ctx = self.get_context(user_id)
        ctx.trend_direction = direction
        ctx.deterioration_score = deterioration

    def update_recovery(
        self,
        user_id: int,
        state: str,
        velocity: float,
    ) -> None:
        """Update recovery context."""
        ctx = self.get_context(user_id)
        ctx.recovery_state = state
        ctx.recovery_velocity = velocity

    def update_alerts(
        self,
        user_id: int,
        active_count: int,
    ) -> None:
        """Update alert context."""
        ctx = self.get_context(user_id)
        ctx.active_alert_count = active_count
        if active_count > 0:
            ctx.last_alert_time = datetime.utcnow()

    def update_circadian(
        self,
        user_id: int,
        phase: str,
    ) -> None:
        """Update circadian phase."""
        ctx = self.get_context(user_id)
        ctx.circadian_phase = phase

    def update_stream_health(
        self,
        user_id: int,
        health: float,
    ) -> None:
        """Update data stream health."""
        ctx = self.get_context(user_id)
        ctx.stream_health = health
        ctx.last_data_time = datetime.utcnow()

    def mark_synchronized(self, user_id: int) -> None:
        """Mark context as fully synchronized."""
        ctx = self.get_context(user_id)
        ctx.last_synchronized = datetime.utcnow()

    # ── Context queries ──────────────────────────────────────

    def get_snapshot(self, user_id: int) -> dict:
        """Get a serializable snapshot of the user's context."""
        ctx = self.get_context(user_id)
        return {
            "user_id": ctx.user_id,
            "physiological_state": {
                "state": ctx.current_state,
                "confidence": ctx.state_confidence,
                "updated_at": (
                    ctx.state_updated_at.isoformat()
                    if ctx.state_updated_at else None
                ),
            },
            "scores": {
                "health_score": ctx.health_score,
                "recovery_score": ctx.recovery_score,
                "wellness_index": ctx.wellness_index,
                "fatigue_score": ctx.fatigue_score,
            },
            "baselines": {
                "values": ctx.baselines,
                "confidence": ctx.baseline_confidence,
            },
            "session": {
                "type": ctx.active_session_type,
                "id": ctx.active_session_id,
            },
            "trends": {
                "direction": ctx.trend_direction,
                "deterioration_score": ctx.deterioration_score,
            },
            "recovery": {
                "state": ctx.recovery_state,
                "velocity": ctx.recovery_velocity,
            },
            "alerts": {
                "active_count": ctx.active_alert_count,
                "last_alert": (
                    ctx.last_alert_time.isoformat()
                    if ctx.last_alert_time else None
                ),
            },
            "circadian_phase": ctx.circadian_phase,
            "stream_health": ctx.stream_health,
            "last_synchronized": (
                ctx.last_synchronized.isoformat()
                if ctx.last_synchronized else None
            ),
        }

    def is_context_stale(
        self,
        user_id: int,
        max_age_seconds: float = 600,
    ) -> bool:
        """Check if a user's context is stale."""
        ctx = self.get_context(user_id)
        if ctx.last_synchronized is None:
            return True
        age = (datetime.utcnow() - ctx.last_synchronized).total_seconds()
        return age > max_age_seconds

    @property
    def active_users(self) -> int:
        return len(self._contexts)
