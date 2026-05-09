"""
health_intelligence/digital_twin/digital_twin_engine.py
───────────────────────────────────────────────
Central Digital Health Twin engine — the continuously
evolving digital representation of each user.

Orchestrates:
  - PhysiologicalProfileModel (body characteristics)
  - WellnessIdentityModel (stable behavioral identity)
  - TwinStateManager (current vs historical state)
  - TwinMemoryGraph (longitudinal wellness memory)

The twin evolves gradually using EMA smoothing,
weekly identity updates, and drift-clamped anchors
to prevent reactive oscillation.
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.digital_twin.physiological_profile_model import (
    PhysiologicalProfileModel,
)
from health_intelligence.digital_twin.wellness_identity_model import (
    WellnessIdentityModel,
)
from health_intelligence.digital_twin.twin_state_manager import (
    TwinStateManager,
)
from health_intelligence.digital_twin.twin_memory_graph import (
    TwinMemoryGraph,
)

log = logging.getLogger(__name__)


class DigitalTwinEngine:
    """
    Central engine maintaining a continuously evolving
    digital representation of the user's wellness state.
    """

    def __init__(self):
        self._physiology = PhysiologicalProfileModel()
        self._identity = WellnessIdentityModel()
        self._state = TwinStateManager()
        self._memory = TwinMemoryGraph()

    # ── Core Update ──────────────────────────────────────

    def update(
        self,
        user_id: int,
        signals: dict[str, float],
    ) -> dict:
        """
        Primary update — feed latest signals into the twin.
        Called on every new data ingestion cycle.
        """
        # 1. Evolve physiological profile
        profile = self._physiology.update_from_signals(user_id, signals)
        profile_summary = self._physiology.to_dict(user_id)

        # 2. Get identity (updated weekly, not per-signal)
        identity_summary = self._identity.to_dict(user_id)

        # 3. Update state snapshot
        snapshot = self._state.update_state(
            user_id, signals, profile_summary, identity_summary,
        )

        # 4. Record in memory graph
        self._memory.add_memory(
            user_id,
            node_type="signal_update",
            data={"signals": signals, "quality": snapshot.quality},
            tags=self._extract_tags(signals),
            severity=0.0,
        )

        return {
            "twin_state": self._state.get_current_state(user_id),
            "profile": profile_summary,
            "identity": identity_summary,
            "data_quality": self._state.get_state_quality(user_id),
            "updated_at": datetime.utcnow().isoformat(),
        }

    def update_weekly_identity(
        self,
        user_id: int,
        weekly_averages: dict[str, float],
    ) -> dict:
        """
        Weekly cadence update for behavioral identity.
        Called by the orchestrator on a weekly schedule.
        """
        identity = self._identity.update_weekly(user_id, weekly_averages)
        return self._identity.to_dict(user_id)

    # ── Memory Operations ────────────────────────────────

    def record_event(
        self,
        user_id: int,
        event_type: str,
        data: dict,
        tags: Optional[list[str]] = None,
        severity: float = 0.0,
        linked_to: Optional[str] = None,
        link_type: str = "followed_by",
    ) -> str:
        """Record a wellness event in the twin's memory."""
        return self._memory.add_memory(
            user_id, event_type, data, tags,
            severity=severity,
            linked_to=linked_to,
            link_type=link_type,
        )

    def record_intervention_outcome(
        self,
        user_id: int,
        intervention_id: str,
        category: str,
        accepted: bool,
        completed: bool = False,
        improvement: Optional[float] = None,
    ) -> str:
        """Record an intervention in twin memory and update physiology."""
        # Update physiological responsiveness
        self._physiology.update_intervention_response(
            user_id, accepted, improvement,
        )

        # Store in memory
        return self._memory.add_memory(
            user_id,
            node_type="intervention",
            data={
                "intervention_id": intervention_id,
                "category": category,
                "accepted": accepted,
                "completed": completed,
                "improvement": improvement,
            },
            tags=[category, "accepted" if accepted else "rejected"],
            outcome="completed" if completed else "incomplete",
            severity=0.0,
        )

    def record_deterioration(
        self,
        user_id: int,
        deterioration_type: str,
        severity: float,
        contributing_factors: list[str],
    ) -> str:
        """Record a deterioration episode in twin memory."""
        return self._memory.add_memory(
            user_id,
            node_type="deterioration",
            data={
                "type": deterioration_type,
                "contributing_factors": contributing_factors,
            },
            tags=[deterioration_type] + contributing_factors,
            severity=severity,
        )

    def record_recovery(
        self,
        user_id: int,
        recovery_depth: float,
        trigger: str,
        duration_hours: float,
    ) -> str:
        """Record a recovery episode."""
        return self._memory.add_memory(
            user_id,
            node_type="recovery",
            data={
                "depth": recovery_depth,
                "trigger": trigger,
                "duration_hours": duration_hours,
            },
            tags=[trigger, "recovery"],
            severity=0.0,
        )

    # ── Query Operations ─────────────────────────────────

    def get_twin_state(self, user_id: int) -> dict:
        """Full current digital twin state."""
        return {
            "current_state": self._state.get_current_state(user_id),
            "profile": self._physiology.to_dict(user_id),
            "identity": self._identity.to_dict(user_id),
            "data_quality": self._state.get_state_quality(user_id),
            "memory_summary": self._memory.get_graph_summary(user_id),
        }

    def get_state_delta(self, user_id: int, periods_back: int = 1) -> Optional[dict]:
        """What changed since N periods ago."""
        return self._state.get_state_delta(user_id, periods_back)

    def get_recurring_patterns(self, user_id: int) -> list[dict]:
        """Detect recurring wellness patterns."""
        return self._memory.find_recurring_patterns(user_id)

    def get_seasonal_patterns(self, user_id: int) -> dict:
        """Detect seasonal wellness patterns."""
        return self._memory.get_seasonal_patterns(user_id)

    def get_memory_by_type(
        self, user_id: int, node_type: str, limit: int = 30,
    ) -> list[dict]:
        """Retrieve memories by type."""
        return self._memory.get_memories_by_type(user_id, node_type, limit)

    # ── Accessors ────────────────────────────────────────

    @property
    def physiology(self) -> PhysiologicalProfileModel:
        return self._physiology

    @property
    def identity(self) -> WellnessIdentityModel:
        return self._identity

    @property
    def state_manager(self) -> TwinStateManager:
        return self._state

    @property
    def memory(self) -> TwinMemoryGraph:
        return self._memory

    # ── Internal ─────────────────────────────────────────

    @staticmethod
    def _extract_tags(signals: dict[str, float]) -> list[str]:
        """Extract descriptive tags from signal values."""
        tags: list[str] = []
        stress = signals.get("stress_level", 0)
        if stress > 65:
            tags.append("high_stress")
        elif stress < 25:
            tags.append("low_stress")

        fatigue = signals.get("fatigue", 0)
        if fatigue > 60:
            tags.append("high_fatigue")

        sleep = signals.get("sleep_hours", 8)
        if sleep < 5.5:
            tags.append("sleep_deficit")

        recovery = signals.get("recovery_score", 70)
        if recovery < 40:
            tags.append("poor_recovery")
        elif recovery > 80:
            tags.append("strong_recovery")

        return tags
