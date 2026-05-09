"""
health_intelligence/intervention/intervention_engine.py
───────────────────────────────────────────────
Top-level orchestrator for the intervention subsystem.

Coordinates:
  - Causal reasoning → root cause identification
  - Adaptive planning → intervention selection
  - Sequencing → multi-step plans
  - Friction → adherence estimation
  - Feedback → effectiveness learning

This is the single entry point for the API.
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.reasoning.multi_signal_reasoner import (
    MultiSignalReasoner,
)
from health_intelligence.intervention.adaptive_intervention_planner import (
    AdaptiveInterventionPlanner,
)
from health_intelligence.intervention.intervention_sequencer import (
    InterventionSequencer,
)

log = logging.getLogger(__name__)


class InterventionEngine:
    """
    Top-level orchestrator that coordinates causal reasoning
    with intervention generation.
    """

    def __init__(self):
        self._reasoner = MultiSignalReasoner()
        self._planner = AdaptiveInterventionPlanner()
        self._sequencer = InterventionSequencer()

    def generate_interventions(
        self,
        user_id: int,
        current_signals: dict[str, float],
        baselines: Optional[dict[str, float]] = None,
        trend_direction: str = "stable",
        recovery_state: Optional[str] = None,
        circadian_phase: str = "unknown",
        physiological_state: str = "normal",
        fusion_confidence: float = 0.5,
        max_interventions: int = 5,
    ) -> dict:
        """
        Full pipeline: reason → plan → sequence.

        Returns:
            Comprehensive intervention report with reasoning.
        """
        # 1. Causal reasoning
        reasoning = self._reasoner.reason(
            user_id, current_signals, baselines,
            trend_direction, recovery_state,
            circadian_phase, physiological_state,
            fusion_confidence,
        )

        # 2. Extract root causes
        priorities = reasoning.get("intervention_priorities", [])
        root_causes = [
            p["factor"] for p in priorities
            if p.get("urgency") in ("high", "moderate")
        ]

        if not root_causes:
            return {
                "status": "no_intervention_needed",
                "reasoning": reasoning.get("narrative", ""),
                "interventions": [],
                "generated_at": datetime.utcnow().isoformat(),
            }

        # 3. Plan interventions
        stress = current_signals.get("stress_level", 40)
        fatigue = current_signals.get("fatigue", 30)

        interventions = self._planner.plan_interventions(
            user_id, root_causes,
            stress_level=stress,
            fatigue_level=fatigue,
            current_state=physiological_state,
            max_interventions=max_interventions,
        )

        # 4. Check if multi-step sequence warranted
        active_sequences = self._sequencer.get_active_sequences(user_id)
        sequence_suggestion = None

        if not active_sequences and root_causes:
            # Suggest a new sequence for the primary root cause
            primary_root = root_causes[0]
            sequence_suggestion = {
                "root_cause": primary_root,
                "suggested": True,
                "message": (
                    f"A structured recovery plan for "
                    f"{primary_root.replace('_', ' ')} is available. "
                    f"Would you like to start it?"
                ),
            }

        return {
            "status": "interventions_generated",
            "reasoning_summary": reasoning.get("narrative", ""),
            "causal_confidence": reasoning.get("combined_confidence", 0),
            "root_causes": root_causes,
            "interventions": interventions,
            "active_sequences": active_sequences,
            "sequence_suggestion": sequence_suggestion,
            "disclaimer": reasoning.get("reasoning_disclaimer", ""),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def start_recovery_sequence(
        self,
        user_id: int,
        root_cause: str,
    ) -> dict:
        """Start a multi-step recovery sequence."""
        seq = self._sequencer.create_sequence(user_id, root_cause)
        first = self._sequencer.get_current_step(
            user_id, seq.sequence_id,
        )
        return {
            "sequence_id": seq.sequence_id,
            "goal": seq.goal,
            "first_step": first,
        }

    def advance_sequence(
        self,
        user_id: int,
        sequence_id: str,
        completed: bool = True,
    ) -> Optional[dict]:
        """Advance a recovery sequence to the next step."""
        return self._sequencer.advance_step(
            user_id, sequence_id, completed,
        )

    def record_intervention_response(
        self,
        user_id: int,
        intervention_id: str,
        category: str,
        accepted: bool,
        completed: bool = False,
        improvement: Optional[float] = None,
    ) -> None:
        """Record user response to an intervention."""
        self._planner.feedback_tracker.record_offered(
            user_id, intervention_id, category, accepted,
        )
        if accepted:
            self._planner.feedback_tracker.record_completion(
                user_id, intervention_id, completed, improvement,
            )
        self._planner.friction_estimator.record_response(
            user_id, category, accepted,
        )

    def get_effectiveness_report(self, user_id: int) -> dict:
        """Get the user's intervention effectiveness report."""
        return self._planner.feedback_tracker.get_user_effectiveness_report(
            user_id,
        )

    @property
    def reasoner(self) -> MultiSignalReasoner:
        return self._reasoner

    @property
    def sequencer(self) -> InterventionSequencer:
        return self._sequencer
