"""
health_intelligence/digital_twin/twin_state_manager.py
───────────────────────────────────────────────
Manages the current vs historical state of the
digital twin, providing snapshot and diff capabilities.

Tracks:
  - Current twin state (latest signals + profile)
  - Historical snapshots (daily/weekly)
  - State deltas (what changed and by how much)
  - State quality (data freshness, completeness)
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class TwinStateSnapshot:
    """A point-in-time snapshot of the twin."""
    snapshot_id: str
    timestamp: str
    signals: dict[str, float]
    profile_summary: dict
    identity_summary: dict
    quality: float              # 0–1 data quality
    completeness: float         # 0–1 how many expected signals present


class TwinStateManager:
    """
    Manages current and historical twin state,
    providing delta analysis and quality tracking.
    """

    def __init__(self, max_history: int = 90):
        # user_id → current state
        self._current: dict[int, TwinStateSnapshot] = {}
        # user_id → list of snapshots
        self._history: dict[int, list[TwinStateSnapshot]] = defaultdict(list)
        self._max_history = max_history
        self._expected_signals = {
            "heart_rate_bpm", "stress_level", "sleep_hours",
            "active_minutes", "recovery_score", "fatigue",
            "wellness_score", "hrv_ms", "steps",
        }
        self._snapshot_counter: dict[int, int] = defaultdict(int)

    def update_state(
        self,
        user_id: int,
        signals: dict[str, float],
        profile_summary: dict,
        identity_summary: dict,
    ) -> TwinStateSnapshot:
        """Update the current twin state."""
        self._snapshot_counter[user_id] += 1

        # Calculate quality
        present = set(signals.keys()) & self._expected_signals
        completeness = len(present) / len(self._expected_signals)

        # Freshness-based quality (assume current is fresh)
        quality = completeness

        snapshot = TwinStateSnapshot(
            snapshot_id=f"snap_{user_id}_{self._snapshot_counter[user_id]}",
            timestamp=datetime.utcnow().isoformat(),
            signals=dict(signals),
            profile_summary=profile_summary,
            identity_summary=identity_summary,
            quality=round(quality, 3),
            completeness=round(completeness, 3),
        )

        # Archive previous
        if user_id in self._current:
            self._history[user_id].append(self._current[user_id])
            if len(self._history[user_id]) > self._max_history:
                self._history[user_id] = self._history[user_id][-self._max_history:]

        self._current[user_id] = snapshot
        return snapshot

    def get_current_state(self, user_id: int) -> Optional[dict]:
        """Get the current twin state."""
        snap = self._current.get(user_id)
        if not snap:
            return None
        return self._snap_to_dict(snap)

    def get_state_delta(self, user_id: int, periods_back: int = 1) -> Optional[dict]:
        """
        Compute what changed between current and N periods ago.
        """
        current = self._current.get(user_id)
        history = self._history.get(user_id, [])

        if not current or len(history) < periods_back:
            return None

        previous = history[-periods_back]

        deltas: dict[str, dict] = {}
        for metric in self._expected_signals:
            curr_val = current.signals.get(metric)
            prev_val = previous.signals.get(metric)
            if curr_val is not None and prev_val is not None:
                change = curr_val - prev_val
                pct = (change / max(abs(prev_val), 1)) * 100
                deltas[metric] = {
                    "current": round(curr_val, 2),
                    "previous": round(prev_val, 2),
                    "change": round(change, 2),
                    "change_pct": round(pct, 1),
                    "direction": "up" if change > 0 else "down" if change < 0 else "stable",
                }

        return {
            "current_snapshot": current.snapshot_id,
            "previous_snapshot": previous.snapshot_id,
            "periods_back": periods_back,
            "deltas": deltas,
            "quality_change": round(current.quality - previous.quality, 3),
        }

    def get_history_trend(
        self,
        user_id: int,
        metric: str,
        limit: int = 30,
    ) -> list[dict]:
        """Get historical values for a specific metric."""
        history = self._history.get(user_id, [])
        current = self._current.get(user_id)

        points: list[dict] = []
        for snap in history[-limit:]:
            val = snap.signals.get(metric)
            if val is not None:
                points.append({
                    "timestamp": snap.timestamp,
                    "value": round(val, 2),
                })

        if current:
            val = current.signals.get(metric)
            if val is not None:
                points.append({
                    "timestamp": current.timestamp,
                    "value": round(val, 2),
                })

        return points

    def get_state_quality(self, user_id: int) -> dict:
        """Get data quality assessment for the twin."""
        current = self._current.get(user_id)
        if not current:
            return {"status": "no_data", "quality": 0, "completeness": 0}

        return {
            "status": "active",
            "quality": current.quality,
            "completeness": current.completeness,
            "missing_signals": list(
                self._expected_signals - set(current.signals.keys()),
            ),
            "history_depth": len(self._history.get(user_id, [])),
        }

    @staticmethod
    def _snap_to_dict(snap: TwinStateSnapshot) -> dict:
        return {
            "snapshot_id": snap.snapshot_id,
            "timestamp": snap.timestamp,
            "signals": snap.signals,
            "profile_summary": snap.profile_summary,
            "identity_summary": snap.identity_summary,
            "quality": snap.quality,
            "completeness": snap.completeness,
        }
