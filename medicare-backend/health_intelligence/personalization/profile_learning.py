"""
health_intelligence/personalization/profile_learning.py
───────────────────────────────────────────────
Profile Learning Engine — learns individual behavioral
patterns and applies confidence decay logic when data
becomes sparse, inconsistent, or outdated.

Confidence Decay triggers:
  - Data is sparse (< N points per window)
  - Wearable sync is inconsistent (large gaps)
  - Health logs are outdated (old freshness)
  - Tracking continuity is poor

Outputs:
  - baseline_confidence (how reliable the baseline is)
  - trend_confidence (how reliable detected trends are)
  - insight_reliability (overall trustworthiness)
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
from health_intelligence.personalization.baseline_engine import (
    BaselineEngine,
)

log = logging.getLogger(__name__)


# ── Confidence decay configuration ───────────────────────────

# After this many days without data, confidence starts
# decaying rapidly
STALENESS_THRESHOLD_DAYS = 3

# Minimum data points per week for "healthy" tracking
MIN_POINTS_PER_WEEK = 4


class ProfileLearner:
    """
    Learns user behavioral profiles and manages confidence
    decay across all intelligence outputs.
    """

    def __init__(self):
        self._history = HealthHistoryManager()
        self._baseline_engine = BaselineEngine()

    async def get_profile_confidence(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Compute a comprehensive confidence report for a user's
        health intelligence profile.

        Returns:
          {
            "baseline_confidence": 0.82,
            "trend_confidence": 0.74,
            "insight_reliability": 0.78,
            "data_quality": {...},
            "decay_factors": {...},
            "recommendations": [...],
          }
        """
        # Gather data quality signals
        wearable_data = await self._history.get_wearable_history(
            db, user_id, days=14,
        )
        symptom_data = await self._history.get_symptom_history(
            db, user_id, days=30,
        )

        # Wearable timestamps
        w_timestamps = [s.recorded_at for s in wearable_data]
        s_timestamps = [s.recorded_at for s in symptom_data]

        # ── Data quality metrics ─────────────────────────────
        wearable_continuity = compute_continuity_score(
            w_timestamps, expected_interval_hours=24.0, window_days=14,
        )
        wearable_freshness = (
            compute_freshness(max(w_timestamps), 7.0)
            if w_timestamps else 0.0
        )
        wearable_volume = len(wearable_data)

        symptom_freshness = (
            compute_freshness(max(s_timestamps), 14.0)
            if s_timestamps else 0.0
        )

        # ── Staleness penalty ────────────────────────────────
        staleness_penalty = self._compute_staleness_penalty(
            w_timestamps,
        )

        # ── Sparsity penalty ────────────────────────────────
        sparsity_penalty = self._compute_sparsity_penalty(
            wearable_volume, window_days=14,
        )

        # ── Baseline confidence ──────────────────────────────
        baseline = await self._baseline_engine.get_current_baseline(
            db, user_id,
        )
        baseline_conf = (
            baseline["current_confidence"]
            if baseline else 0.0
        )

        # ── Trend confidence ─────────────────────────────────
        trend_confidence = self._compute_trend_confidence(
            wearable_continuity=wearable_continuity,
            wearable_freshness=wearable_freshness,
            data_points=wearable_volume,
            staleness_penalty=staleness_penalty,
            sparsity_penalty=sparsity_penalty,
        )

        # ── Insight reliability ──────────────────────────────
        insight_reliability = self._compute_insight_reliability(
            baseline_conf=baseline_conf,
            trend_conf=trend_confidence,
            symptom_freshness=symptom_freshness,
        )

        # ── Recommendations ──────────────────────────────────
        recommendations = self._generate_recommendations(
            wearable_continuity=wearable_continuity,
            wearable_freshness=wearable_freshness,
            wearable_volume=wearable_volume,
            staleness_penalty=staleness_penalty,
        )

        return {
            "baseline_confidence": round(baseline_conf, 3),
            "trend_confidence": round(trend_confidence, 3),
            "insight_reliability": round(insight_reliability, 3),
            "data_quality": {
                "wearable_data_points_14d": wearable_volume,
                "wearable_continuity": round(wearable_continuity, 3),
                "wearable_freshness": round(wearable_freshness, 3),
                "symptom_entries_30d": len(symptom_data),
                "symptom_freshness": round(symptom_freshness, 3),
            },
            "decay_factors": {
                "staleness_penalty": round(staleness_penalty, 3),
                "sparsity_penalty": round(sparsity_penalty, 3),
            },
            "recommendations": recommendations,
        }

    async def learn_behavioral_norms(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Learn behavioral norms: typical sleep hours, activity
        patterns, stress patterns, etc.

        These norms power adaptive thresholds and anomaly detection.
        """
        from health_intelligence.history.wearable_timeline import (
            WearableTimeline,
        )
        wt = WearableTimeline()
        daily = await wt.get_daily_aggregates(db, user_id, days=14)

        if not daily:
            return {"status": "insufficient_data", "norms": {}}

        norms: dict = {}
        fields = [
            "heart_rate_bpm", "sleep_hours", "steps",
            "stress_level", "active_minutes",
        ]

        for field in fields:
            values = [
                d[field] for d in daily
                if d.get(field) is not None
            ]
            if len(values) >= 3:
                avg = sum(values) / len(values)
                std = (
                    sum((v - avg) ** 2 for v in values) / len(values)
                ) ** 0.5
                norms[field] = {
                    "mean": round(avg, 2),
                    "std": round(std, 2),
                    "min": round(min(values), 2),
                    "max": round(max(values), 2),
                    "data_days": len(values),
                }

        return {
            "status": "computed",
            "norms": norms,
            "days_analyzed": len(daily),
        }

    # ── Confidence decay computations ────────────────────────

    @staticmethod
    def _compute_staleness_penalty(
        timestamps: list[datetime],
    ) -> float:
        """
        Penalize when the most recent data is too old.
        Returns a penalty ∈ [0, 1] where 0 = no penalty.
        """
        if not timestamps:
            return 1.0

        latest = max(timestamps)
        now = datetime.utcnow()
        if latest.tzinfo:
            from datetime import timezone
            now = now.replace(tzinfo=timezone.utc)

        age_days = (now - latest).total_seconds() / 86400.0

        if age_days <= STALENESS_THRESHOLD_DAYS:
            return 0.0

        # Exponential penalty beyond threshold
        excess = age_days - STALENESS_THRESHOLD_DAYS
        return min(1.0 - math.exp(-0.3 * excess), 1.0)

    @staticmethod
    def _compute_sparsity_penalty(
        data_points: int,
        window_days: int = 14,
    ) -> float:
        """
        Penalize when data density is too low.
        """
        expected_min = (window_days / 7) * MIN_POINTS_PER_WEEK
        if data_points >= expected_min:
            return 0.0

        ratio = data_points / max(expected_min, 1)
        return round(1.0 - ratio, 3)

    @staticmethod
    def _compute_trend_confidence(
        wearable_continuity: float,
        wearable_freshness: float,
        data_points: int,
        staleness_penalty: float,
        sparsity_penalty: float,
    ) -> float:
        """
        Compute trend confidence factoring in all decay signals.
        """
        if data_points < 3:
            return 0.0

        base = (
            wearable_continuity * 0.35
            + wearable_freshness * 0.35
            + min(data_points / 20.0, 1.0) * 0.30
        )

        # Apply decay penalties
        decay = 1.0 - (staleness_penalty * 0.5 + sparsity_penalty * 0.5)
        return round(base * decay, 3)

    @staticmethod
    def _compute_insight_reliability(
        baseline_conf: float,
        trend_conf: float,
        symptom_freshness: float,
    ) -> float:
        """
        Overall insight reliability — a meta-confidence
        representing how much the user should trust the
        intelligence outputs.
        """
        return round(
            baseline_conf * 0.40
            + trend_conf * 0.35
            + symptom_freshness * 0.25,
            3,
        )

    @staticmethod
    def _generate_recommendations(
        wearable_continuity: float,
        wearable_freshness: float,
        wearable_volume: int,
        staleness_penalty: float,
    ) -> list[str]:
        """Generate human-readable recommendations to improve data quality."""
        recs: list[str] = []

        if wearable_volume == 0:
            recs.append(
                "No wearable data detected. Sync your wearable device "
                "to enable personalized health intelligence."
            )
            return recs

        if staleness_penalty > 0.5:
            recs.append(
                "Your wearable data is becoming outdated. "
                "Sync your device to maintain accurate baselines."
            )

        if wearable_continuity < 0.5:
            recs.append(
                "Inconsistent tracking detected. Wearing your device "
                "consistently improves the accuracy of health insights."
            )

        if wearable_volume < 7:
            recs.append(
                "More data is needed for reliable trend analysis. "
                "Continue tracking for at least 2 weeks."
            )

        if wearable_freshness < 0.3:
            recs.append(
                "Recent data is limited. Sync your device regularly "
                "for the most accurate health intelligence."
            )

        if not recs:
            recs.append(
                "Great tracking consistency! Your health intelligence "
                "is operating at high confidence."
            )

        return recs
