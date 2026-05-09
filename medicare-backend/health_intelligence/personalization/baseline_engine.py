"""
health_intelligence/personalization/baseline_engine.py
───────────────────────────────────────────────
Personal Health Baseline Engine — learns each user's
normal physiological ranges using recency-weighted
rolling statistics.

Key principle:
  User A: resting HR = 52 bpm → 80 bpm is alarming
  User B: resting HR = 88 bpm → 80 bpm is fine

The system must NOT treat them identically.

Features:
  - Recency-weighted rolling averages (newer data matters more)
  - Standard deviation tracking for anomaly thresholds
  - Baseline confidence scoring
  - Freshness-aware computation
  - Automatic baseline snapshots to DB
"""

import logging
import math
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
    compute_freshness,
    compute_continuity_score,
)
from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.models import (
    HealthBaselineLog,
    WearableSnapshot,
)

log = logging.getLogger(__name__)


# ── Baseline configuration ───────────────────────────────────

# Minimum data points to consider baseline "trustworthy"
MIN_POINTS_FOR_BASELINE = 5

# Rolling window defaults
DEFAULT_WINDOW_DAYS = 14
FRESHNESS_HALF_LIFE = 7.0

# Metrics we track baselines for
BASELINE_METRICS = [
    "heart_rate_bpm", "spo2_percent", "sleep_hours", "steps",
    "stress_level", "active_minutes", "calories_burned",
]


