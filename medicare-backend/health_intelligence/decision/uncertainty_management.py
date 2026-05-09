"""
health_intelligence/decision/uncertainty_management.py
───────────────────────────────────────────────
Tracks and manages uncertainty across all intelligence
subsystems to prevent overconfident recommendations.

Tracks:
  - Signal reliability
  - Prediction confidence
  - Causal uncertainty
  - Intervention confidence
  - Data completeness
  - Model disagreement

Ensures the system never presents uncertain
conclusions as definitive facts.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class UncertaintyProfile:
    """Uncertainty profile for a user's health intelligence."""
    user_id: int
    signal_reliability: float         # 0–1
    prediction_confidence: float      # 0–1
    causal_confidence: float          # 0–1
    intervention_confidence: float    # 0–1
    data_completeness: float          # 0–1
    overall_confidence: float         # 0–1
    overall_uncertainty: float        # 0–1
    recommendations: list[str]
    assessed_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class UncertaintyManager:
    """
    Aggregates uncertainty from all subsystems and
    gates recommendations based on confidence levels.
    """

    # Minimum confidence to allow autonomous recommendations
    MIN_RECOMMENDATION_CONFIDENCE = 0.3
    # Below this, suggest professional consultation
    ESCALATION_THRESHOLD = 0.2

    def assess_uncertainty(
        self,
        user_id: int,
        signal_reliability: float = 0.5,
        prediction_confidence: float = 0.5,
        causal_confidence: float = 0.5,
        intervention_confidence: float = 0.5,
        data_completeness: float = 0.5,
    ) -> UncertaintyProfile:
        """
        Assess overall uncertainty across all dimensions.
        """
        # Weighted overall confidence
        overall = (
            signal_reliability * 0.25
            + prediction_confidence * 0.2
            + causal_confidence * 0.2
            + intervention_confidence * 0.15
            + data_completeness * 0.2
        )

        uncertainty = 1.0 - overall

        # Generate recommendations
        recs: list[str] = []

        if signal_reliability < 0.3:
            recs.append(
                "Wearable data quality is low — ensure device "
                "is worn correctly and synced recently."
            )

        if data_completeness < 0.3:
            recs.append(
                "Limited data available — recommendations will "
                "improve with more consistent tracking."
            )

        if prediction_confidence < 0.3:
            recs.append(
                "Forecast confidence is limited — treat projections "
                "as directional estimates only."
            )

        if causal_confidence < 0.3:
            recs.append(
                "Causal analysis has competing hypotheses — "
                "root causes are uncertain."
            )

        if overall < self.ESCALATION_THRESHOLD:
            recs.append(
                "Overall confidence is very low — consider "
                "consulting a healthcare professional for guidance."
            )

        return UncertaintyProfile(
            user_id=user_id,
            signal_reliability=round(signal_reliability, 3),
            prediction_confidence=round(prediction_confidence, 3),
            causal_confidence=round(causal_confidence, 3),
            intervention_confidence=round(intervention_confidence, 3),
            data_completeness=round(data_completeness, 3),
            overall_confidence=round(overall, 3),
            overall_uncertainty=round(uncertainty, 3),
            recommendations=recs,
        )

    def should_recommend(self, confidence: float) -> bool:
        """Check if confidence is sufficient for recommendations."""
        return confidence >= self.MIN_RECOMMENDATION_CONFIDENCE

    def should_escalate(self, confidence: float) -> bool:
        """Check if uncertainty is high enough to suggest professional help."""
        return confidence < self.ESCALATION_THRESHOLD

    def gate_recommendations(
        self,
        recommendations: list[dict],
        overall_confidence: float,
    ) -> list[dict]:
        """
        Filter recommendations based on confidence.
        Low-confidence recommendations get downgraded
        or annotated with uncertainty warnings.
        """
        if not self.should_recommend(overall_confidence):
            return [{
                "type": "uncertainty_notice",
                "message": (
                    "Current data confidence is too low for specific "
                    "recommendations. Continue tracking for better insights."
                ),
                "confidence": overall_confidence,
            }]

        # Annotate each recommendation with confidence
        gated: list[dict] = []
        for rec in recommendations:
            rec_conf = rec.get("confidence", overall_confidence)

            if rec_conf < 0.3:
                rec["confidence_note"] = (
                    "Low confidence — this is a tentative suggestion."
                )
                rec["priority"] = "low"
            elif rec_conf < 0.5:
                rec["confidence_note"] = (
                    "Moderate confidence — consider alongside personal judgment."
                )

            gated.append(rec)

        return gated
