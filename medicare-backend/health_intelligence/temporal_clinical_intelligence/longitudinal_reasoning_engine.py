"""
longitudinal_reasoning_engine.py
────────────────────────────────
Orchestrates continuous multi-session clinical reasoning.

This is the top-level coordinator for STEP 3 temporal intelligence.
It integrates all sub-engines and produces a unified longitudinal snapshot.
"""

from typing import Any, Dict, List

from .progression_engine import ProgressionEngine
from .deterioration_detector import DeteriorationDetector
from .recovery_tracking_engine import RecoveryTrackingEngine
from .symptom_evolution_engine import SymptomEvolutionEngine
from .recurrence_analysis_engine import RecurrenceAnalysisEngine
from .escalation_prediction_engine import EscalationPredictionEngine
from .temporal_confidence_engine import TemporalConfidenceEngine
from .follow_up_strategy_engine import FollowUpStrategyEngine


class LongitudinalReasoningEngine:
    """Top-level orchestrator for continuous temporal clinical intelligence."""

    def __init__(self) -> None:
        self.progression = ProgressionEngine()
        self.deterioration = DeteriorationDetector()
        self.recovery = RecoveryTrackingEngine()
        self.symptom_evolution = SymptomEvolutionEngine()
        self.recurrence = RecurrenceAnalysisEngine()
        self.escalation = EscalationPredictionEngine()
        self.temporal_confidence = TemporalConfidenceEngine()
        self.follow_up = FollowUpStrategyEngine()

    def record_session_snapshot(
        self,
        session_id: str,
        user_id: str,
        severity: float,
        active_symptoms: List[str],
        hypotheses: List[Dict[str, Any]] | None = None,
        wearable: Dict[str, Any] | None = None,
        severity_map: Dict[str, float] | None = None,
    ) -> None:
        """Record a point-in-time clinical snapshot across all sub-engines."""
        hypotheses = hypotheses or []
        wearable = wearable or {}

        self.progression.record_snapshot(session_id, severity, len(active_symptoms), wearable)
        self.deterioration.record_state(session_id, severity, active_symptoms, wearable)
        self.recovery.record_state(session_id, severity, len(active_symptoms), wearable)
        self.symptom_evolution.record_symptoms(session_id, active_symptoms, severity_map)
        self.recurrence.record_episode(
            user_id,
            active_symptoms,
            [h.get("condition", "") for h in hypotheses],
            severity,
        )
        self.temporal_confidence.record_update(session_id)

    def get_longitudinal_snapshot(
        self,
        session_id: str,
        user_id: str,
        active_symptoms: List[str],
        hypotheses: List[Dict[str, Any]] | None = None,
        triage_level: str = "self_monitoring",
    ) -> Dict[str, Any]:
        """Produce a unified longitudinal reasoning snapshot."""
        hypotheses = hypotheses or []

        # 1. Trajectory
        trajectory = self.progression.evaluate_trajectory(session_id)

        # 2. Deterioration
        det = self.deterioration.detect(session_id)

        # 3. Recovery
        rec = self.recovery.assess_recovery(session_id)

        # 4. Symptom evolution
        evo = self.symptom_evolution.analyse_evolution(session_id)

        # 5. Recurrence
        recurrence = self.recurrence.analyse_recurrence(user_id, active_symptoms)

        # 6. Escalation prediction
        self.escalation.record_state(session_id, det["score"], trajectory.get("stability_score", 0.5))
        esc = self.escalation.predict(session_id)

        # 7. Temporal confidence adjustments
        tc_adj = self.temporal_confidence.compute_adjustments(
            session_id,
            hypotheses,
            trajectory.get("trajectory", "stable"),
        )

        # 8. Follow-up strategy
        follow = self.follow_up.generate_follow_up(
            triage_level,
            trajectory.get("trajectory", "stable"),
            rec.get("recovery_quality", 0),
            esc.get("escalation_likelihood", 0),
            recurrence.get("recurrence_score", 0),
        )

        # 9. Narrative
        narrative = self._build_narrative(trajectory, det, rec, evo, esc)

        return {
            "trajectory": trajectory,
            "deterioration": det,
            "recovery": rec,
            "symptom_evolution": evo,
            "recurrence": recurrence,
            "escalation": esc,
            "temporal_adjustments": tc_adj,
            "follow_up": follow,
            "narrative": narrative,
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _build_narrative(
        trajectory: Dict,
        det: Dict,
        rec: Dict,
        evo: Dict,
        esc: Dict,
    ) -> str:
        """Build a calm, human-readable clinical narrative."""
        parts = []

        # Trajectory
        traj = trajectory.get("trajectory", "unknown")
        if traj == "improving":
            parts.append("Overall, your clinical trajectory shows improvement.")
        elif traj == "deteriorating":
            parts.append("Your clinical trajectory suggests some worsening that is being monitored.")
        elif traj == "fluctuating":
            parts.append("Your symptoms have been fluctuating, making the progression uncertain.")
        else:
            parts.append("Your clinical state has been relatively stable.")

        # Recovery
        if rec.get("is_recovering"):
            quality = rec.get("recovery_quality", 0)
            if quality > 0.5:
                parts.append("Recovery appears sustained.")
            elif rec.get("fragility", 0) > 0.5:
                parts.append("Some improvement is noted, but recovery appears fragile.")

        # Deterioration
        if det.get("is_deteriorating"):
            parts.append("Some indicators suggest worsening that warrants attention.")

        # Symptom evolution
        if evo.get("spreading"):
            parts.append("Symptoms appear to be spreading to new areas.")
        if evo.get("new_symptoms"):
            parts.append(f"New symptoms have emerged: {', '.join(s.replace('_', ' ') for s in evo['new_symptoms'][:3])}.")

        # Escalation
        if esc.get("escalation_likelihood", 0) > 0.3 and not esc.get("cooldown_active"):
            parts.append("Escalation risk is being tracked but remains within manageable levels.")

        return " ".join(parts) if parts else "Clinical state is being monitored."
