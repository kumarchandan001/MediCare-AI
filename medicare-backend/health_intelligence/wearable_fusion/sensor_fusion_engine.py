"""
health_intelligence/wearable_fusion/sensor_fusion_engine.py
───────────────────────────────────────────────
Multi-modal sensor fusion — combines multiple physiological
signals into a unified health understanding.

Key insight:
  High HR alone → possibly normal
  High HR + low sleep + high stress → fatigue/stress risk

Features:
  - Confidence-weighted signal fusion
  - Missing sensor graceful degradation
  - Reliability-aware composite scoring
  - Multi-signal risk amplification
  - Explainable fusion outputs
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from health_intelligence.wearable_fusion.wearable_confidence import (
    WearableConfidenceScorer, SignalConfidence,
)
from health_intelligence.wearable_fusion.biometric_alignment import (
    BiometricAligner, AlignedSnapshot,
)

log = logging.getLogger(__name__)

# Weights for each modality in composite fusion
MODALITY_WEIGHTS: dict[str, float] = {
    "heart_rate_bpm": 0.20,
    "spo2_percent": 0.15,
    "stress_level": 0.15,
    "sleep_hours": 0.15,
    "steps": 0.10,
    "active_minutes": 0.10,
    "hrv_ms": 0.10,
    "calories_burned": 0.05,
}

# Reference population ranges (mean, std)
POPULATION_NORMS: dict[str, tuple[float, float]] = {
    "heart_rate_bpm": (72, 12),
    "spo2_percent": (97, 1.5),
    "stress_level": (40, 15),
    "sleep_hours": (7.5, 1.0),
    "steps": (7000, 3000),
    "active_minutes": (45, 20),
    "hrv_ms": (50, 20),
    "calories_burned": (2200, 500),
}


@dataclass
class FusionResult:
    """Result of multi-modal sensor fusion."""
    composite_score: float          # 0–100: fused health score
    confidence: float               # 0–1: fusion reliability
    signal_contributions: dict[str, dict]
    risk_amplification: float       # multiplier for combined risks
    available_modalities: int
    total_modalities: int
    alerts: list[dict]
    explanation: list[str]
    fused_at: str


class SensorFusionEngine:
    """
    Fuses multiple wearable modalities into a unified
    real-time health assessment with confidence weighting.
    """

    def __init__(self):
        self._confidence_scorer = WearableConfidenceScorer()
        self._aligner = BiometricAligner()

    def fuse(
        self,
        signals: dict[str, Any],
        timestamps: Optional[dict[str, datetime]] = None,
        personal_baselines: Optional[dict[str, float]] = None,
    ) -> FusionResult:
        """
        Fuse all available signals into a composite assessment.

        Args:
            signals: Raw signal values
            timestamps: Per-signal recording times
            personal_baselines: User's personal baseline values

        Returns:
            FusionResult with composite score and explanations
        """
        baselines = personal_baselines or {}

        # 1. Score confidence for each signal
        scored = self._confidence_scorer.score_all_signals(
            signals, timestamps or {},
        )

        # 2. Align signals
        self._aligner.update_batch(
            {k: v for k, v in signals.items() if v is not None},
        )
        snapshot = self._aligner.get_aligned_snapshot()

        # 3. Compute per-signal deviation scores
        contributions: dict[str, dict] = {}
        weighted_sum = 0.0
        total_weight = 0.0
        alerts: list[dict] = []
        explanations: list[str] = []

        for name, weight in MODALITY_WEIGHTS.items():
            value = snapshot.values.get(name)
            conf = scored.get(name)

            if value is None or conf is None or conf.confidence < 0.1:
                contributions[name] = {
                    "status": "unavailable",
                    "confidence": 0.0,
                }
                continue

            # Deviation from baseline or population norm
            ref_mean, ref_std = POPULATION_NORMS.get(
                name, (value, 1.0),
            )
            if name in baselines:
                ref_mean = baselines[name]

            deviation = abs(value - ref_mean) / ref_std if ref_std > 0 else 0

            # Convert deviation to a 0–100 score (higher = healthier)
            signal_score = max(0, 100 - deviation * 20)

            # Apply confidence weighting
            effective_weight = weight * conf.confidence
            weighted_sum += signal_score * effective_weight
            total_weight += effective_weight

            contributions[name] = {
                "value": round(value, 2),
                "score": round(signal_score, 1),
                "confidence": round(conf.confidence, 3),
                "deviation": round(deviation, 2),
                "status": (
                    "good" if deviation < 1.5 else
                    "concern" if deviation < 2.5 else
                    "alert"
                ),
                "effective_weight": round(effective_weight, 4),
            }

            # Generate alerts for high deviations
            if deviation > 2.0 and conf.confidence > 0.5:
                display = name.replace("_", " ").title()
                alerts.append({
                    "signal": name,
                    "severity": "high" if deviation > 3 else "moderate",
                    "message": (
                        f"{display} ({value:.1f}) deviates significantly "
                        f"from baseline ({ref_mean:.1f})"
                    ),
                    "deviation": round(deviation, 2),
                    "confidence": round(conf.confidence, 3),
                })

        # 4. Composite score
        composite = weighted_sum / total_weight if total_weight > 0 else 50.0

        # 5. Risk amplification: multiple concerning signals compound
        concerning = [
            c for c in contributions.values()
            if c.get("status") in ("concern", "alert")
        ]
        risk_amp = 1.0
        if len(concerning) >= 3:
            risk_amp = 1.3
            explanations.append(
                "Multiple physiological signals are concerning — "
                "combined risk is amplified."
            )
        elif len(concerning) >= 2:
            risk_amp = 1.15

        # Check specific dangerous combinations
        hr_concern = contributions.get("heart_rate_bpm", {}).get("status") in ("concern", "alert")
        sleep_concern = contributions.get("sleep_hours", {}).get("status") in ("concern", "alert")
        stress_concern = contributions.get("stress_level", {}).get("status") in ("concern", "alert")

        if hr_concern and stress_concern and sleep_concern:
            risk_amp = max(risk_amp, 1.4)
            explanations.append(
                "Elevated HR + high stress + poor sleep is a "
                "high-risk combination indicating fatigue/stress overload."
            )
        elif stress_concern and sleep_concern:
            risk_amp = max(risk_amp, 1.25)
            explanations.append(
                "High stress combined with poor sleep increases "
                "illness susceptibility."
            )

        # Apply amplification (lower score = worse)
        if risk_amp > 1.0:
            composite = max(0, composite - (risk_amp - 1.0) * 30)

        available = len([
            c for c in contributions.values()
            if c.get("status") != "unavailable"
        ])
        overall_conf = self._confidence_scorer.get_overall_confidence(scored)

        if available < 3:
            explanations.append(
                f"Only {available} modalities available — "
                "fusion reliability is limited."
            )

        return FusionResult(
            composite_score=round(composite, 1),
            confidence=round(overall_conf, 3),
            signal_contributions=contributions,
            risk_amplification=round(risk_amp, 2),
            available_modalities=available,
            total_modalities=len(MODALITY_WEIGHTS),
            alerts=alerts,
            explanation=explanations,
            fused_at=datetime.utcnow().isoformat(),
        )

    def get_aligner(self) -> BiometricAligner:
        """Access the underlying aligner for direct updates."""
        return self._aligner
