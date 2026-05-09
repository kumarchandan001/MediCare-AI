"""
health_intelligence/adaptation/meta_learning_hooks.py
───────────────────────────────────────────────
Meta-learning readiness hooks — extensible tracking
points for future meta-learning capabilities.
(Refinement 3)

Provides tracking hooks for:
  - Personalisation evolution speed
  - Adaptation quality scoring
  - Coaching effectiveness drift
  - Intervention adaptability metrics
  - Personalisation drift analysis

Does NOT implement full meta-learning — only the
extensible interfaces and tracking infrastructure.
"""

import logging
from collections import defaultdict
from datetime import datetime
from typing import Optional, Protocol

log = logging.getLogger(__name__)


# ── Extensible Protocols ─────────────────────────────────

class MetaLearningObserver(Protocol):
    """
    Protocol for future meta-learning observers.
    Any class implementing this can be registered to
    receive personalisation evolution events.
    """

    def on_personalisation_update(
        self,
        user_id: int,
        dimension: str,
        old_value: float,
        new_value: float,
    ) -> None:
        ...

    def on_adaptation_quality_change(
        self,
        user_id: int,
        quality_score: float,
    ) -> None:
        ...


# ── Tracking Infrastructure ──────────────────────────────

class MetaLearningHooks:
    """
    Extensible hooks for future meta-learning.
    Tracks personalisation evolution and drift
    without implementing full meta-learning.
    """

    def __init__(self):
        self._observers: list[MetaLearningObserver] = []
        # user_id → dimension → list of (timestamp, value)
        self._evolution_log: dict[int, dict[str, list[tuple[str, float]]]] = defaultdict(
            lambda: defaultdict(list),
        )
        self._max_entries = 200

    def register_observer(self, observer: MetaLearningObserver) -> None:
        """Register a meta-learning observer for future use."""
        self._observers.append(observer)

    def track_personalisation_change(
        self,
        user_id: int,
        dimension: str,
        old_value: float,
        new_value: float,
    ) -> None:
        """Track a personalisation parameter change."""
        now = datetime.utcnow().isoformat()
        self._evolution_log[user_id][dimension].append((now, new_value))

        # Prune
        if len(self._evolution_log[user_id][dimension]) > self._max_entries:
            self._evolution_log[user_id][dimension] = (
                self._evolution_log[user_id][dimension][-self._max_entries:]
            )

        # Notify observers
        for obs in self._observers:
            try:
                obs.on_personalisation_update(
                    user_id, dimension, old_value, new_value,
                )
            except Exception as e:
                log.warning(f"Meta-learning observer error: {e}")

    def track_adaptation_quality(
        self,
        user_id: int,
        quality_score: float,
    ) -> None:
        """Track adaptation quality for future meta-analysis."""
        self.track_personalisation_change(
            user_id, "adaptation_quality",
            0.0, quality_score,
        )

        for obs in self._observers:
            try:
                obs.on_adaptation_quality_change(user_id, quality_score)
            except Exception as e:
                log.warning(f"Meta-learning observer error: {e}")

    def get_evolution_summary(self, user_id: int) -> dict:
        """Get personalisation evolution summary."""
        evolution = self._evolution_log.get(user_id, {})
        summary: dict[str, dict] = {}

        for dim, entries in evolution.items():
            if len(entries) < 2:
                continue

            values = [v for _, v in entries]
            first = values[0]
            last = values[-1]
            drift = abs(last - first) / max(abs(first), 0.01)

            summary[dim] = {
                "initial_value": round(first, 3),
                "current_value": round(last, 3),
                "total_drift": round(drift, 4),
                "change_count": len(entries),
                "evolution_speed": round(
                    drift / max(len(entries), 1), 5,
                ),
            }

        return {
            "user_id": user_id,
            "dimensions_tracked": len(summary),
            "evolution": summary,
            "meta_learning_status": "hooks_active",
            "full_meta_learning": "not_implemented",
        }
