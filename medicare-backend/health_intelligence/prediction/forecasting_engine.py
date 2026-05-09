"""
health_intelligence/prediction/forecasting_engine.py
───────────────────────────────────────────────
Time-series future-state projection engine.

Forecasts:
  - Metric trajectories (HR, sleep, stress trends)
  - Fatigue risk trajectory
  - Wellness decline projections
  - Sleep debt accumulation

Every forecast includes:
  - prediction_confidence
  - projection_stability
  - uncertainty_bounds (lower, upper)
  - forecast_reliability

Avoids deterministic forecasting — always probabilistic.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.history.health_history_manager import HealthHistoryManager

log = logging.getLogger(__name__)


class ForecastingEngine:
    """
    Projects future health metric trajectories using
    weighted linear extrapolation with uncertainty bounds.
    """

    def __init__(self):
        self._wearable_tl = WearableTimeline()
        self._history = HealthHistoryManager()

    async def forecast_metric(
        self,
        db: AsyncSession,
        user_id: int,
        metric: str,
        lookback_days: int = 14,
        forecast_days: int = 7,
    ) -> dict:
        """
        Forecast a single metric's trajectory.

        Returns:
          {
            "metric": "stress_level",
            "forecast": [{"day": 1, "predicted": 52, "lower": 45, "upper": 59}, ...],
            "trend_direction": "rising",
            "confidence": 0.72,
            "stability": 0.85,
            "reliability": "moderate",
          }
        """
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=lookback_days,
        )

        values = [
            d[metric] for d in daily
            if d.get(metric) is not None
        ]

        if len(values) < 5:
            return {
                "metric": metric,
                "status": "insufficient_data",
                "message": f"Need at least 5 days of {metric} data.",
            }

        # Weighted linear regression (recent data weighted more)
        n = len(values)
        weights = [
            math.exp(0.1 * i) for i in range(n)
        ]
        total_w = sum(weights)

        xs = list(range(n))
        mean_x = sum(w * x for w, x in zip(weights, xs)) / total_w
        mean_y = sum(w * y for w, y in zip(weights, values)) / total_w

        ss_xx = sum(w * (x - mean_x) ** 2 for w, x in zip(weights, xs))
        ss_xy = sum(
            w * (x - mean_x) * (y - mean_y)
            for w, x, y in zip(weights, xs, values)
        )

        if ss_xx < 1e-10:
            slope = 0
        else:
            slope = ss_xy / ss_xx

        intercept = mean_y - slope * mean_x

        # Residuals for uncertainty
        residuals = [
            (values[i] - (slope * i + intercept)) ** 2
            for i in range(n)
        ]
        rmse = math.sqrt(sum(residuals) / n)

        # R² for stability
        ss_yy = sum(w * (y - mean_y) ** 2 for w, y in zip(weights, values))
        r_squared = (ss_xy ** 2) / (ss_xx * ss_yy) if ss_yy > 0 else 0

        # Generate forecast with uncertainty bounds
        forecast: list[dict] = []
        for day in range(1, forecast_days + 1):
            x_pred = n + day - 1
            predicted = slope * x_pred + intercept

            # Uncertainty grows with distance
            uncertainty = rmse * (1 + 0.15 * day)
            lower = predicted - 1.96 * uncertainty
            upper = predicted + 1.96 * uncertainty

            forecast.append({
                "day": day,
                "predicted": round(predicted, 2),
                "lower_bound": round(lower, 2),
                "upper_bound": round(upper, 2),
                "uncertainty": round(uncertainty, 2),
            })

        # Confidence decays with forecast distance
        base_confidence = min(0.9, r_squared * 0.5 + min(n / 20, 1.0) * 0.4)
        avg_confidence = base_confidence * math.exp(-0.05 * forecast_days)

        # Stability: how consistent is the trend?
        stability = min(1.0, r_squared)

        # Reliability classification
        if avg_confidence >= 0.7 and stability >= 0.6:
            reliability = "high"
        elif avg_confidence >= 0.4:
            reliability = "moderate"
        else:
            reliability = "low"

        # Trend direction
        if slope > 0.5:
            direction = "rising"
        elif slope < -0.5:
            direction = "falling"
        else:
            direction = "stable"

        return {
            "metric": metric,
            "forecast": forecast,
            "trend_direction": direction,
            "slope_per_day": round(slope, 3),
            "confidence": round(avg_confidence, 3),
            "stability": round(stability, 3),
            "reliability": reliability,
            "rmse": round(rmse, 2),
            "r_squared": round(r_squared, 3),
            "data_points": n,
            "forecasted_at": datetime.utcnow().isoformat(),
        }

    async def forecast_all_metrics(
        self,
        db: AsyncSession,
        user_id: int,
        lookback_days: int = 14,
        forecast_days: int = 7,
    ) -> dict:
        """Forecast all key metrics."""
        metrics = [
            "heart_rate_bpm", "sleep_hours", "stress_level",
            "steps", "active_minutes",
        ]

        forecasts: dict[str, dict] = {}
        for metric in metrics:
            forecasts[metric] = await self.forecast_metric(
                db, user_id, metric,
                lookback_days, forecast_days,
            )

        # Overall outlook
        directions = [
            f["trend_direction"]
            for f in forecasts.values()
            if f.get("trend_direction")
        ]
        declining = sum(1 for d in directions if d == "falling")
        rising = sum(1 for d in directions if d == "rising")

        if declining > rising + 1:
            outlook = "declining"
        elif rising > declining + 1:
            outlook = "improving"
        else:
            outlook = "stable"

        avg_confidence = 0
        valid = [
            f["confidence"]
            for f in forecasts.values()
            if "confidence" in f
        ]
        if valid:
            avg_confidence = sum(valid) / len(valid)

        return {
            "forecasts": forecasts,
            "overall_outlook": outlook,
            "average_confidence": round(avg_confidence, 3),
            "forecast_horizon_days": forecast_days,
            "forecasted_at": datetime.utcnow().isoformat(),
        }
