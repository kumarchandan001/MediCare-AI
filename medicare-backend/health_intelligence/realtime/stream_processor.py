"""
health_intelligence/realtime/stream_processor.py
───────────────────────────────────────────────
Continuous signal ingestion engine — processes incoming
wearable data with edge reliability handling.

Handles:
  - Heart rate streams
  - SpO2 updates
  - Activity changes
  - Sleep state transitions
  - Stress fluctuations
  - Recovery signals

Edge reliability:
  - Validates incoming values
  - Handles missing/delayed streams
  - Rejects corrupted data
  - Tracks signal health per user
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from health_intelligence.wearable_fusion.wearable_confidence import (
    WearableConfidenceScorer, SignalConfidence, PLAUSIBLE_RANGES,
)
from health_intelligence.wearable_fusion.biometric_alignment import (
    BiometricAligner,
)
from health_intelligence.adaptation.adaptive_learning import (
    AdaptiveLearningEngine,
)
from health_intelligence.streaming.privacy_layer import PrivacyLayer

log = logging.getLogger(__name__)


@dataclass
class ProcessedSignal:
    """Result of processing a single incoming signal."""
    name: str
    raw_value: Any
    clean_value: Optional[float]
    accepted: bool
    confidence: float
    rejection_reason: Optional[str] = None
    timestamp: Optional[datetime] = None


@dataclass
class UserStreamState:
    """Per-user streaming state tracker."""
    user_id: int
    aligner: BiometricAligner = field(default_factory=BiometricAligner)
    total_accepted: int = 0
    total_rejected: int = 0
    last_ingestion: Optional[datetime] = None
    signal_health: dict[str, float] = field(default_factory=dict)


class StreamProcessor:
    """
    Processes continuous wearable signal streams with
    validation, confidence scoring, and edge reliability.
    """

    def __init__(self):
        self._confidence = WearableConfidenceScorer()
        self._learner = AdaptiveLearningEngine()
        self._privacy = PrivacyLayer()
        self._user_states: dict[int, UserStreamState] = {}

    def _ensure_state(self, user_id: int) -> UserStreamState:
        if user_id not in self._user_states:
            self._user_states[user_id] = UserStreamState(user_id=user_id)
        return self._user_states[user_id]

    # ── Single signal processing ─────────────────────────────

    def process_signal(
        self,
        user_id: int,
        signal_name: str,
        raw_value: Any,
        timestamp: Optional[datetime] = None,
    ) -> ProcessedSignal:
        """
        Process a single incoming signal with validation.
        """
        ts = timestamp or datetime.utcnow()
        state = self._ensure_state(user_id)

        # Null check
        if raw_value is None:
            return ProcessedSignal(
                name=signal_name,
                raw_value=None,
                clean_value=None,
                accepted=False,
                confidence=0.0,
                rejection_reason="null_value",
                timestamp=ts,
            )

        # Type coercion
        try:
            value = float(raw_value)
        except (ValueError, TypeError):
            state.total_rejected += 1
            return ProcessedSignal(
                name=signal_name,
                raw_value=raw_value,
                clean_value=None,
                accepted=False,
                confidence=0.0,
                rejection_reason=f"invalid_type: {type(raw_value).__name__}",
                timestamp=ts,
            )

        # Plausibility check
        bounds = PLAUSIBLE_RANGES.get(signal_name)
        if bounds:
            low, high = bounds
            if not (low <= value <= high):
                state.total_rejected += 1
                return ProcessedSignal(
                    name=signal_name,
                    raw_value=raw_value,
                    clean_value=None,
                    accepted=False,
                    confidence=0.0,
                    rejection_reason=(
                        f"out_of_range: {value} not in [{low}, {high}]"
                    ),
                    timestamp=ts,
                )

        # Confidence scoring
        sc = self._confidence.score_signal(signal_name, value, ts)

        # Update aligner
        state.aligner.update_signal(signal_name, value, ts)

        # Update adaptive learner
        self._learner.update(user_id, signal_name, value, ts)

        # Track signal health
        state.signal_health[signal_name] = sc.confidence
        state.total_accepted += 1
        state.last_ingestion = ts

        return ProcessedSignal(
            name=signal_name,
            raw_value=raw_value,
            clean_value=value,
            accepted=True,
            confidence=sc.confidence,
            timestamp=ts,
        )

    # ── Batch processing ─────────────────────────────────────

    def process_batch(
        self,
        user_id: int,
        signals: dict[str, Any],
        timestamp: Optional[datetime] = None,
    ) -> dict[str, ProcessedSignal]:
        """
        Process a batch of signals from a wearable sync.
        """
        results: dict[str, ProcessedSignal] = {}
        for name, value in signals.items():
            results[name] = self.process_signal(
                user_id, name, value, timestamp,
            )
        return results

    # ── State queries ────────────────────────────────────────

    def get_aligned_snapshot(self, user_id: int):
        """Get the latest aligned snapshot for a user."""
        state = self._ensure_state(user_id)
        return state.aligner.get_aligned_snapshot()

    def get_stream_health(self, user_id: int) -> dict:
        """Get the health status of a user's data streams."""
        state = self._user_states.get(user_id)
        if not state:
            return {
                "status": "no_data",
                "message": "No streaming data received yet.",
            }

        total = state.total_accepted + state.total_rejected
        accept_rate = (
            state.total_accepted / total if total > 0 else 0
        )

        missing = state.aligner.get_missing_signals()
        freshness = state.aligner.get_signal_freshness()

        return {
            "status": "active" if state.last_ingestion else "idle",
            "total_processed": total,
            "acceptance_rate": round(accept_rate, 3),
            "signal_health": state.signal_health,
            "missing_signals": missing,
            "signal_freshness": freshness,
            "last_ingestion": (
                state.last_ingestion.isoformat()
                if state.last_ingestion else None
            ),
        }

    def get_learner(self) -> AdaptiveLearningEngine:
        """Access the adaptive learning engine."""
        return self._learner
