"""
health_intelligence/adaptation/personalized_weighting.py
───────────────────────────────────────────────
Personalized modality weighting — adjusts how much
each wearable signal contributes to composite assessments
based on that signal's historical consistency and reliability.

Signals with erratic, sparse, or low-quality data get
lower weights. Consistent, reliable signals get higher
influence.

Features:
  - Consistency-based weight adjustment
  - Freshness-aware weighting
  - Missing modality redistribution
  - Weight explanation
"""

import logging
import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

from health_intelligence.wearable_fusion.wearable_confidence import (
    WearableConfidenceScorer, SignalConfidence,
)

log = logging.getLogger(__name__)

# Base weights (equal starting point)
BASE_WEIGHTS: dict[str, float] = {
    "heart_rate_bpm": 0.15,
    "spo2_percent": 0.12,
    "stress_level": 0.13,
    "sleep_hours": 0.15,
    "steps": 0.10,
    "active_minutes": 0.10,
    "hrv_ms": 0.10,
    "calories_burned": 0.05,
    "respiratory_rate": 0.05,
    "temperature_celsius": 0.05,
}


class PersonalizedWeightingEngine:
    """
    Adjusts modality weights based on each signal's
    historical consistency and real-time reliability.
    """

    def __init__(self):
        self._scorer = WearableConfidenceScorer()
        # user_id → metric → consistency score history
        self._consistency_history: dict[int, dict[str, list[float]]] = (
            defaultdict(lambda: defaultdict(list))
        )

    def record_observation(
        self,
        user_id: int,
        metric: str,
        confidence: float,
    ) -> None:
        """
        Record a signal's confidence for consistency tracking.
        Keeps a rolling window of recent confidences.
        """
        history = self._consistency_history[user_id][metric]
        history.append(confidence)
        # Keep last 100 observations
        if len(history) > 100:
            self._consistency_history[user_id][metric] = history[-50:]

    def compute_weights(
        self,
        user_id: int,
        current_confidences: Optional[dict[str, SignalConfidence]] = None,
    ) -> dict[str, dict]:
        """
        Compute personalized weights for all modalities.

        Returns:
          {
            "heart_rate_bpm": {
              "weight": 0.18,
              "base_weight": 0.15,
              "adjustment_reason": "...",
              "consistency": 0.92,
            },
            ...
          }
        """
        result: dict[str, dict] = {}
        raw_weights: dict[str, float] = {}

        for metric, base in BASE_WEIGHTS.items():
            consistency = self._get_consistency(user_id, metric)
            current_conf = 1.0

            if current_confidences and metric in current_confidences:
                sc = current_confidences[metric]
                current_conf = sc.confidence

            if current_conf < 0.1:
                # Signal unavailable — zero weight
                raw_weights[metric] = 0.0
                result[metric] = {
                    "weight": 0.0,
                    "base_weight": base,
                    "consistency": consistency,
                    "current_confidence": current_conf,
                    "adjustment_reason": "Signal unavailable",
                }
                continue

            # Adjust weight based on consistency and current confidence
            adjusted = base * consistency * current_conf

            raw_weights[metric] = adjusted
            result[metric] = {
                "weight": adjusted,  # will normalize below
                "base_weight": base,
                "consistency": round(consistency, 3),
                "current_confidence": round(current_conf, 3),
                "adjustment_reason": self._explain_adjustment(
                    base, adjusted, consistency, current_conf,
                ),
            }

        # Normalize weights to sum to 1.0
        total = sum(raw_weights.values())
        if total > 0:
            for metric in result:
                if result[metric]["weight"] > 0:
                    result[metric]["weight"] = round(
                        result[metric]["weight"] / total, 4,
                    )

        return result

    def get_effective_weights(
        self,
        user_id: int,
        current_confidences: Optional[dict[str, SignalConfidence]] = None,
    ) -> dict[str, float]:
        """
        Simple dict of metric → normalized weight.
        """
        full = self.compute_weights(user_id, current_confidences)
        return {m: d["weight"] for m, d in full.items()}

    # ── Helpers ──────────────────────────────────────────────

    def _get_consistency(
        self,
        user_id: int,
        metric: str,
    ) -> float:
        """
        Compute consistency score from historical confidence
        observations. High consistency = stable, reliable signal.
        """
        history = self._consistency_history.get(
            user_id, {},
        ).get(metric, [])

        if len(history) < 3:
            return 0.7  # default moderate confidence

        avg = sum(history) / len(history)

        # Low variance = high consistency
        variance = (
            sum((c - avg) ** 2 for c in history) / len(history)
        )
        std = math.sqrt(variance)

        consistency = avg * (1.0 - min(std, 0.5))
        return max(0.1, min(consistency, 1.0))

    @staticmethod
    def _explain_adjustment(
        base: float,
        adjusted: float,
        consistency: float,
        current_conf: float,
    ) -> str:
        """Generate a human-readable explanation."""
        if adjusted >= base:
            return (
                f"Weight maintained/increased "
                f"(consistency={consistency:.2f}, "
                f"confidence={current_conf:.2f})"
            )
        ratio = adjusted / base if base > 0 else 0
        if ratio < 0.5:
            return (
                f"Weight significantly reduced due to "
                f"low consistency ({consistency:.2f}) or "
                f"confidence ({current_conf:.2f})"
            )
        return (
            f"Weight slightly reduced "
            f"(consistency={consistency:.2f}, "
            f"confidence={current_conf:.2f})"
        )
