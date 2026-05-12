"""
health_intelligence/differential_reasoning/differential_engine.py
─────────────────────────────────────────────────────────────────
Main orchestrator for the differential diagnosis reasoning system.

Ties together hypothesis ranking, evidence weighting, exclusion logic,
competing-condition analysis, stability tracking, temporal reasoning,
wearable augmentation, and strategic investigation guidance.
"""

import logging
from typing import Any, Dict, List, Optional

from .hypothesis_ranker import HypothesisRanker
from .evidence_weighting_engine import EvidenceWeightingEngine
from .exclusion_reasoning_engine import ExclusionReasoningEngine
from .competing_conditions_engine import CompetingConditionsEngine
from .overlap_analysis_engine import OverlapAnalysisEngine
from .confidence_evolution_engine import ConfidenceEvolutionEngine
from .ambiguity_resolution_engine import AmbiguityResolutionEngine
from .hypothesis_stability_tracker import HypothesisStabilityTracker
from .temporal_differential_engine import TemporalDifferentialEngine
from .wearable_augmented_reasoning import WearableAugmentedReasoning
from .investigation_strategy_engine import InvestigationStrategyEngine

log = logging.getLogger(__name__)


class DifferentialEngine:
    """Central orchestrator for probabilistic differential reasoning."""

    # ── Safety constants ────────────────────────────────────────
    MAX_CONFIDENCE = 0.92          # never present near-certainty
    MIN_CONFIDENCE_FLOOR = 0.03    # keep conditions visible until explicitly excluded
    CONTRADICTION_PENALTY = 0.15   # per-contradiction confidence penalty

    def __init__(self) -> None:
        self.hypothesis_ranker = HypothesisRanker()
        self.evidence_weighting = EvidenceWeightingEngine()
        self.exclusion_engine = ExclusionReasoningEngine()
        self.competing_conditions = CompetingConditionsEngine()
        self.overlap_analysis = OverlapAnalysisEngine()
        self.confidence_evolution = ConfidenceEvolutionEngine()
        self.ambiguity_resolution = AmbiguityResolutionEngine()
        self.stability_tracker = HypothesisStabilityTracker()
        self.temporal_engine = TemporalDifferentialEngine()
        self.wearable_reasoning = WearableAugmentedReasoning()
        self.strategy_engine = InvestigationStrategyEngine()

    # ── Primary pipeline ────────────────────────────────────────

    def process_new_evidence(
        self,
        session_id: str,
        active_symptoms: List[str],
        clinical_context: Dict[str, Any],
        wearable_data: Optional[Dict[str, Any]] = None,
        temporal_data: Optional[Dict[str, Any]] = None,
        contradictions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Run full differential pipeline on the latest evidence set.

        Returns a structured reasoning snapshot containing ranked hypotheses,
        weighted evidence, exclusions, comparisons, stability data, ambiguity
        metrics, confidence evolution, and a strategic next-question suggestion.
        """
        contradictions = contradictions or []

        # 1. Weigh evidence quality
        weighted_evidence = self.evidence_weighting.weigh_evidence(
            active_symptoms, clinical_context, wearable_data,
        )

        # 2. Temporal reasoning adjustments
        temporal_adjustments = self.temporal_engine.analyze(
            active_symptoms, temporal_data or {},
        )

        # 3. Wearable-augmented evidence modifiers
        wearable_modifiers = self.wearable_reasoning.compute_modifiers(
            wearable_data or {},
        )

        # 4. Rank hypotheses (severity-prioritised)
        hypotheses = self.hypothesis_ranker.rank_hypotheses(
            weighted_evidence,
            temporal_adjustments=temporal_adjustments,
            wearable_modifiers=wearable_modifiers,
            contradictions=contradictions,
        )

        # 5. Apply safety caps
        hypotheses = self._apply_safety_caps(hypotheses, contradictions)

        # 6. Exclusion reasoning
        exclusions = self.exclusion_engine.process_exclusions(
            hypotheses, active_symptoms, temporal_data,
        )

        # 7. Competing-condition comparison
        comparisons = self.competing_conditions.compare(hypotheses)

        # 8. Multi-condition overlap
        overlaps = self.overlap_analysis.analyze(active_symptoms, hypotheses)

        # 9. Stability & volatility tracking
        stability = self.stability_tracker.update(session_id, hypotheses)

        # 10. Confidence evolution
        evolution = self.confidence_evolution.record_evolution(
            session_id, hypotheses,
        )

        # 11. Multi-dimensional ambiguity
        ambiguity = self.ambiguity_resolution.calculate_ambiguity(
            weighted_evidence, hypotheses, wearable_modifiers, stability,
        )

        # 12. Strategic next-question
        strategy = self.strategy_engine.suggest_next_question(
            hypotheses, weighted_evidence, ambiguity,
        )

        return {
            "hypotheses": hypotheses,
            "weighted_evidence": weighted_evidence,
            "exclusions": exclusions,
            "comparisons": comparisons,
            "overlaps": overlaps,
            "stability": stability,
            "evolution": evolution,
            "ambiguity": ambiguity,
            "strategy": strategy,
            "temporal_adjustments": temporal_adjustments,
            "wearable_modifiers": wearable_modifiers,
        }

    # ── Internal helpers ────────────────────────────────────────

    def _apply_safety_caps(
        self,
        hypotheses: List[Dict[str, Any]],
        contradictions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Enforce max-confidence caps and contradiction penalties."""
        for h in hypotheses:
            # Apply contradiction penalties
            relevant = [c for c in contradictions if c.get("condition") == h["condition"]]
            penalty = len(relevant) * self.CONTRADICTION_PENALTY
            h["confidence"] = max(
                self.MIN_CONFIDENCE_FLOOR,
                min(self.MAX_CONFIDENCE, h["confidence"] - penalty),
            )
            h["contradiction_count"] = len(relevant)
        return hypotheses
