"""
Safety Governance Engine — Central Orchestrator

Coordinates all safety subsystems into a unified governance pipeline:
1. Overconfidence prevention
2. Uncertainty governance
3. Escalation boundary management
4. Medical safety enforcement
5. Ambiguity preservation
6. Human review triggers
7. Ethical guardrails
"""
import time
from .overconfidence_prevention_engine import OverconfidencePreventionEngine
from .uncertainty_governor import UncertaintyGovernor
from .escalation_boundary_manager import EscalationBoundaryManager
from .medical_safety_enforcer import MedicalSafetyEnforcer
from .ambiguity_preservation_engine import AmbiguityPreservationEngine
from .human_review_trigger_engine import HumanReviewTriggerEngine
from .ethical_reasoning_guardrails import EthicalReasoningGuardrails


class SafetyGovernanceEngine:
    def __init__(self):
        self.overconfidence = OverconfidencePreventionEngine()
        self.uncertainty = UncertaintyGovernor()
        self.escalation = EscalationBoundaryManager()
        self.safety = MedicalSafetyEnforcer()
        self.ambiguity = AmbiguityPreservationEngine()
        self.human_review = HumanReviewTriggerEngine()
        self.ethics = EthicalReasoningGuardrails()

    def run_governance_pipeline(
        self,
        hypotheses: list[dict],
        observations: list[dict],
        narrative_text: str = "",
        severity_score: float = 0.0,
        deterioration_score: float = 0.0,
        contradiction_count: int = 0,
        evidence_sufficiency: float = 0.5,
        wearable_trust: float = 0.5,
        reasoning_stability: float = 0.7,
        escalation_active: bool = False,
        unresolved_hours: float = 0,
    ) -> dict:
        # 1. Escalation boundaries (first — may override everything)
        escalation = self.escalation.evaluate_escalation(
            observations, severity_score, deterioration_score,
            contradiction_count, reasoning_stability, unresolved_hours,
        )

        # 2. Overconfidence prevention (cap confidence)
        governed = self.overconfidence.apply_confidence_governance(
            hypotheses, observations, contradiction_count,
            evidence_sufficiency, wearable_trust, reasoning_stability,
            escalation_active or escalation["escalation_level"] in ("urgent", "emergency"),
        )

        # 3. Uncertainty governance
        uncertainty = self.uncertainty.enforce_uncertainty(
            governed["hypotheses"], narrative_text,
            evidence_sufficiency, contradiction_count,
        )

        # 4. Medical safety enforcement
        safety = self.safety.enforce_safety(narrative_text, governed["hypotheses"])

        # 5. Ambiguity preservation
        ambiguity = self.ambiguity.evaluate_ambiguity(
            governed["hypotheses"], evidence_sufficiency,
            contradiction_count, reasoning_stability,
        )

        # 6. Human review triggers
        review = self.human_review.evaluate_review_need(
            governed["hypotheses"], observations, severity_score,
            deterioration_score, contradiction_count, reasoning_stability,
            evidence_sufficiency, unresolved_hours, escalation["escalation_level"],
        )

        # 7. Ethical guardrails
        ethics = self.ethics.evaluate_ethics(
            narrative_text, escalation["escalation_level"],
            has_disclaimer=True,
        )

        # Overall safety assessment
        is_safe = (uncertainty["is_safe"] and safety["is_safe"]
                   and ethics["is_ethical"] and not escalation.get("is_emergency", False))

        return {
            "generated_at": time.time(),
            "is_safe": is_safe,
            "governed_hypotheses": governed["hypotheses"],
            "confidence_adjustments": governed["adjustments"],
            "escalation": escalation,
            "uncertainty": uncertainty,
            "safety": safety,
            "ambiguity": ambiguity,
            "human_review": review,
            "ethics": ethics,
            "summary": self._build_summary(is_safe, escalation, review, governed),
        }

    def _build_summary(self, is_safe, escalation, review, governed):
        parts = []
        if escalation.get("is_emergency"):
            parts.append("EMERGENCY: Immediate medical attention recommended.")
        elif not is_safe:
            parts.append("Safety concerns detected and auto-remediated.")
        else:
            parts.append("All governance checks passed.")

        if governed["governance_applied"]:
            parts.append(f" Confidence adjusted for {len(governed['adjustments'])} hypothesis(es).")
        if review["should_recommend_review"]:
            parts.append(f" Human review recommended ({review['urgency']} urgency).")

        return "".join(parts)
