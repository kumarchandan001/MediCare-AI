"""
health_intelligence/decision/autonomous_decision_engine.py
───────────────────────────────────────────────
Central brain that coordinates ALL Step 4 subsystems.

Orchestrates:
  - Causal reasoning (why)
  - Interventions (what to do)
  - Simulation (what will happen)
  - Coaching (how to communicate)
  - Optimization (long-term balance)
  - Deterioration (early warnings)
  - Uncertainty (confidence bounds)
  - Human oversight (safety)

Produces a unified, prioritized, safe decision summary.
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.intervention.intervention_engine import (
    InterventionEngine,
)
from health_intelligence.simulation.trajectory_simulator import (
    TrajectorySimulator,
)
from health_intelligence.coaching.health_coach_engine import (
    HealthCoachEngine,
)
from health_intelligence.optimization.lifestyle_optimizer import (
    LifestyleOptimizer,
)
from health_intelligence.deterioration.early_deterioration_detector import (
    EarlyDeteriorationDetector,
)
from health_intelligence.decision.uncertainty_management import (
    UncertaintyManager,
)
from health_intelligence.decision.human_oversight import (
    HumanOversightLayer,
)

log = logging.getLogger(__name__)


class AutonomousDecisionEngine:
    """
    Central autonomous decision engine coordinating
    all Step 4 subsystems into unified health intelligence.
    """

    def __init__(self):
        self._intervention = InterventionEngine()
        self._simulator = TrajectorySimulator()
        self._coach = HealthCoachEngine()
        self._optimizer = LifestyleOptimizer()
        self._deterioration = EarlyDeteriorationDetector()
        self._uncertainty = UncertaintyManager()
        self._oversight = HumanOversightLayer()

    def decide(
        self,
        user_id: int,
        current_signals: dict[str, float],
        baselines: Optional[dict[str, float]] = None,
        trend_direction: str = "stable",
        recovery_state: Optional[str] = None,
        circadian_phase: str = "unknown",
        physiological_state: str = "normal",
        fusion_confidence: float = 0.5,
        data_completeness: float = 0.5,
    ) -> dict:
        """
        Run the full autonomous decision pipeline.

        Returns:
            Comprehensive, prioritized, safety-gated decision summary.
        """
        # 1. Deterioration detection
        deterioration = self._deterioration.detect(
            user_id, current_signals,
        )

        # 2. Uncertainty assessment
        uncertainty = self._uncertainty.assess_uncertainty(
            user_id,
            signal_reliability=fusion_confidence,
            data_completeness=data_completeness,
        )

        # 3. Human oversight check
        oversight_context = {
            "deterioration_severity": deterioration.get("max_severity", 0),
            "overall_confidence": uncertainty.overall_confidence,
            "compound_risk": 0,
            "burnout_risk": current_signals.get("burnout_risk", 0),
            "physiological_state": physiological_state,
            "heart_rate_bpm": current_signals.get("heart_rate_bpm", 70),
            "spo2_percent": current_signals.get("spo2_percent", 98),
        }
        escalation = self._oversight.assess_escalation(oversight_context)

        # 4. Generate interventions (if safe to proceed)
        if escalation.system_action == "block":
            interventions = {"status": "blocked_by_oversight", "interventions": []}
        else:
            interventions = self._intervention.generate_interventions(
                user_id, current_signals, baselines,
                trend_direction, recovery_state,
                circadian_phase, physiological_state,
                fusion_confidence,
            )

        # 5. Trajectory simulation
        sim_values = {
            "stress_level": current_signals.get("stress_level", 40),
            "fatigue": current_signals.get("fatigue", 30),
            "recovery_score": current_signals.get("recovery_score", 70),
            "burnout_risk": current_signals.get("burnout_risk", 0.1),
            "wellness_score": current_signals.get("wellness_score", 65),
        }
        trajectory = self._simulator.simulate(
            user_id, sim_values, horizon_days=7,
        )

        # 6. Lifestyle optimization
        optimization = self._optimizer.optimize(
            user_id, current_signals, baselines,
            trend_direction, circadian_phase,
        )

        # 7. Coaching
        raw_interventions = interventions.get("interventions", [])
        coaching = self._coach.generate_coaching(
            user_id, raw_interventions,
            stress_level=current_signals.get("stress_level", 40),
            fatigue_level=current_signals.get("fatigue", 30),
            physiological_state=physiological_state,
            recovery_state=recovery_state,
            needs_escalation=escalation.should_escalate,
        )

        # 8. Apply uncertainty gating
        gated_interventions = self._uncertainty.gate_recommendations(
            raw_interventions,
            uncertainty.overall_confidence,
        )

        # 9. Apply oversight safeguards
        safe_interventions = self._oversight.apply_safeguards(
            gated_interventions, escalation,
        )

        # 10. Build prioritized decision summary
        return {
            "user_id": user_id,
            "decision_summary": self._build_summary(
                deterioration, escalation, interventions, trajectory,
            ),
            "escalation": {
                "should_escalate": escalation.should_escalate,
                "level": escalation.escalation_level,
                "reason": escalation.reason,
                "professional_recommendation": escalation.professional_recommendation,
                "system_action": escalation.system_action,
            },
            "causal_reasoning": {
                "summary": interventions.get("reasoning_summary", ""),
                "confidence": interventions.get("causal_confidence", 0),
                "root_causes": interventions.get("root_causes", []),
            },
            "interventions": safe_interventions,
            "coaching": coaching,
            "trajectory": {
                "direction": trajectory.overall_direction,
                "confidence": trajectory.confidence_at_horizon,
                "warnings": trajectory.warnings,
                "final_values": trajectory.final_values,
            },
            "deterioration": deterioration,
            "optimization": {
                "lifestyle_score": optimization.get("overall_lifestyle_score"),
                "top_recommendations": optimization.get("recommendations", [])[:3],
            },
            "uncertainty": {
                "overall_confidence": uncertainty.overall_confidence,
                "overall_uncertainty": uncertainty.overall_uncertainty,
                "recommendations": uncertainty.recommendations,
            },
            "disclaimer": (
                "This is an autonomous wellness intelligence summary, "
                "not a medical diagnosis. All recommendations are "
                "wellness-oriented and should not replace professional "
                "medical advice."
            ),
            "decided_at": datetime.utcnow().isoformat(),
        }

    # ── Convenience accessors ────────────────────────────────

    @property
    def intervention_engine(self) -> InterventionEngine:
        return self._intervention

    @property
    def simulator(self) -> TrajectorySimulator:
        return self._simulator

    @property
    def coach(self) -> HealthCoachEngine:
        return self._coach

    @property
    def optimizer(self) -> LifestyleOptimizer:
        return self._optimizer

    @property
    def deterioration_detector(self) -> EarlyDeteriorationDetector:
        return self._deterioration

    @property
    def uncertainty_manager(self) -> UncertaintyManager:
        return self._uncertainty

    @property
    def oversight(self) -> HumanOversightLayer:
        return self._oversight

    # ── Internal ─────────────────────────────────────────────

    @staticmethod
    def _build_summary(
        deterioration: dict,
        escalation,
        interventions: dict,
        trajectory,
    ) -> str:
        """Build a human-readable decision summary."""
        parts: list[str] = []

        # Deterioration
        assessment = deterioration.get("overall_assessment", "stable")
        if assessment != "stable":
            parts.append(
                f"Health status: {assessment.replace('_', ' ')}."
            )
        else:
            parts.append("Health status: stable.")

        # Escalation
        if escalation.should_escalate:
            parts.append(
                f"Professional consultation {escalation.escalation_level}: "
                f"{escalation.reason}."
            )

        # Interventions
        int_count = len(interventions.get("interventions", []))
        if int_count > 0:
            parts.append(
                f"{int_count} preventive intervention(s) recommended."
            )

        # Trajectory
        parts.append(
            f"7-day outlook: {trajectory.overall_direction} "
            f"(confidence: {trajectory.confidence_at_horizon:.0%})."
        )

        return " ".join(parts)
