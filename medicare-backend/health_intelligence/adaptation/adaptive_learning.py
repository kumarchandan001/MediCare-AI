"""
health_intelligence/adaptation/adaptive_learning.py
───────────────────────────────────────────────
Rolling recalibration engine — learns from recent
observations to update what "normal" means for a user.

Uses exponential moving averages (EMA) for smooth,
recency-weighted baseline updates without requiring
full database re-queries.

Features:
  - Per-metric EMA tracking
  - Configurable learning rates
  - Anomaly-resistant updates (outlier rejection)
  - Confidence tracking per metric
"""

import logging
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

log = logging.getLogger(__name__)

DEFAULT_ALPHA = 0.1  # EMA smoothing factor (lower = slower adaptation)


@dataclass
class MetricState:
    """Tracked state for one metric."""
    name: str
    ema_value: Optional[float] = None
    ema_variance: Optional[float] = None
    observation_count: int = 0
    last_updated: Optional[datetime] = None
    alpha: float = DEFAULT_ALPHA


class AdaptiveLearningEngine:
    """
    Continuously recalibrates personal baselines using
    exponential moving averages.

    Fast enough for real-time use — no database access.
    """

    def __init__(
        self,
        alpha: float = DEFAULT_ALPHA,
        outlier_threshold: float = 3.0,
    ):
        self._alpha = alpha
        self._outlier_threshold = outlier_threshold
        self._metrics: dict[int, dict[str, MetricState]] = defaultdict(dict)

    # ── Initialization ───────────────────────────────────────

    def initialize_from_baseline(
        self,
        user_id: int,
        baselines: dict[str, float],
        stds: Optional[dict[str, float]] = None,
    ) -> None:
        """
        Seed the EMA tracker from existing baselines.
        """
        stds = stds or {}
        for metric, value in baselines.items():
            std = stds.get(metric)
            variance = std ** 2 if std else None

            self._metrics[user_id][metric] = MetricState(
                name=metric,
                ema_value=value,
                ema_variance=variance,
                observation_count=10,  # assume baseline has history
                last_updated=datetime.utcnow(),
                alpha=self._alpha,
            )

    # ── Online update ────────────────────────────────────────

    def update(
        self,
        user_id: int,
        metric: str,
        value: float,
        timestamp: Optional[datetime] = None,
    ) -> dict:
        """
        Update a metric with a new observation.

        Returns:
          {
            "accepted": True/False,
            "ema_before": ...,
            "ema_after": ...,
            "is_outlier": True/False,
          }
        """
        ts = timestamp or datetime.utcnow()

        if metric not in self._metrics[user_id]:
            # First observation
            self._metrics[user_id][metric] = MetricState(
                name=metric,
                ema_value=value,
                ema_variance=0.0,
                observation_count=1,
                last_updated=ts,
                alpha=self._alpha,
            )
            return {
                "accepted": True,
                "ema_before": None,
                "ema_after": value,
                "is_outlier": False,
            }

        state = self._metrics[user_id][metric]
        ema_before = state.ema_value

        # Outlier check
        is_outlier = self._is_outlier(state, value)

        if is_outlier:
            # Don't update EMA with outliers
            return {
                "accepted": False,
                "ema_before": ema_before,
                "ema_after": ema_before,
                "is_outlier": True,
                "rejection_reason": (
                    f"{value:.1f} is {self._outlier_threshold}σ "
                    f"from EMA ({ema_before:.1f})"
                ),
            }

        # EMA update
        alpha = state.alpha
        state.ema_value = alpha * value + (1 - alpha) * state.ema_value

        # Variance EMA
        if state.ema_variance is not None:
            diff_sq = (value - ema_before) ** 2
            state.ema_variance = (
                alpha * diff_sq + (1 - alpha) * state.ema_variance
            )
        else:
            state.ema_variance = (value - state.ema_value) ** 2

        state.observation_count += 1
        state.last_updated = ts

        return {
            "accepted": True,
            "ema_before": round(ema_before, 3) if ema_before else None,
            "ema_after": round(state.ema_value, 3),
            "is_outlier": False,
        }

    def update_batch(
        self,
        user_id: int,
        values: dict[str, float],
        timestamp: Optional[datetime] = None,
    ) -> dict[str, dict]:
        """Update multiple metrics at once."""
        results = {}
        for metric, value in values.items():
            if value is not None:
                results[metric] = self.update(
                    user_id, metric, value, timestamp,
                )
        return results

    # ── Query ────────────────────────────────────────────────

    def get_learned_baselines(
        self,
        user_id: int,
    ) -> dict[str, dict]:
        """
        Return the current learned baselines for a user.
        """
        result = {}
        for metric, state in self._metrics.get(user_id, {}).items():
            std = (
                math.sqrt(state.ema_variance)
                if state.ema_variance and state.ema_variance > 0
                else None
            )
            result[metric] = {
                "mean": round(state.ema_value, 3) if state.ema_value else None,
                "std": round(std, 3) if std else None,
                "observations": state.observation_count,
                "confidence": self._compute_confidence(state),
                "last_updated": (
                    state.last_updated.isoformat()
                    if state.last_updated else None
                ),
            }
        return result

    def get_metric_state(
        self,
        user_id: int,
        metric: str,
    ) -> Optional[MetricState]:
        """Get the raw state for a specific metric."""
        return self._metrics.get(user_id, {}).get(metric)

    # ── Helpers ──────────────────────────────────────────────

    def _is_outlier(self, state: MetricState, value: float) -> bool:
        """Check if a value is an outlier based on EMA variance."""
        if (
            state.ema_value is None
            or state.ema_variance is None
            or state.observation_count < 5
        ):
            return False

        std = math.sqrt(max(state.ema_variance, 0.01))
        z_score = abs(value - state.ema_value) / std
        return z_score > self._outlier_threshold

    @staticmethod
    def _compute_confidence(state: MetricState) -> float:
        """
        Confidence based on observation count and recency.
        """
        if state.observation_count < 3:
            return 0.2

        volume = min(state.observation_count / 30.0, 1.0)

        freshness = 1.0
        if state.last_updated:
            age = (
                datetime.utcnow() - state.last_updated
            ).total_seconds() / 3600  # hours
            freshness = math.exp(-0.05 * age)  # half-life ~14h

        return round(volume * 0.6 + freshness * 0.4, 3)
