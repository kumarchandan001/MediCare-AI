"""
health_intelligence/analytics/physiological_drift.py
───────────────────────────────────────────────
Detects slow, gradual physiological deviations that
happen over hours — too slow for acute detection but
clinically significant.

Examples:
  - Overnight HR drift (resting HR creeping up)
  - Gradual SpO2 decline during sleep
  - Slow stress accumulation through a workday
  - Progressive fatigue deepening

Uses linear regression on short rolling windows to
detect drift direction and velocity.
"""

import logging
import math
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class PhysiologicalDriftDetector:
    """
    Identifies slow deviations in physiological metrics
    over multi-hour windows.
    """

    def __init__(self):
        # user_id → metric → [(timestamp_epoch, value)]
        self._windows: dict[int, dict[str, list[tuple[float, float]]]] = {}
        self._max_points = 200

    def record(
        self,
        user_id: int,
        metric: str,
        value: float,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Record an observation for drift tracking."""
        ts = (timestamp or datetime.utcnow()).timestamp()

        if user_id not in self._windows:
            self._windows[user_id] = {}
        if metric not in self._windows[user_id]:
            self._windows[user_id][metric] = []

        self._windows[user_id][metric].append((ts, value))

        w = self._windows[user_id][metric]
        if len(w) > self._max_points:
            self._windows[user_id][metric] = w[-self._max_points:]

    def record_batch(
        self,
        user_id: int,
        signals: dict[str, float],
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Record multiple signals at once."""
        for metric, value in signals.items():
            if value is not None:
                self.record(user_id, metric, value, timestamp)

    def detect_drift(
        self,
        user_id: int,
        window_hours: float = 4.0,
        min_observations: int = 5,
    ) -> list[dict]:
        """
        Detect drift across all tracked metrics.

        Returns list of drift detections.
        """
        results: list[dict] = []
        now = datetime.utcnow().timestamp()
        cutoff = now - window_hours * 3600

        metrics = self._windows.get(user_id, {})
        for metric, points in metrics.items():
            # Filter to window
            windowed = [
                (t, v) for t, v in points if t >= cutoff
            ]

            if len(windowed) < min_observations:
                continue

            drift = self._analyze_drift(metric, windowed, window_hours)
            if drift:
                results.append(drift)

        return results

    def detect_overnight_drift(
        self,
        user_id: int,
    ) -> list[dict]:
        """
        Specifically detect overnight HR and SpO2 drift
        (typically 6–8 hour window).
        """
        return self.detect_drift(
            user_id, window_hours=7.0, min_observations=8,
        )

    @staticmethod
    def _analyze_drift(
        metric: str,
        points: list[tuple[float, float]],
        window_hours: float,
    ) -> Optional[dict]:
        """
        Analyze a metric's drift using linear regression.
        """
        n = len(points)
        if n < 5:
            return None

        # Normalize timestamps to hours
        t0 = points[0][0]
        xs = [(t - t0) / 3600.0 for t, _ in points]
        ys = [v for _, v in points]

        # Linear regression
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        ss_xx = sum((x - mean_x) ** 2 for x in xs)
        ss_xy = sum(
            (x - mean_x) * (y - mean_y)
            for x, y in zip(xs, ys)
        )

        if ss_xx < 1e-10:
            return None

        slope = ss_xy / ss_xx

        # R² for quality
        ss_yy = sum((y - mean_y) ** 2 for y in ys)
        r_squared = (ss_xy ** 2) / (ss_xx * ss_yy) if ss_yy > 0 else 0

        # Total change over window
        total_change = slope * window_hours
        pct_change = (total_change / mean_y * 100) if mean_y != 0 else 0

        # Significance threshold
        if abs(pct_change) < 5 or r_squared < 0.2:
            return None

        display = metric.replace("_", " ").title()
        direction = "rising" if slope > 0 else "falling"

        # Severity based on magnitude and consistency
        if abs(pct_change) > 15 and r_squared > 0.5:
            severity = "high"
        elif abs(pct_change) > 8:
            severity = "moderate"
        else:
            severity = "low"

        confidence = min(0.9, r_squared * 0.7 + min(n / 30, 1.0) * 0.3)

        return {
            "metric": metric,
            "direction": direction,
            "slope_per_hour": round(slope, 3),
            "total_change": round(total_change, 2),
            "pct_change": round(pct_change, 1),
            "r_squared": round(r_squared, 3),
            "severity": severity,
            "confidence": round(confidence, 3),
            "data_points": n,
            "window_hours": window_hours,
            "start_value": round(ys[0], 1),
            "end_value": round(ys[-1], 1),
            "message": (
                f"{display} is {direction} at {abs(slope):.2f}/hr "
                f"({pct_change:+.1f}% over {window_hours:.0f}h). "
                f"From {ys[0]:.1f} to {ys[-1]:.1f}."
            ),
            "detected_at": datetime.utcnow().isoformat(),
        }
