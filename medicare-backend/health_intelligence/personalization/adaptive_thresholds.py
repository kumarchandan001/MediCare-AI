"""
health_intelligence/personalization/adaptive_thresholds.py
───────────────────────────────────────────────
Adaptive Thresholds — adjusts risk thresholds dynamically
based on the user's personal baseline rather than using
only generic population-level rules.

Example:
  Generic threshold: HR > 100 bpm = tachycardia
  User A baseline: resting HR = 52 bpm → threshold = 78 bpm
  User B baseline: resting HR = 88 bpm → threshold = 120 bpm

When baseline confidence is low, thresholds gracefully
fall back to generic population-level values.
"""

import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.personalization.baseline_engine import (
    BaselineEngine,
)

log = logging.getLogger(__name__)


# ── Generic (population-level) thresholds ────────────────────

GENERIC_THRESHOLDS: dict[str, dict] = {
    "heart_rate_bpm": {
        "low": 50, "high": 100,
        "critical_low": 40, "critical_high": 150,
        "unit": "bpm",
    },
    "spo2_percent": {
        "low": 95, "high": 100,
        "critical_low": 90, "critical_high": 100,
        "unit": "%",
    },
    "sleep_hours": {
        "low": 6.0, "high": 9.0,
        "critical_low": 3.0, "critical_high": 12.0,
        "unit": "hrs",
    },
    "steps": {
        "low": 4000, "high": 15000,
        "critical_low": 1000, "critical_high": 30000,
        "unit": "steps",
    },
    "stress_level": {
        "low": 0, "high": 60,
        "critical_low": 0, "critical_high": 85,
        "unit": "/100",
    },
    "active_minutes": {
        "low": 20, "high": 120,
        "critical_low": 0, "critical_high": 300,
        "unit": "min",
    },
}


