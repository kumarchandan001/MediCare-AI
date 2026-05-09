"""
health_intelligence/wearable_fusion/biometric_alignment.py
───────────────────────────────────────────────
Time-aligns asynchronous wearable streams so that
sensor fusion operates on temporally coherent data.

Problem:
  HR updates every 60s, SpO2 every 5min, sleep once/hr.
  Fusion needs all values at the same logical timestamp.

Solution:
  - Forward-fill missing values within tolerance
  - Interpolate numeric streams
  - Track per-signal last-known-good value
  - Emit aligned snapshots at configurable intervals
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional

log = logging.getLogger(__name__)

# Maximum age before a forward-filled value is considered stale
DEFAULT_STALENESS_LIMIT = 900  # 15 minutes


@dataclass
class AlignedSnapshot:
    """A temporally coherent set of biometric values."""
    timestamp: datetime
    values: dict[str, float]
    ages: dict[str, float]          # seconds since last real update
    interpolated: dict[str, bool]   # was this value interpolated?
    coverage: float                 # 0–1: fraction of signals present


@dataclass
class SignalState:
    """Tracks the last-known-good value for one signal."""
    name: str
    value: Optional[float] = None
    timestamp: Optional[datetime] = None
    previous_value: Optional[float] = None
    previous_timestamp: Optional[datetime] = None
    update_count: int = 0


class BiometricAligner:
    """
    Aligns asynchronous wearable streams into temporally
    coherent snapshots for sensor fusion.
    """

    def __init__(
        self,
        staleness_limit_seconds: float = DEFAULT_STALENESS_LIMIT,
        tracked_signals: Optional[list[str]] = None,
    ):
        self._staleness_limit = staleness_limit_seconds
        self._tracked = tracked_signals or [
            "heart_rate_bpm", "spo2_percent", "stress_level",
            "steps", "sleep_hours", "active_minutes",
            "calories_burned", "hrv_ms",
        ]
        self._states: dict[str, SignalState] = {
            name: SignalState(name=name) for name in self._tracked
        }

    # ── Ingestion ────────────────────────────────────────────

    def update_signal(
        self,
        name: str,
        value: float,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """
        Update the latest value for a signal.
        Maintains previous value for interpolation.
        """
        ts = timestamp or datetime.utcnow()

        if name not in self._states:
            self._states[name] = SignalState(name=name)

        state = self._states[name]
        state.previous_value = state.value
        state.previous_timestamp = state.timestamp
        state.value = value
        state.timestamp = ts
        state.update_count += 1

    def update_batch(
        self,
        values: dict[str, float],
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Update multiple signals at once."""
        ts = timestamp or datetime.utcnow()
        for name, value in values.items():
            if value is not None:
                self.update_signal(name, value, ts)

    # ── Alignment ────────────────────────────────────────────

    def get_aligned_snapshot(
        self,
        at: Optional[datetime] = None,
    ) -> AlignedSnapshot:
        """
        Produce a temporally aligned snapshot of all tracked
        signals at the given timestamp.

        Uses forward-fill with staleness limit and optional
        linear interpolation.
        """
        now = at or datetime.utcnow()
        values: dict[str, float] = {}
        ages: dict[str, float] = {}
        interpolated: dict[str, bool] = {}

        for name in self._tracked:
            state = self._states.get(name)
            if not state or state.value is None or state.timestamp is None:
                continue

            age = (now - state.timestamp).total_seconds()

            if age > self._staleness_limit:
                # Too stale — skip
                continue

            if age < 0:
                age = 0

            # Try interpolation if we have a previous value
            if (
                state.previous_value is not None
                and state.previous_timestamp is not None
                and age > 0
            ):
                prev_age = (now - state.previous_timestamp).total_seconds()
                if prev_age <= self._staleness_limit * 2:
                    span = (
                        state.timestamp - state.previous_timestamp
                    ).total_seconds()
                    if span > 0:
                        t = age / span
                        if 0 <= t <= 1:
                            interp = (
                                state.value * (1 - t)
                                + state.previous_value * t
                            )
                            values[name] = round(interp, 2)
                            ages[name] = round(age, 1)
                            interpolated[name] = True
                            continue

            # Forward-fill
            values[name] = state.value
            ages[name] = round(age, 1)
            interpolated[name] = False

        coverage = (
            len(values) / len(self._tracked)
            if self._tracked else 0
        )

        return AlignedSnapshot(
            timestamp=now,
            values=values,
            ages=ages,
            interpolated=interpolated,
            coverage=round(coverage, 3),
        )

    # ── Utilities ────────────────────────────────────────────

    def get_signal_freshness(self) -> dict[str, Optional[float]]:
        """Return age in seconds for each signal."""
        now = datetime.utcnow()
        result: dict[str, Optional[float]] = {}
        for name in self._tracked:
            state = self._states.get(name)
            if state and state.timestamp:
                result[name] = round(
                    (now - state.timestamp).total_seconds(), 1,
                )
            else:
                result[name] = None
        return result

    def get_missing_signals(self) -> list[str]:
        """Return signals that have never been updated."""
        return [
            name for name in self._tracked
            if self._states.get(name) is None
            or self._states[name].value is None
        ]

    def reset(self) -> None:
        """Reset all signal states."""
        self._states = {
            name: SignalState(name=name) for name in self._tracked
        }
