"""
health_intelligence/analytics/resilience_monitor.py
───────────────────────────────────────────────
Continuous resilience monitoring — tracks how efficiently
users recover from acute stressors in real-time.

Measures:
  - Recovery velocity (time to return to baseline)
  - Stress adaptation (does same stressor produce less response?)
  - Physiological recovery quality
  - Recovery consistency across episodes
  - Resilience trend (improving / declining)
"""

import logging
import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class ResilienceMonitor:
    """
    Tracks real-time resilience by monitoring how quickly
    and completely metrics return to baseline after
    perturbations.
    """

    def __init__(self):
        # user_id → metric → list of recovery episodes
        self._episodes: dict[int, dict[str, list[dict]]] = defaultdict(
            lambda: defaultdict(list),
        )
        # user_id → metric → baseline value
        self._baselines: dict[int, dict[str, float]] = defaultdict(dict)
        # user_id → metric → list of recent values
        self._recent: dict[int, dict[str, list[tuple[float, float]]]] = (
            defaultdict(lambda: defaultdict(list))
        )

    def set_baseline(
        self,
        user_id: int,
        metric: str,
        value: float,
    ) -> None:
        """Set the baseline value for a metric."""
        self._baselines[user_id][metric] = value

    def set_baselines(
        self,
        user_id: int,
        baselines: dict[str, float],
    ) -> None:
        """Set multiple baselines at once."""
        for metric, value in baselines.items():
            self._baselines[user_id][metric] = value

    def record_value(
        self,
        user_id: int,
        metric: str,
        value: float,
        timestamp: Optional[datetime] = None,
    ) -> Optional[dict]:
        """
        Record a value and detect recovery episodes.

        Returns a recovery event if one completed.
        """
        ts = (timestamp or datetime.utcnow()).timestamp()
        recent = self._recent[user_id][metric]
        recent.append((ts, value))

        # Limit history
        if len(recent) > 100:
            self._recent[user_id][metric] = recent[-100:]

        baseline = self._baselines[user_id].get(metric)
        if baseline is None:
            return None

        # Check if we just returned to baseline after deviation
        recovery = self._check_recovery_completion(
            user_id, metric, baseline,
        )
        return recovery

    def record_batch(
        self,
        user_id: int,
        signals: dict[str, float],
        timestamp: Optional[datetime] = None,
    ) -> list[dict]:
        """Record a batch and return any completed recoveries."""
        events = []
        for metric, value in signals.items():
            if value is not None:
                ev = self.record_value(user_id, metric, value, timestamp)
                if ev:
                    events.append(ev)
        return events

    def get_resilience_report(self, user_id: int) -> dict:
        """
        Generate a comprehensive resilience report.
        """
        all_episodes = self._episodes.get(user_id, {})
        if not all_episodes:
            return {
                "resilience_score": None,
                "status": "insufficient_data",
                "message": "No recovery episodes recorded yet.",
            }

        per_metric: dict[str, dict] = {}
        all_velocities: list[float] = []

        for metric, episodes in all_episodes.items():
            if not episodes:
                continue

            velocities = [e["recovery_velocity"] for e in episodes]
            qualities = [e["recovery_quality"] for e in episodes]
            avg_vel = sum(velocities) / len(velocities)
            avg_qual = sum(qualities) / len(qualities)
            all_velocities.extend(velocities)

            # Trend: are later episodes faster?
            if len(velocities) >= 3:
                first_half = sum(velocities[:len(velocities)//2]) / max(len(velocities)//2, 1)
                second_half = sum(velocities[len(velocities)//2:]) / max(len(velocities) - len(velocities)//2, 1)
                trend = "improving" if second_half > first_half else "declining"
            else:
                trend = "insufficient_data"

            per_metric[metric] = {
                "episodes": len(episodes),
                "avg_recovery_velocity": round(avg_vel, 3),
                "avg_recovery_quality": round(avg_qual, 1),
                "trend": trend,
            }

        # Overall resilience score
        if all_velocities:
            overall_vel = sum(all_velocities) / len(all_velocities)
            resilience = min(100, overall_vel * 100)
        else:
            resilience = None

        return {
            "resilience_score": round(resilience, 1) if resilience else None,
            "per_metric": per_metric,
            "total_episodes": sum(
                len(eps) for eps in all_episodes.values()
            ),
            "assessed_at": datetime.utcnow().isoformat(),
        }

    # ── Internal ─────────────────────────────────────────────

    def _check_recovery_completion(
        self,
        user_id: int,
        metric: str,
        baseline: float,
    ) -> Optional[dict]:
        """
        Check if a recovery episode just completed.

        A recovery episode is:
          1. Deviation from baseline (>15%)
          2. Return to within 5% of baseline
        """
        recent = self._recent[user_id][metric]
        if len(recent) < 5:
            return None

        # Find if there was a recent deviation
        threshold = abs(baseline) * 0.15 if baseline != 0 else 5
        return_threshold = abs(baseline) * 0.05 if baseline != 0 else 2

        # Scan backwards for deviation → recovery pattern
        values = [(t, v) for t, v in recent]
        current_val = values[-1][1]
        current_ts = values[-1][0]

        # Must be near baseline now
        if abs(current_val - baseline) > return_threshold:
            return None

        # Find the peak deviation
        peak_dev = 0
        peak_ts = None
        peak_val = None

        for ts, val in reversed(values[:-1]):
            dev = abs(val - baseline)
            if dev > peak_dev:
                peak_dev = dev
                peak_ts = ts
                peak_val = val
            if dev < return_threshold and peak_dev > threshold:
                # Found complete episode
                break

        if peak_dev <= threshold or peak_ts is None:
            return None

        # Recovery metrics
        recovery_time = current_ts - peak_ts  # seconds
        recovery_velocity = (
            1.0 / (recovery_time / 60.0)
            if recovery_time > 0 else 1.0
        )  # recoveries per minute

        overshoot = abs(current_val - baseline)
        recovery_quality = max(
            0, 100 - (overshoot / abs(baseline) * 100 if baseline else 0),
        )

        episode = {
            "metric": metric,
            "peak_deviation": round(peak_dev, 2),
            "peak_value": round(peak_val, 1) if peak_val else None,
            "baseline": round(baseline, 1),
            "recovery_time_seconds": round(recovery_time, 1),
            "recovery_velocity": round(min(recovery_velocity, 1.0), 4),
            "recovery_quality": round(min(recovery_quality, 100), 1),
            "recovered_at": datetime.utcnow().isoformat(),
        }

        self._episodes[user_id][metric].append(episode)

        # Keep last 50 episodes per metric
        if len(self._episodes[user_id][metric]) > 50:
            self._episodes[user_id][metric] = (
                self._episodes[user_id][metric][-50:]
            )

        return episode
