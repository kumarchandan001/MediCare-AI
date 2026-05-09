"""
health_intelligence/scoring/wellness_index.py
───────────────────────────────────────────────
Long-term Wellness Index — a multi-dimensional composite
metric that captures overall well-being trajectory.

Unlike the health_score (which is a snapshot), the wellness
index emphasizes stability, consistency, and long-term
trends over raw metric values.

Dimensions:
  - Physical wellness (activity, cardiovascular)
  - Mental wellness (stress, sleep quality)
  - Behavioral consistency (tracking adherence)
  - Recovery resilience
  - Trend momentum
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.scoring.health_score_engine import HealthScoreEngine
from health_intelligence.scoring.recovery_score import RecoveryScoreEngine
from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
    compute_freshness,
)
from health_intelligence.history.wearable_timeline import WearableTimeline

log = logging.getLogger(__name__)


class WellnessIndex:
    """
    Computes a long-term wellness index that captures
    stability, consistency, and overall trajectory.
    """

    def __init__(self):
        self._health_score = HealthScoreEngine()
        self._recovery = RecoveryScoreEngine()
        self._history = HealthHistoryManager()
        self._wearable_tl = WearableTimeline()

    async def compute_wellness_index(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Compute the multi-dimensional wellness index.

        Returns:
          {
            "wellness_index": 79,
            "dimensions": {
              "physical": 82,
              "mental": 74,
              "behavioral": 88,
              "resilience": 71,
            },
            "stability_score": 85,
          }
        """
        # Get current health score
        health = await self._health_score.compute_health_score(
            db, user_id,
        )
        # Get recovery profile
        recovery = await self._recovery.compute_recovery_score(
            db, user_id,
        )
        # Get data quality
        data_quality = await self._wearable_tl.get_data_quality_report(
            db, user_id, days=14,
        )
        # Get score history for stability analysis
        score_history = await self._history.get_score_history(
            db, user_id, days=30,
        )

        # ── Dimension scores ────────────────────────────────
        components = health.get("components", {})

        physical = self._physical_dimension(components)
        mental = self._mental_dimension(components)
        behavioral = self._behavioral_dimension(data_quality)
        resilience = self._resilience_dimension(recovery)
        stability = self._stability_dimension(score_history)

        # ── Composite wellness index ────────────────────────
        dimensions = {
            "physical": physical,
            "mental": mental,
            "behavioral": behavioral,
            "resilience": resilience,
        }

        valid = {k: v for k, v in dimensions.items() if v is not None}
        if not valid:
            return {
                "wellness_index": None,
                "status": "insufficient_data",
                "message": "Not enough data to compute wellness index.",
            }

        weights = {
            "physical": 0.30,
            "mental": 0.30,
            "behavioral": 0.20,
            "resilience": 0.20,
        }

        total = sum(
            valid[k] * weights.get(k, 0.25)
            for k in valid
        )
        total_weight = sum(
            weights.get(k, 0.25) for k in valid
        )
        wellness_index = total / total_weight if total_weight > 0 else 50

        return {
            "wellness_index": round(wellness_index, 1),
            "dimensions": {
                k: round(v, 1) if v is not None else None
                for k, v in dimensions.items()
            },
            "stability_score": round(stability, 1) if stability else None,
            "health_score_snapshot": health.get("health_score"),
            "recovery_score_snapshot": recovery.get("recovery_score"),
            "data_confidence": health.get("score_confidence", 0),
            "computed_at": datetime.utcnow().isoformat(),
        }

    # ── Dimension computations ───────────────────────────────

    @staticmethod
    def _physical_dimension(components: dict) -> Optional[float]:
        """Physical wellness from activity + cardiovascular."""
        scores = []
        for key in ["activity", "cardiovascular"]:
            comp = components.get(key, {})
            if comp.get("score") is not None:
                scores.append(comp["score"])

        return sum(scores) / len(scores) if scores else None

    @staticmethod
    def _mental_dimension(components: dict) -> Optional[float]:
        """Mental wellness from stress + sleep."""
        scores = []
        for key in ["stress", "sleep"]:
            comp = components.get(key, {})
            if comp.get("score") is not None:
                scores.append(comp["score"])

        return sum(scores) / len(scores) if scores else None

    @staticmethod
    def _behavioral_dimension(data_quality: dict) -> Optional[float]:
        """Behavioral consistency from tracking adherence."""
        continuity = data_quality.get("continuity_score", 0)
        freshness = data_quality.get("overall_freshness", 0)
        snapshots = data_quality.get("total_snapshots", 0)

        if snapshots == 0:
            return None

        volume = min(snapshots / 14.0, 1.0)
        score = (continuity * 40 + freshness * 30 + volume * 30)
        return min(score, 100)

    @staticmethod
    def _resilience_dimension(recovery: dict) -> Optional[float]:
        """Resilience from recovery score and velocity."""
        recovery_score = recovery.get("recovery_score")
        resilience = recovery.get("resilience_score")

        if recovery_score is not None and resilience is not None:
            return (recovery_score * 0.5 + resilience * 0.5)
        elif recovery_score is not None:
            return recovery_score
        return None

    @staticmethod
    def _stability_dimension(
        score_history: list,
    ) -> Optional[float]:
        """
        Score stability from historical health scores.
        Lower variance = higher stability.
        """
        if len(score_history) < 3:
            return None

        scores = [s.health_score for s in score_history if s.health_score]
        if len(scores) < 3:
            return None

        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        std = variance ** 0.5

        # Lower std = higher stability (max stability at std=0)
        # Normalize: std of 0 = 100, std of 20+ = 40
        stability = max(40, 100 - std * 3)
        return min(stability, 100)
