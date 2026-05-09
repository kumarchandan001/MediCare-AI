"""
health_intelligence/reasoning/multi_signal_reasoner.py
───────────────────────────────────────────────
Combines causal graph reasoning with live sensor
fusion data to build a holistic health interpretation.

Integrates:
  - Causal reasoning (why)
  - Sensor fusion (what)
  - Context reasoning (when/where)
  - Trend analysis (trajectory)

Produces a unified reasoning report.
"""

import logging
from datetime import datetime
from typing import Any, Optional

from health_intelligence.reasoning.causal_reasoning_engine import (
    CausalReasoningEngine, CausalAnalysis,
)

log = logging.getLogger(__name__)


class MultiSignalReasoner:
    """
    Combines causal, contextual, and trend reasoning
    into a unified health interpretation.
    """

    def __init__(self):
        self._causal = CausalReasoningEngine()

    def reason(
        self,
        user_id: int,
        current_signals: dict[str, float],
        baselines: Optional[dict[str, float]] = None,
        trend_direction: str = "stable",
        recovery_state: Optional[str] = None,
        circadian_phase: str = "unknown",
        physiological_state: str = "unknown",
        fusion_confidence: float = 0.5,
    ) -> dict:
        """
        Produce unified multi-signal reasoning report.
        """
        # 1. Causal analysis
        causal = self._causal.analyze(
            user_id, current_signals, baselines,
        )

        # 2. Build contextual modifiers
        context_modifiers = self._assess_context(
            trend_direction, recovery_state,
            circadian_phase, physiological_state,
        )

        # 3. Compute combined reasoning confidence
        causal_conf = causal.overall_causal_confidence
        combined = (
            causal_conf * 0.5
            + fusion_confidence * 0.3
            + context_modifiers["context_confidence"] * 0.2
        )

        # 4. Identify intervention priorities
        priorities = self._identify_priorities(
            causal, trend_direction, recovery_state,
        )

        # 5. Generate reasoning narrative
        narrative = self._build_narrative(
            causal, context_modifiers, priorities,
        )

        return {
            "user_id": user_id,
            "causal_analysis": {
                "deviations": causal.observed_deviations,
                "primary_hypothesis": (
                    {
                        "root_cause": causal.primary_hypothesis.root_cause,
                        "confidence": causal.primary_hypothesis.confidence,
                        "mechanism": causal.primary_hypothesis.mechanism_explanation,
                        "uncertainty": causal.primary_hypothesis.uncertainty,
                        "competing_count": causal.primary_hypothesis.competing_count,
                    }
                    if causal.primary_hypothesis else None
                ),
                "competing_hypotheses": [
                    {
                        "root_cause": h.root_cause,
                        "confidence": h.confidence,
                        "mechanism": h.mechanism_explanation,
                    }
                    for h in causal.competing_hypotheses[:3]
                ],
                "feedback_loops": causal.feedback_loops_active,
                "causal_confidence": causal.overall_causal_confidence,
                "causal_uncertainty": causal.overall_uncertainty,
            },
            "context": context_modifiers,
            "intervention_priorities": priorities,
            "combined_confidence": round(combined, 3),
            "narrative": narrative,
            "reasoning_disclaimer": (
                "This analysis identifies potential wellness patterns "
                "and is not a medical diagnosis. Consult a healthcare "
                "professional for clinical concerns."
            ),
            "reasoned_at": datetime.utcnow().isoformat(),
        }

    @property
    def causal_engine(self) -> CausalReasoningEngine:
        return self._causal

    # ── Internal ─────────────────────────────────────────────

    @staticmethod
    def _assess_context(
        trend: str,
        recovery: Optional[str],
        circadian: str,
        physio_state: str,
    ) -> dict:
        """Assess contextual factors that modify reasoning."""
        concern_score = 0.0
        notes: list[str] = []

        if trend == "declining":
            concern_score += 0.3
            notes.append("Overall health trend is declining.")
        elif trend == "improving":
            concern_score -= 0.15
            notes.append("Positive overall trend observed.")

        if recovery == "declining":
            concern_score += 0.2
            notes.append("Recovery capacity is weakening.")

        if circadian in ("late_night", "early_morning"):
            notes.append(
                f"Circadian phase ({circadian}) may affect readings."
            )

        if physio_state in ("stressed", "fatigued", "abnormal"):
            concern_score += 0.2
            notes.append(f"Currently in {physio_state} state.")

        # Context confidence: how much context info we have
        known_count = sum(1 for x in [trend, recovery, circadian, physio_state]
                          if x and x != "unknown")
        context_confidence = min(1.0, known_count * 0.25)

        return {
            "concern_modifier": round(max(0, min(1, concern_score)), 3),
            "context_confidence": round(context_confidence, 3),
            "context_notes": notes,
            "trend": trend,
            "recovery_state": recovery,
            "circadian_phase": circadian,
            "physiological_state": physio_state,
        }

    @staticmethod
    def _identify_priorities(
        causal: CausalAnalysis,
        trend: str,
        recovery: Optional[str],
    ) -> list[dict]:
        """Identify what should be addressed first."""
        priorities: list[dict] = []

        if causal.primary_hypothesis:
            h = causal.primary_hypothesis
            urgency = "high" if h.confidence > 0.6 else "moderate"
            if trend == "declining":
                urgency = "high"

            priorities.append({
                "factor": h.root_cause,
                "urgency": urgency,
                "confidence": h.confidence,
                "reason": h.mechanism_explanation,
            })

        # Check for feedback loops (self-reinforcing problems)
        for loop in causal.feedback_loops_active:
            priorities.append({
                "factor": " ↔ ".join(loop),
                "urgency": "high",
                "confidence": 0.7,
                "reason": "Active feedback loop — both factors reinforcing each other.",
            })

        # Recovery state
        if recovery == "declining":
            priorities.append({
                "factor": "recovery_quality",
                "urgency": "moderate",
                "confidence": 0.6,
                "reason": "Recovery capacity is weakening; proactive support needed.",
            })

        priorities.sort(
            key=lambda p: {"high": 3, "moderate": 2, "low": 1}.get(
                p["urgency"], 0,
            ),
            reverse=True,
        )
        return priorities[:5]

    @staticmethod
    def _build_narrative(
        causal: CausalAnalysis,
        context: dict,
        priorities: list[dict],
    ) -> str:
        """Build a human-readable reasoning narrative."""
        parts: list[str] = []

        parts.append(causal.explanation_summary)

        for note in context.get("context_notes", []):
            parts.append(note)

        if priorities:
            top = priorities[0]
            display = top["factor"].replace("_", " ")
            parts.append(
                f"Priority focus area: {display} "
                f"({top['urgency']} urgency)."
            )

        if causal.overall_uncertainty > 0.6:
            parts.append(
                "Note: Causal confidence is limited; "
                "additional data may refine this analysis."
            )

        return " ".join(parts)