class AdaptiveThresholds:
    """
    Generates personalized thresholds by blending the user's
    baseline with generic population-level values.

    Blend formula:
      threshold = baseline_weight * personal + (1 - baseline_weight) * generic

    Where baseline_weight ∈ [0, 1] is determined by the
    baseline's confidence score. Low confidence → rely more
    on generic thresholds.
    """

    def __init__(self):
        self._baseline_engine = BaselineEngine()

    async def get_thresholds(
        self,
        db: AsyncSession,
        user_id: int,
        sigma_multiplier: float = 2.0,
    ) -> dict:
        """
        Compute adaptive thresholds for all tracked metrics.

        Args:
            db: Async database session.
            user_id: Target user.
            sigma_multiplier: How many standard deviations from
                the personal mean define the personal threshold.

        Returns:
          {
            "heart_rate_bpm": {
              "personal_low": 56.0,
              "personal_high": 84.0,
              "adaptive_low": 53.0,
              "adaptive_high": 92.0,
              "generic_low": 50,
              "generic_high": 100,
              "blend_weight": 0.72,
              "source": "blended",
            },
            ...
          }
        """
        baseline = await self._baseline_engine.get_current_baseline(
            db, user_id,
        )

        results: dict = {}
        for metric, generic in GENERIC_THRESHOLDS.items():
            results[metric] = self._compute_metric_threshold(
                metric, generic, baseline, sigma_multiplier,
            )

        return results

    def _compute_metric_threshold(
        self,
        metric: str,
        generic: dict,
        baseline: Optional[dict],
        sigma: float,
    ) -> dict:
        """
        Compute adaptive thresholds for a single metric.
        """
        generic_low = generic["low"]
        generic_high = generic["high"]

        # Map metric names to baseline field names
        avg_field_map = {
            "heart_rate_bpm": "resting_hr_bpm",
            "spo2_percent": "avg_spo2_percent",
            "sleep_hours": "avg_sleep_hours",
            "steps": "avg_steps",
            "stress_level": "avg_stress_level",
            "active_minutes": "avg_active_minutes",
        }
        std_field_map = {
            "heart_rate_bpm": "std_hr_bpm",
            "spo2_percent": "std_spo2_percent",
            "sleep_hours": "std_sleep_hours",
            "steps": "std_steps",
            "stress_level": "std_stress_level",
        }

        avg_field = avg_field_map.get(metric)
        std_field = std_field_map.get(metric)

        if not baseline or not avg_field:
            return {
                "personal_low": None,
                "personal_high": None,
                "adaptive_low": generic_low,
                "adaptive_high": generic_high,
                "generic_low": generic_low,
                "generic_high": generic_high,
                "blend_weight": 0.0,
                "source": "generic",
                "unit": generic.get("unit", ""),
            }

        personal_avg = baseline.get(avg_field)
        personal_std = baseline.get(std_field) if std_field else None
        confidence = baseline.get("current_confidence", 0.0)

        if personal_avg is None:
            return {
                "personal_low": None,
                "personal_high": None,
                "adaptive_low": generic_low,
                "adaptive_high": generic_high,
                "generic_low": generic_low,
                "generic_high": generic_high,
                "blend_weight": 0.0,
                "source": "generic",
                "unit": generic.get("unit", ""),
            }

        # Personal thresholds = mean ± sigma * std
        personal_std = personal_std or (personal_avg * 0.1)
        personal_low = personal_avg - sigma * personal_std
        personal_high = personal_avg + sigma * personal_std

        # Blend weight based on confidence (0 = all generic, 1 = all personal)
        blend_weight = min(confidence, 1.0)

        # Blended thresholds
        adaptive_low = (
            blend_weight * personal_low
            + (1 - blend_weight) * generic_low
        )
        adaptive_high = (
            blend_weight * personal_high
            + (1 - blend_weight) * generic_high
        )

        return {
            "personal_low": round(personal_low, 2),
            "personal_high": round(personal_high, 2),
            "adaptive_low": round(adaptive_low, 2),
            "adaptive_high": round(adaptive_high, 2),
            "generic_low": generic_low,
            "generic_high": generic_high,
            "blend_weight": round(blend_weight, 3),
            "source": "blended" if blend_weight > 0 else "generic",
            "unit": generic.get("unit", ""),
        }

    async def evaluate_reading(
        self,
        db: AsyncSession,
        user_id: int,
        metric: str,
        value: float,
    ) -> dict:
        """
        Evaluate a single reading against adaptive thresholds.

        Returns:
          {
            "metric": "heart_rate_bpm",
            "value": 95,
            "status": "elevated",
            "deviation_pct": 18.5,
            "message": "Heart rate is 18.5% above your personal normal.",
          }
        """
        thresholds = await self.get_thresholds(db, user_id)
        t = thresholds.get(metric)

        if not t:
            return {
                "metric": metric,
                "value": value,
                "status": "unknown",
                "message": f"No threshold data for {metric}.",
            }

        low = t["adaptive_low"]
        high = t["adaptive_high"]
        generic = GENERIC_THRESHOLDS.get(metric, {})
        crit_low = generic.get("critical_low", low)
        crit_high = generic.get("critical_high", high)

        if value <= crit_low or value >= crit_high:
            status = "critical"
        elif value < low:
            status = "low"
        elif value > high:
            status = "elevated"
        else:
            status = "normal"

        # Deviation from personal midpoint
        midpoint = (low + high) / 2
        deviation_pct = (
            ((value - midpoint) / midpoint * 100)
            if midpoint > 0 else 0
        )

        display = metric.replace("_", " ").title()
        if status == "normal":
            msg = f"{display} is within your personal normal range."
        elif status == "elevated":
            msg = (
                f"{display} is {abs(deviation_pct):.1f}% above "
                "your personal normal."
            )
        elif status == "low":
            msg = (
                f"{display} is {abs(deviation_pct):.1f}% below "
                "your personal normal."
            )
        else:
            msg = (
                f"{display} is at a critically abnormal level. "
                "Seek medical attention if persistent."
            )

        return {
            "metric": metric,
            "value": value,
            "status": status,
            "deviation_pct": round(deviation_pct, 1),
            "adaptive_range": [low, high],
            "blend_weight": t["blend_weight"],
            "message": msg,
        }
