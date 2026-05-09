"""
health_intelligence/trends/anomaly_detector.py
───────────────────────────────────────────────
Anomaly Detection Engine — flags statistical outliers
from the user's PERSONAL baseline, not just generic
population thresholds.

Examples:
  "Heart rate elevated 24% above personal baseline."
  "Sleep duration significantly below normal behavior."
  "Unusual fatigue pattern detected."

Features:
  - Z-score based anomaly detection using personal baselines
  - Fallback to generic thresholds when baseline is weak
  - Anomaly severity classification
  - Confidence-weighted anomaly scoring
"""

import logging
import math
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.personalization.baseline_engine import BaselineEngine
from health_intelligence.personalization.adaptive_thresholds import (
    AdaptiveThresholds,
    GENERIC_THRESHOLDS,
)
from health_intelligence.history.health_history_manager import HealthHistoryManager

log = logging.getLogger(__name__)


# ── Anomaly severity thresholds (in std deviations) ──────────

MILD_THRESHOLD = 1.5       # > 1.5σ from personal mean
MODERATE_THRESHOLD = 2.0   # > 2.0σ
SEVERE_THRESHOLD = 3.0     # > 3.0σ


class AnomalyDetector:
    """
    Detects anomalous readings relative to the user's
    personal physiological baseline.
    """

    def __init__(self):
        self._baseline_engine = BaselineEngine()
        self._adaptive = AdaptiveThresholds()
        self._history = HealthHistoryManager()

    async def detect_anomalies(
        self,
        db: AsyncSession,
        user_id: int,
        readings: dict[str, float],
    ) -> list[dict]:
        """
        Check a set of metric readings against personal baselines.

        Args:
            db: Async database session.
            user_id: Target user.
            readings: Dict of metric_name → value.
                e.g. {"heart_rate_bpm": 105, "sleep_hours": 3.5}

        Returns a list of detected anomalies:
          [
            {
              "metric": "heart_rate_bpm",
              "value": 105,
              "personal_mean": 72.0,
              "personal_std": 8.5,
              "z_score": 3.88,
              "deviation_pct": 45.8,
              "severity": "severe",
              "confidence": 0.82,
              "message": "Heart rate elevated 46% above personal baseline.",
            },
            ...
          ]
        """
        baseline = await self._baseline_engine.get_current_baseline(
            db, user_id,
        )

        anomalies: list[dict] = []

        for metric, value in readings.items():
            anomaly = self._check_single_metric(
                metric, value, baseline,
            )
            if anomaly:
                anomalies.append(anomaly)

        # Sort by severity (severe first)
        severity_order = {"severe": 0, "moderate": 1, "mild": 2}
        anomalies.sort(
            key=lambda a: severity_order.get(a["severity"], 3),
        )

        return anomalies

    async def detect_from_latest_wearable(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        """
        Detect anomalies from the user's most recent
        wearable snapshot.
        """
        snapshots = await self._history.get_wearable_history(
            db, user_id, days=1, limit=1,
        )
        if not snapshots:
            return []

        latest = snapshots[0]
        readings: dict[str, float] = {}
        for field in [
            "heart_rate_bpm", "spo2_percent", "sleep_hours",
            "steps", "stress_level", "active_minutes",
        ]:
            val = getattr(latest, field, None)
            if val is not None:
                readings[field] = float(val)

        return await self.detect_anomalies(db, user_id, readings)

    # ── Single metric check ──────────────────────────────────

    def _check_single_metric(
        self,
        metric: str,
        value: float,
        baseline: Optional[dict],
    ) -> Optional[dict]:
        """
        Check if a single reading is anomalous relative to
        the personal baseline. Falls back to generic thresholds
        if baseline is unavailable.
        """
        # Field mapping to baseline dict keys
        avg_map = {
            "heart_rate_bpm": "resting_hr_bpm",
            "spo2_percent": "avg_spo2_percent",
            "sleep_hours": "avg_sleep_hours",
            "steps": "avg_steps",
            "stress_level": "avg_stress_level",
            "active_minutes": "avg_active_minutes",
        }
        std_map = {
            "heart_rate_bpm": "std_hr_bpm",
            "spo2_percent": "std_spo2_percent",
            "sleep_hours": "std_sleep_hours",
            "steps": "std_steps",
            "stress_level": "std_stress_level",
        }

        avg_key = avg_map.get(metric)
        std_key = std_map.get(metric)

        personal_mean = None
        personal_std = None
        confidence = 0.0

        if baseline and avg_key:
            personal_mean = baseline.get(avg_key)
            personal_std = baseline.get(std_key) if std_key else None
            confidence = baseline.get("current_confidence", 0.0)

        # If we have a personal baseline, use z-score
        if personal_mean is not None and personal_std and personal_std > 0:
            z_score = abs(value - personal_mean) / personal_std
            deviation_pct = (
                (value - personal_mean) / personal_mean * 100
                if personal_mean != 0 else 0
            )

            if z_score >= SEVERE_THRESHOLD:
                severity = "severe"
            elif z_score >= MODERATE_THRESHOLD:
                severity = "moderate"
            elif z_score >= MILD_THRESHOLD:
                severity = "mild"
            else:
                return None  # Within normal range

            display = metric.replace("_", " ").title()
            direction = "above" if value > personal_mean else "below"
            message = (
                f"{display} is {abs(deviation_pct):.0f}% "
                f"{direction} your personal baseline."
            )

            return {
                "metric": metric,
                "display_name": display,
                "value": value,
                "personal_mean": round(personal_mean, 2),
                "personal_std": round(personal_std, 2),
                "z_score": round(z_score, 2),
                "deviation_pct": round(deviation_pct, 1),
                "severity": severity,
                "confidence": round(confidence, 3),
                "source": "personal_baseline",
                "message": message,
            }

        # Fallback: use generic thresholds
        return self._check_generic(metric, value)

    @staticmethod
    def _check_generic(
        metric: str,
        value: float,
    ) -> Optional[dict]:
        """
        Fallback anomaly detection using generic population
        thresholds when no personal baseline is available.
        """
        generic = GENERIC_THRESHOLDS.get(metric)
        if not generic:
            return None

        crit_low = generic.get("critical_low")
        crit_high = generic.get("critical_high")
        normal_low = generic["low"]
        normal_high = generic["high"]

        display = metric.replace("_", " ").title()

        if crit_low is not None and value <= crit_low:
            return {
                "metric": metric,
                "display_name": display,
                "value": value,
                "personal_mean": None,
                "personal_std": None,
                "z_score": None,
                "deviation_pct": None,
                "severity": "severe",
                "confidence": 0.0,
                "source": "generic_threshold",
                "message": (
                    f"{display} ({value}) is critically below "
                    "normal population range."
                ),
            }

        if crit_high is not None and value >= crit_high:
            return {
                "metric": metric,
                "display_name": display,
                "value": value,
                "personal_mean": None,
                "personal_std": None,
                "z_score": None,
                "deviation_pct": None,
                "severity": "severe",
                "confidence": 0.0,
                "source": "generic_threshold",
                "message": (
                    f"{display} ({value}) is critically above "
                    "normal population range."
                ),
            }

        if value < normal_low or value > normal_high:
            direction = "below" if value < normal_low else "above"
            return {
                "metric": metric,
                "display_name": display,
                "value": value,
                "personal_mean": None,
                "personal_std": None,
                "z_score": None,
                "deviation_pct": None,
                "severity": "mild",
                "confidence": 0.0,
                "source": "generic_threshold",
                "message": (
                    f"{display} ({value}) is {direction} the "
                    "normal population range. Personalized "
                    "detection will improve with more data."
                ),
            }

        return None