class BaselineEngine:
    """
    Computes and manages personalized physiological baselines
    for each user using recency-weighted statistics.
    """

    def __init__(self):
        self._history = HealthHistoryManager()
        self._wearable_tl = WearableTimeline()

    async def compute_baseline(
        self,
        db: AsyncSession,
        user_id: int,
        window_days: int = DEFAULT_WINDOW_DAYS,
    ) -> dict:
        """
        Compute the full personal baseline from wearable history.

        Returns a dict with:
          - Per-metric weighted average and std dev
          - Baseline confidence (0–1)
          - Data freshness score (0–1)
          - Data continuity score (0–1)
        """
        snapshots = await self._history.get_wearable_history(
            db, user_id, days=window_days,
        )

        if not snapshots:
            return self._empty_baseline()

        # Compute weighted stats per metric
        metrics: dict[str, dict] = {}
        for field in BASELINE_METRICS:
            stats = self._weighted_stats(snapshots, field)
            metrics[field] = stats

        # Data quality
        timestamps = [s.recorded_at for s in snapshots]
        continuity = compute_continuity_score(
            timestamps, expected_interval_hours=24.0,
            window_days=window_days,
        )
        freshest = max(timestamps)
        freshness = compute_freshness(freshest, FRESHNESS_HALF_LIFE)

        # Baseline confidence
        confidence = self._compute_baseline_confidence(
            data_points=len(snapshots),
            continuity=continuity,
            freshness=freshness,
        )

        return {
            "user_id": user_id,
            "metrics": metrics,
            "data_points": len(snapshots),
            "window_days": window_days,
            "continuity_score": continuity,
            "freshness_score": round(freshness, 3),
            "baseline_confidence": round(confidence, 3),
            "computed_at": datetime.utcnow().isoformat(),
        }

    async def compute_and_save_baseline(
        self,
        db: AsyncSession,
        user_id: int,
        window_days: int = DEFAULT_WINDOW_DAYS,
    ) -> HealthBaselineLog:
        """
        Compute baseline and persist to the database.
        """
        baseline_data = await self.compute_baseline(
            db, user_id, window_days,
        )
        metrics = baseline_data["metrics"]

        bl = HealthBaselineLog(
            user_id=user_id,
            resting_hr_bpm=metrics.get("heart_rate_bpm", {}).get("weighted_avg"),
            avg_spo2_percent=metrics.get("spo2_percent", {}).get("weighted_avg"),
            avg_sleep_hours=metrics.get("sleep_hours", {}).get("weighted_avg"),
            avg_steps=metrics.get("steps", {}).get("weighted_avg"),
            avg_stress_level=metrics.get("stress_level", {}).get("weighted_avg"),
            avg_active_minutes=metrics.get("active_minutes", {}).get("weighted_avg"),
            avg_calories_burned=metrics.get("calories_burned", {}).get("weighted_avg"),
            std_hr_bpm=metrics.get("heart_rate_bpm", {}).get("weighted_std"),
            std_spo2_percent=metrics.get("spo2_percent", {}).get("weighted_std"),
            std_sleep_hours=metrics.get("sleep_hours", {}).get("weighted_std"),
            std_steps=metrics.get("steps", {}).get("weighted_std"),
            std_stress_level=metrics.get("stress_level", {}).get("weighted_std"),
            data_points_used=baseline_data["data_points"],
            window_days=window_days,
            baseline_confidence=baseline_data["baseline_confidence"],
            freshness_score=baseline_data["freshness_score"],
        )

        return await self._history.save_baseline(db, bl)

    async def get_current_baseline(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        """
        Retrieve the most recent saved baseline for a user.
        Returns None if no baseline exists.
        """
        bl = await self._history.get_latest_baseline(db, user_id)
        if not bl:
            return None

        # Apply freshness decay to stored confidence
        stored_freshness = compute_freshness(
            bl.recorded_at, FRESHNESS_HALF_LIFE,
        )
        decayed_confidence = bl.baseline_confidence * stored_freshness

        return {
            "user_id": user_id,
            "resting_hr_bpm": bl.resting_hr_bpm,
            "avg_spo2_percent": bl.avg_spo2_percent,
            "avg_sleep_hours": bl.avg_sleep_hours,
            "avg_steps": bl.avg_steps,
            "avg_stress_level": bl.avg_stress_level,
            "avg_active_minutes": bl.avg_active_minutes,
            "avg_calories_burned": bl.avg_calories_burned,
            "std_hr_bpm": bl.std_hr_bpm,
            "std_spo2_percent": bl.std_spo2_percent,
            "std_sleep_hours": bl.std_sleep_hours,
            "std_steps": bl.std_steps,
            "std_stress_level": bl.std_stress_level,
            "data_points_used": bl.data_points_used,
            "window_days": bl.window_days,
            "baseline_confidence": round(bl.baseline_confidence, 3),
            "current_confidence": round(decayed_confidence, 3),
            "freshness_score": round(stored_freshness, 3),
            "computed_at": bl.recorded_at.isoformat() if bl.recorded_at else None,
            "confidence_decayed": round(
                bl.baseline_confidence - decayed_confidence, 3,
            ),
        }

    # ── Weighted statistics ──────────────────────────────────

    def _weighted_stats(
        self,
        snapshots: list[WearableSnapshot],
        field: str,
    ) -> dict:
        """
        Compute recency-weighted mean and std dev for a
        single wearable metric.
        """
        values: list[tuple[float, float]] = []  # (value, weight)
        for snap in snapshots:
            val = getattr(snap, field, None)
            if val is not None:
                w = compute_freshness(
                    snap.recorded_at, FRESHNESS_HALF_LIFE,
                )
                values.append((float(val), w))

        if not values:
            return {
                "weighted_avg": None,
                "weighted_std": None,
                "raw_avg": None,
                "data_points": 0,
            }

        # Weighted mean
        total_weight = sum(w for _, w in values)
        weighted_avg = sum(v * w for v, w in values) / total_weight

        # Weighted std dev
        variance = sum(
            w * (v - weighted_avg) ** 2 for v, w in values
        ) / total_weight
        weighted_std = math.sqrt(variance)

        # Raw (unweighted) mean for comparison
        raw_avg = sum(v for v, _ in values) / len(values)

        return {
            "weighted_avg": round(weighted_avg, 2),
            "weighted_std": round(weighted_std, 2),
            "raw_avg": round(raw_avg, 2),
            "data_points": len(values),
        }

    # ── Baseline confidence ──────────────────────────────────

    @staticmethod
    def _compute_baseline_confidence(
        data_points: int,
        continuity: float,
        freshness: float,
    ) -> float:
        """
        Compute baseline confidence ∈ [0, 1].

        Factors:
          1. Data volume (more data → higher confidence)
          2. Continuity (consistent tracking → higher confidence)
          3. Freshness (recent data → higher confidence)

        Formula:
          volume_factor = min(data_points / 30, 1.0)
          confidence = volume_factor * 0.4 + continuity * 0.3 + freshness * 0.3
        """
        if data_points < MIN_POINTS_FOR_BASELINE:
            # Not enough data — cap at 0.3
            volume = data_points / MIN_POINTS_FOR_BASELINE * 0.3
            return round(volume * freshness, 3)

        volume_factor = min(data_points / 30.0, 1.0)
        confidence = (
            volume_factor * 0.4
            + continuity * 0.3
            + freshness * 0.3
        )
        return round(min(confidence, 1.0), 3)

    @staticmethod
    def _empty_baseline() -> dict:
        return {
            "user_id": None,
            "metrics": {},
            "data_points": 0,
            "window_days": DEFAULT_WINDOW_DAYS,
            "continuity_score": 0.0,
            "freshness_score": 0.0,
            "baseline_confidence": 0.0,
            "computed_at": datetime.utcnow().isoformat(),
            "message": "Insufficient data to compute baseline.",
        }
