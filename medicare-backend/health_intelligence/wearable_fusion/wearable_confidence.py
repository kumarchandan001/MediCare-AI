"""
health_intelligence/wearable_fusion/wearable_confidence.py
───────────────────────────────────────────────
Dynamic signal confidence scoring for individual
wearable modalities.

Handles:
  - missing streams → confidence = 0
  - delayed syncs → decayed confidence
  - noisy signals → reduced confidence
  - corrupted values → rejected with fallback
  - stale data → time-decayed confidence

Each signal gets a reliability score ∈ [0, 1] that
downstream modules use for weighted fusion.
"""

import logging
import math
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Optional

log = logging.getLogger(__name__)

# Physiological plausibility bounds
PLAUSIBLE_RANGES: dict[str, tuple[float, float]] = {
    "heart_rate_bpm": (30, 220),
    "spo2_percent": (70, 100),
    "sleep_hours": (0, 24),
    "steps": (0, 100_000),
    "stress_level": (0, 100),
    "active_minutes": (0, 1440),
    "calories_burned": (0, 10_000),
    "hrv_ms": (5, 300),
    "respiratory_rate": (5, 60),
    "temperature_celsius": (34, 42),
    "systolic_bp": (60, 250),
    "diastolic_bp": (30, 160),
    "blood_glucose": (30, 600),
}

# Expected update frequency per modality (seconds)
EXPECTED_FREQUENCY: dict[str, float] = {
    "heart_rate_bpm": 60,
    "spo2_percent": 300,
    "stress_level": 300,
    "steps": 300,
    "sleep_hours": 3600,
    "active_minutes": 300,
    "hrv_ms": 300,
    "respiratory_rate": 600,
}


@dataclass
class SignalConfidence:
    """Confidence assessment for a single signal."""
    signal_name: str
    value: Optional[float]
    confidence: float        # 0.0–1.0
    is_plausible: bool
    is_stale: bool
    staleness_seconds: float
    rejection_reason: Optional[str] = None


class WearableConfidenceScorer:
    """
    Scores the reliability of each wearable signal based
    on plausibility, freshness, noise, and availability.
    """

    def __init__(self, freshness_half_life: float = 600.0):
        self._half_life = freshness_half_life  # seconds

    def score_signal(
        self,
        signal_name: str,
        value: Optional[Any],
        timestamp: Optional[datetime] = None,
        noise_estimate: float = 0.0,
    ) -> SignalConfidence:
        """
        Score a single signal's confidence.

        Args:
            signal_name: Metric name (e.g. 'heart_rate_bpm')
            value: The raw value (None = missing)
            timestamp: When the value was recorded
            noise_estimate: 0.0–1.0 noise level estimate

        Returns:
            SignalConfidence with reliability score
        """
        # Missing signal
        if value is None:
            return SignalConfidence(
                signal_name=signal_name,
                value=None,
                confidence=0.0,
                is_plausible=False,
                is_stale=True,
                staleness_seconds=float("inf"),
                rejection_reason="missing_signal",
            )

        # Plausibility check
        bounds = PLAUSIBLE_RANGES.get(signal_name)
        is_plausible = True
        if bounds:
            low, high = bounds
            if not (low <= float(value) <= high):
                return SignalConfidence(
                    signal_name=signal_name,
                    value=float(value),
                    confidence=0.0,
                    is_plausible=False,
                    is_stale=False,
                    staleness_seconds=0,
                    rejection_reason=(
                        f"out_of_range: {value} not in [{low}, {high}]"
                    ),
                )

        # Freshness
        staleness = 0.0
        is_stale = False
        freshness_factor = 1.0

        if timestamp:
            now = datetime.utcnow()
            if timestamp.tzinfo:
                from datetime import timezone
                now = datetime.now(timezone.utc)
            age = (now - timestamp).total_seconds()
            staleness = max(0, age)

            expected = EXPECTED_FREQUENCY.get(signal_name, 300)
            is_stale = staleness > expected * 3

            # Exponential decay
            decay = math.log(2) / self._half_life
            freshness_factor = math.exp(-decay * staleness)

        # Noise penalty
        noise_penalty = max(0, 1.0 - noise_estimate)

        # Composite confidence
        confidence = freshness_factor * noise_penalty
        if is_stale:
            confidence *= 0.5

        return SignalConfidence(
            signal_name=signal_name,
            value=float(value),
            confidence=round(min(max(confidence, 0), 1.0), 4),
            is_plausible=is_plausible,
            is_stale=is_stale,
            staleness_seconds=round(staleness, 1),
        )

    def score_all_signals(
        self,
        signals: dict[str, Any],
        timestamps: Optional[dict[str, datetime]] = None,
        noise_estimates: Optional[dict[str, float]] = None,
    ) -> dict[str, SignalConfidence]:
        """
        Score confidence for all signals in a batch.
        """
        timestamps = timestamps or {}
        noise_estimates = noise_estimates or {}
        results: dict[str, SignalConfidence] = {}

        for name, value in signals.items():
            results[name] = self.score_signal(
                signal_name=name,
                value=value,
                timestamp=timestamps.get(name),
                noise_estimate=noise_estimates.get(name, 0.0),
            )

        return results

    def get_overall_confidence(
        self,
        scored: dict[str, SignalConfidence],
    ) -> float:
        """
        Compute overall wearable confidence from
        individual signal scores.
        """
        if not scored:
            return 0.0

        valid = [
            s.confidence for s in scored.values()
            if s.confidence > 0
        ]
        if not valid:
            return 0.0

        # Geometric-ish mean: penalizes having low-confidence signals
        return sum(valid) / len(scored)

    def get_available_modalities(
        self,
        scored: dict[str, SignalConfidence],
        min_confidence: float = 0.1,
    ) -> list[str]:
        """Return signal names with confidence above threshold."""
        return [
            name for name, sc in scored.items()
            if sc.confidence >= min_confidence
        ]

    def get_reliability_report(
        self,
        scored: dict[str, SignalConfidence],
    ) -> dict:
        """Generate a human-readable reliability report."""
        return {
            "overall_confidence": round(
                self.get_overall_confidence(scored), 3,
            ),
            "total_signals": len(scored),
            "available_signals": len(
                self.get_available_modalities(scored),
            ),
            "missing_signals": [
                name for name, sc in scored.items()
                if sc.rejection_reason == "missing_signal"
            ],
            "rejected_signals": [
                {
                    "signal": name,
                    "reason": sc.rejection_reason,
                    "value": sc.value,
                }
                for name, sc in scored.items()
                if sc.rejection_reason
                and sc.rejection_reason != "missing_signal"
            ],
            "stale_signals": [
                name for name, sc in scored.items()
                if sc.is_stale and sc.confidence > 0
            ],
            "signal_details": {
                name: {
                    "confidence": sc.confidence,
                    "plausible": sc.is_plausible,
                    "stale": sc.is_stale,
                }
                for name, sc in scored.items()
            },
        }
