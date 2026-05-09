"""
health_intelligence/reasoning/causal_reasoning_engine.py
───────────────────────────────────────────────
Traverses the health factor graph using live telemetry
to explain WHY deterioration is occurring.

Key capabilities:
  - Root cause identification
  - Competing hypothesis generation
  - Causal confidence scoring
  - Evidence weighting
  - Multi-pathway analysis
  - Causal uncertainty quantification

Every causal explanation includes:
  - confidence score
  - evidence strength
  - competing hypotheses
  - uncertainty bounds

Avoids presenting causal chains as absolute truth.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from health_intelligence.reasoning.health_factor_graph import (
    HealthFactorGraph, CausalEdge,
)

log = logging.getLogger(__name__)

# Map observable signals to factor graph nodes
SIGNAL_TO_FACTOR = {
    "sleep_hours": "sleep_quality",
    "sleep_quality": "sleep_quality",
    "stress_level": "stress_level",
    "heart_rate_bpm": "resting_hr",
    "hrv_ms": "hrv_quality",
    "steps": "physical_activity",
    "active_minutes": "physical_activity",
    "spo2_percent": "immune_readiness",
}

# Deviation thresholds for "concerning" signals
DEVIATION_THRESHOLDS = {
    "sleep_quality": {"direction": "low", "threshold": 6.0},
    "stress_level": {"direction": "high", "threshold": 55},
    "resting_hr": {"direction": "high", "threshold": 85},
    "hrv_quality": {"direction": "low", "threshold": 30},
    "physical_activity": {"direction": "low", "threshold": 3000},
}


@dataclass
class CausalHypothesis:
    """A single causal hypothesis explaining an observation."""
    root_cause: str
    observed_effect: str
    causal_chain: list[dict]
    confidence: float
    evidence_strength: float
    uncertainty: float
    mechanism_explanation: str
    competing_count: int = 0


@dataclass
class CausalAnalysis:
    """Full causal analysis result."""
    user_id: int
    observed_deviations: list[dict]
    primary_hypothesis: Optional[CausalHypothesis]
    competing_hypotheses: list[CausalHypothesis]
    feedback_loops_active: list[list[str]]
    overall_causal_confidence: float
    overall_uncertainty: float
    explanation_summary: str
    analyzed_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class CausalReasoningEngine:
    """
    Traverses the health factor graph to generate
    explainable causal hypotheses for observed changes.
    """

    def __init__(self, graph: Optional[HealthFactorGraph] = None):
        self._graph = graph or HealthFactorGraph()

    def analyze(
        self,
        user_id: int,
        current_signals: dict[str, float],
        baselines: Optional[dict[str, float]] = None,
    ) -> CausalAnalysis:
        """
        Perform full causal analysis on current signals.

        Returns:
            CausalAnalysis with hypotheses, confidence, uncertainty.
        """
        baselines = baselines or {}

        # 1. Identify deviations
        deviations = self._identify_deviations(
            current_signals, baselines,
        )

        if not deviations:
            return CausalAnalysis(
                user_id=user_id,
                observed_deviations=[],
                primary_hypothesis=None,
                competing_hypotheses=[],
                feedback_loops_active=[],
                overall_causal_confidence=0.0,
                overall_uncertainty=1.0,
                explanation_summary="No significant deviations detected.",
            )

        # 2. For each deviation, find competing causes
        all_hypotheses: list[CausalHypothesis] = []

        for dev in deviations:
            factor = dev["factor"]
            hypotheses = self._generate_hypotheses(
                factor, current_signals, baselines,
            )
            all_hypotheses.extend(hypotheses)

        # 3. Rank hypotheses
        all_hypotheses.sort(key=lambda h: h.confidence, reverse=True)

        primary = all_hypotheses[0] if all_hypotheses else None
        competing = all_hypotheses[1:6] if len(all_hypotheses) > 1 else []

        # Tag competing count
        if primary:
            primary.competing_count = len(competing)

        # 4. Check for active feedback loops
        active_loops = self._detect_active_loops(
            current_signals, baselines,
        )

        # 5. Compute overall confidence
        if primary:
            overall_conf = primary.confidence * 0.7 + (
                primary.evidence_strength * 0.3
            )
            overall_unc = 1.0 - overall_conf
        else:
            overall_conf = 0.0
            overall_unc = 1.0

        # If many competing hypotheses, reduce confidence
        if len(competing) >= 3:
            overall_conf *= 0.8
            overall_unc = 1.0 - overall_conf

        # 6. Generate summary
        summary = self._generate_summary(
            deviations, primary, competing, active_loops,
        )

        return CausalAnalysis(
            user_id=user_id,
            observed_deviations=deviations,
            primary_hypothesis=primary,
            competing_hypotheses=competing,
            feedback_loops_active=active_loops,
            overall_causal_confidence=round(overall_conf, 3),
            overall_uncertainty=round(overall_unc, 3),
            explanation_summary=summary,
        )

    def explain_factor(
        self,
        factor: str,
        current_signals: dict[str, float],
        baselines: Optional[dict[str, float]] = None,
    ) -> dict:
        """
        Explain a single factor's current state
        through causal reasoning.
        """
        causes = self._graph.get_competing_causes(factor)
        chain = self._graph.get_causal_chain(factor)

        upstream_evidence: list[dict] = []
        for c in causes:
            # Check if the upstream cause is actually deviant
            cause_factor = c["cause"]
            is_deviant = self._is_factor_deviant(
                cause_factor, current_signals, baselines or {},
            )
            upstream_evidence.append({
                **c,
                "currently_deviant": is_deviant,
                "relevance": "active" if is_deviant else "inactive",
            })

        active_causes = [
            u for u in upstream_evidence if u["currently_deviant"]
        ]

        return {
            "factor": factor,
            "possible_causes": upstream_evidence,
            "active_causes": active_causes,
            "downstream_effects": [
                {
                    "effect": e.effect,
                    "weight": e.causal_weight,
                    "mechanism": e.mechanism,
                }
                for e in self._graph.get_effects_of(factor)
            ],
            "causal_chain": chain[:10],
            "confidence": round(
                min(0.9, len(active_causes) * 0.2 + 0.3), 3,
            ) if active_causes else 0.0,
        }

    @property
    def graph(self) -> HealthFactorGraph:
        return self._graph

    # ── Internal ─────────────────────────────────────────────

    def _identify_deviations(
        self,
        signals: dict[str, float],
        baselines: dict[str, float],
    ) -> list[dict]:
        """Identify which signals are deviating from normal."""
        deviations: list[dict] = []

        for signal_name, value in signals.items():
            factor = SIGNAL_TO_FACTOR.get(signal_name)
            if not factor:
                continue

            threshold_info = DEVIATION_THRESHOLDS.get(factor)
            if not threshold_info:
                continue

            direction = threshold_info["direction"]
            threshold = threshold_info["threshold"]

            # Check against baseline if available
            baseline = baselines.get(signal_name)
            if baseline:
                pct_change = abs(value - baseline) / baseline * 100
                is_deviant = pct_change > 15
            else:
                if direction == "high":
                    is_deviant = value > threshold
                else:
                    is_deviant = value < threshold

            if is_deviant:
                deviations.append({
                    "signal": signal_name,
                    "factor": factor,
                    "value": value,
                    "baseline": baseline,
                    "threshold": threshold,
                    "direction": direction,
                    "severity": self._compute_severity(
                        value, threshold, direction, baseline,
                    ),
                })

        return deviations

    def _generate_hypotheses(
        self,
        effect_factor: str,
        signals: dict[str, float],
        baselines: dict[str, float],
    ) -> list[CausalHypothesis]:
        """Generate competing causal hypotheses for an effect."""
        competing = self._graph.get_competing_causes(effect_factor)
        hypotheses: list[CausalHypothesis] = []

        for cause_info in competing:
            cause = cause_info["cause"]

            # Check if upstream cause is deviant
            is_active = self._is_factor_deviant(
                cause, signals, baselines,
            )

            # Trace full chain
            chain = self._graph.get_causal_chain(cause, max_depth=4)

            # Confidence: high if cause is actually deviant
            if is_active:
                confidence = min(
                    0.85,
                    cause_info["causal_weight"] * 0.5
                    + cause_info["evidence_level"] * 0.3
                    + 0.2,
                )
            else:
                confidence = cause_info["combined_score"] * 0.3

            uncertainty = 1.0 - confidence

            hypotheses.append(CausalHypothesis(
                root_cause=cause,
                observed_effect=effect_factor,
                causal_chain=chain[:6],
                confidence=round(confidence, 3),
                evidence_strength=cause_info["evidence_level"],
                uncertainty=round(uncertainty, 3),
                mechanism_explanation=cause_info["mechanism"],
            ))

        return hypotheses

    def _is_factor_deviant(
        self,
        factor: str,
        signals: dict[str, float],
        baselines: dict[str, float],
    ) -> bool:
        """Check if a factor is currently deviating."""
        # Reverse lookup: factor → signal
        for signal, mapped_factor in SIGNAL_TO_FACTOR.items():
            if mapped_factor == factor and signal in signals:
                threshold_info = DEVIATION_THRESHOLDS.get(factor)
                if not threshold_info:
                    return False
                value = signals[signal]
                if threshold_info["direction"] == "high":
                    return value > threshold_info["threshold"]
                else:
                    return value < threshold_info["threshold"]
        return False

    def _detect_active_loops(
        self,
        signals: dict[str, float],
        baselines: dict[str, float],
    ) -> list[list[str]]:
        """Detect feedback loops where both sides are deviant."""
        all_loops = self._graph.get_feedback_loops()
        active: list[list[str]] = []

        for loop in all_loops:
            both_active = all(
                self._is_factor_deviant(f, signals, baselines)
                for f in loop
            )
            if both_active:
                active.append(loop)

        return active

    @staticmethod
    def _compute_severity(
        value: float,
        threshold: float,
        direction: str,
        baseline: Optional[float],
    ) -> str:
        """Compute deviation severity."""
        if baseline:
            pct = abs(value - baseline) / baseline * 100
        else:
            pct = abs(value - threshold) / threshold * 100

        if pct > 30:
            return "high"
        elif pct > 15:
            return "moderate"
        return "low"

    @staticmethod
    def _generate_summary(
        deviations: list,
        primary: Optional[CausalHypothesis],
        competing: list[CausalHypothesis],
        loops: list,
    ) -> str:
        """Generate a human-readable causal summary."""
        parts: list[str] = []

        if not deviations:
            return "No significant deviations detected."

        parts.append(
            f"{len(deviations)} deviation(s) detected."
        )

        if primary:
            display = primary.root_cause.replace("_", " ")
            parts.append(
                f"Most likely root cause: {display} "
                f"(confidence: {primary.confidence:.0%}). "
                f"{primary.mechanism_explanation}."
            )

        if competing:
            parts.append(
                f"{len(competing)} competing hypothesis(es) "
                f"also considered."
            )

        if loops:
            loop_names = [
                " ↔ ".join(l) for l in loops
            ]
            parts.append(
                f"Active feedback loop(s): {', '.join(loop_names)}."
            )

        return " ".join(parts)
