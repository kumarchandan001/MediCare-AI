"""
health_intelligence/trends/trend_analyzer.py
───────────────────────────────────────────────
Detects gradual health changes over time using
recency-weighted moving averages and slope analysis.

Examples:
  "Sleep quality declined 18% over 7 days."
  "Resting heart rate trending upward over 2 weeks."
  "Activity levels dropping steadily."

Features:
  - Recency-weighted moving averages
  - Slope analysis (linear regression on weighted data)
  - Trend windows (7d, 14d, 30d)
  - Deterioration scoring
  - Trend confidence (decays with sparse data)
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
    compute_freshness,
    compute_continuity_score,
)
from health_intelligence.history.wearable_timeline import WearableTimeline

log = logging.getLogger(__name__)


# ── Trend direction labels ───────────────────────────────────

TREND_IMPROVING = "improving"
TREND_STABLE = "stable"
TREND_DECLINING = "declining"
TREND_INSUFFICIENT = "insufficient_data"

# Metrics where "higher = worse" (invert interpretation)
HIGHER_IS_WORSE = {"stress_level", "heart_rate_bpm"}
# Metrics where "lower = worse"
LOWER_IS_WORSE = {"spo2_percent", "sleep_hours", "steps", "active_minutes"}


class TrendAnalyzer:
    """
    Detects gradual health changes using recency-weighted
    slope analysis across configurable time windows.
    """

    def __init__(self):
        self._history = HealthHistoryManager()
        self._wearable_tl = WearableTimeline()

    async def analyze_metric_trend(
        self,
        db: AsyncSession,
        user_id: int,
        metric: str,
        days: int = 14,
        freshness_half_life: float = 7.0,
    ) -> dict:
        """
        Analyze the trend for a single wearable metric.

        Returns:
          {
            "metric": "sleep_hours",
            "direction": "declining",
            "slope_per_day": -0.15,
            "change_pct": -18.2,
            "start_avg": 7.5,
            "end_avg": 6.1,
            "data_points": 12,
            "trend_confidence": 0.78,
            "message": "Sleep quality declined 18% over 14 days.",
          }
        """
        series = await self._history.get_wearable_field_series(
            db, user_id, field=metric, days=days,
        )

        if len(series) < 3:
            return {
                "metric": metric,
                "direction": TREND_INSUFFICIENT,
                "data_points": len(series),
                "trend_confidence": 0.0,
                "message": (
                    f"Insufficient data for {metric.replace('_', ' ')} "
                    f"trend analysis (need ≥ 3 data points)."
                ),
            }

        # Compute weighted linear regression
        slope, intercept, r_squared = self._weighted_linear_regression(
            series, freshness_half_life,
        )

        # Compute start/end averages (first third vs last third)
        n = len(series)
        third = max(n // 3, 1)
        start_vals = [v for _, v in series[:third]]
        end_vals = [v for _, v in series[-third:]]
        start_avg = sum(start_vals) / len(start_vals)
        end_avg = sum(end_vals) / len(end_vals)

        # Change percentage
        change_pct = (
            ((end_avg - start_avg) / start_avg * 100)
            if start_avg != 0 else 0
        )

        # Determine direction
        direction = self._classify_direction(
            metric, slope, change_pct,
        )

        # Trend confidence
        timestamps = [ts for ts, _ in series]
        continuity = compute_continuity_score(
            timestamps, expected_interval_hours=24.0,
            window_days=days,
        )
        freshness = compute_freshness(
            max(timestamps), freshness_half_life,
        )
        trend_confidence = self._compute_trend_confidence(
            r_squared=r_squared,
            data_points=n,
            continuity=continuity,
            freshness=freshness,
        )

        # Human-readable message
        display = metric.replace("_", " ").title()
        if direction == TREND_STABLE:
            message = f"{display} has been stable over the past {days} days."
        elif direction == TREND_IMPROVING:
            message = (
                f"{display} improved by {abs(change_pct):.0f}% "
                f"over the past {days} days."
            )
        else:
            message = (
                f"{display} declined by {abs(change_pct):.0f}% "
                f"over the past {days} days."
            )

        return {
            "metric": metric,
            "display_name": display,
            "direction": direction,
            "slope_per_day": round(slope, 4),
            "change_pct": round(change_pct, 1),
            "start_avg": round(start_avg, 2),
            "end_avg": round(end_avg, 2),
            "data_points": n,
            "r_squared": round(r_squared, 3),
            "trend_confidence": round(trend_confidence, 3),
            "window_days": days,
            "message": message,
        }

    async def analyze_all_trends(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 14,
    ) -> dict:
        """
        Analyze trends for all tracked wearable metrics.

        Returns a summary with per-metric trends and
        an overall deterioration score.
        """
        metrics = [
            "heart_rate_bpm", "spo2_percent", "sleep_hours",
            "steps", "stress_level", "active_minutes",
        ]

        trends: list[dict] = []
        for metric in metrics:
            trend = await self.analyze_metric_trend(
                db, user_id, metric=metric, days=days,
            )
            if trend["direction"] != TREND_INSUFFICIENT:
                trends.append(trend)

        # Overall deterioration score
        deterioration = self._compute_deterioration_score(trends)

        # Significant changes (> 10% change)
        significant = [
            t for t in trends if abs(t.get("change_pct", 0)) > 10
        ]

        return {
            "trends": trends,
            "significant_changes": significant,
            "deterioration_score": round(deterioration, 1),
            "window_days": days,
            "metrics_analyzed": len(trends),
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    # ── Weighted linear regression ───────────────────────────

    @staticmethod
    def _weighted_linear_regression(
        series: list[tuple[datetime, float]],
        half_life_days: float,
    ) -> tuple[float, float, float]:
        """
        Fit a weighted linear regression to the time series.

        Returns (slope_per_day, intercept, r_squared).
        """
        if len(series) < 2:
            return 0.0, 0.0, 0.0

        base_time = series[0][0]
        xs: list[float] = []
        ys: list[float] = []
        ws: list[float] = []

        for ts, val in series:
            days_from_start = (ts - base_time).total_seconds() / 86400.0
            weight = compute_freshness(ts, half_life_days)
            xs.append(days_from_start)
            ys.append(val)
            ws.append(weight)

        # Weighted means
        w_sum = sum(ws)
        if w_sum == 0:
            return 0.0, 0.0, 0.0

        x_mean = sum(x * w for x, w in zip(xs, ws)) / w_sum
        y_mean = sum(y * w for y, w in zip(ys, ws)) / w_sum

        # Weighted covariance and variance
        cov_xy = sum(
            w * (x - x_mean) * (y - y_mean)
            for x, y, w in zip(xs, ys, ws)
        )
        var_x = sum(
            w * (x - x_mean) ** 2 for x, w in zip(xs, ws)
        )
        var_y = sum(
            w * (y - y_mean) ** 2 for y, w in zip(ys, ws)
        )

        if var_x == 0:
            return 0.0, y_mean, 0.0

        slope = cov_xy / var_x
        intercept = y_mean - slope * x_mean

        # R-squared
        r_squared = (
            (cov_xy ** 2) / (var_x * var_y)
            if var_y > 0 else 0.0
        )

        return slope, intercept, min(r_squared, 1.0)

    # ── Direction classification ─────────────────────────────

    @staticmethod
    def _classify_direction(
        metric: str,
        slope: float,
        change_pct: float,
    ) -> str:
        """
        Classify the trend direction considering whether
        higher or lower values are "better" for this metric.
        """
        # Minimum change threshold to avoid noise
        if abs(change_pct) < 5.0:
            return TREND_STABLE

        increasing = change_pct > 0

        if metric in HIGHER_IS_WORSE:
            return TREND_DECLINING if increasing else TREND_IMPROVING
        elif metric in LOWER_IS_WORSE:
            return TREND_IMPROVING if increasing else TREND_DECLINING
        else:
            # Default: increasing = improving
            return TREND_IMPROVING if increasing else TREND_DECLINING

    # ── Trend confidence ─────────────────────────────────────

    @staticmethod
    def _compute_trend_confidence(
        r_squared: float,
        data_points: int,
        continuity: float,
        freshness: float,
    ) -> float:
        """
        Compute trend confidence ∈ [0, 1].

        Factors:
          - R² of the regression (how linear the trend is)
          - Data volume
          - Continuity (consistent tracking)
          - Freshness (recent data)
        """
        volume = min(data_points / 14.0, 1.0)
        confidence = (
            r_squared * 0.30
            + volume * 0.25
            + continuity * 0.25
            + freshness * 0.20
        )
        return min(confidence, 1.0)

    # ── Deterioration scoring ────────────────────────────────

    @staticmethod
    def _compute_deterioration_score(trends: list[dict]) -> float:
        """
        Compute an overall deterioration score (0–100).
        Higher = more metrics declining.
        """
        if not trends:
            return 0.0

        decline_score = 0.0
        for t in trends:
            if t["direction"] == TREND_DECLINING:
                pct = abs(t.get("change_pct", 0))
                conf = t.get("trend_confidence", 0.5)
                decline_score += min(pct, 50) * conf

        max_possible = len(trends) * 50
        return min((decline_score / max_possible) * 100, 100.0)
