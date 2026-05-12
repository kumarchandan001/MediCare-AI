"""
Clinical Governance API Routes — Safety, Trust, & Emotional Safety Endpoints

Exposes governance pipeline, emotional safety, escalation boundaries,
human review triggers, trust indicators, and policy information.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from health_intelligence.clinical_governance.safety_governance_engine import SafetyGovernanceEngine
from health_intelligence.emotional_safety.emotional_safety_engine import EmotionalSafetyEngine
from health_intelligence.clinical_policy.policy_engine import PolicyEngine
from health_intelligence.privacy_ethics.privacy_guardrails import PrivacyGuardrails
from health_intelligence.observability.reasoning_audit_logger import ReasoningAuditLogger
from health_intelligence.observability.clinical_decision_metrics import ClinicalDecisionMetrics

governance_router = APIRouter(prefix="/governance", tags=["Clinical Governance"])

_governance = SafetyGovernanceEngine()
_emotional = EmotionalSafetyEngine()
_privacy = PrivacyGuardrails()
_audit = ReasoningAuditLogger()
_metrics = ClinicalDecisionMetrics()


class GovernanceRequest(BaseModel):
    session_id: str
    hypotheses: list = []
    observations: list = []
    narrative_text: str = ""
    severity_score: float = 0.0
    deterioration_score: float = 0.0
    contradiction_count: int = 0
    evidence_sufficiency: float = 0.5
    wearable_trust: float = 0.5
    reasoning_stability: float = 0.7
    escalation_active: bool = False
    unresolved_hours: float = 0


@governance_router.post("/safety-pipeline")
async def run_safety_pipeline(req: GovernanceRequest):
    try:
        _metrics.increment("governance_checks")
        result = _governance.run_governance_pipeline(
            hypotheses=req.hypotheses, observations=req.observations,
            narrative_text=req.narrative_text, severity_score=req.severity_score,
            deterioration_score=req.deterioration_score,
            contradiction_count=req.contradiction_count,
            evidence_sufficiency=req.evidence_sufficiency,
            wearable_trust=req.wearable_trust,
            reasoning_stability=req.reasoning_stability,
            escalation_active=req.escalation_active,
            unresolved_hours=req.unresolved_hours,
        )
        if not result["is_safe"]:
            _metrics.increment("safety_violations")
        if result["human_review"]["should_recommend_review"]:
            _metrics.increment("human_reviews_triggered")
        if result["escalation"]["is_emergency"]:
            _metrics.increment("emergencies")

        _audit.log_reasoning_event(req.session_id, "governance_pipeline", {
            "is_safe": result["is_safe"],
            "escalation_level": result["escalation"]["escalation_level"],
        })
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@governance_router.post("/emotional-safety")
async def apply_emotional_safety(req: GovernanceRequest):
    try:
        result = _emotional.apply_emotional_safety(
            narrative_text=req.narrative_text,
            escalation_level="routine",
            output_data={"hypotheses": req.hypotheses, "contradictions": []},
        )
        if result["calm_language"]["was_modified"]:
            _metrics.increment("calm_language_modifications")
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@governance_router.post("/escalation-check")
async def check_escalation(req: GovernanceRequest):
    try:
        result = _governance.escalation.evaluate_escalation(
            req.observations, req.severity_score, req.deterioration_score,
            req.contradiction_count, req.reasoning_stability, req.unresolved_hours,
        )
        _audit.log_reasoning_event(req.session_id, "escalation_check", {
            "level": result["escalation_level"], "is_emergency": result["is_emergency"],
        })
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@governance_router.post("/human-review-check")
async def check_human_review(req: GovernanceRequest):
    try:
        result = _governance.human_review.evaluate_review_need(
            req.hypotheses, req.observations, req.severity_score,
            req.deterioration_score, req.contradiction_count,
            req.reasoning_stability, req.evidence_sufficiency,
            req.unresolved_hours,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@governance_router.get("/policies")
async def get_policies():
    return {"status": "success", "data": PolicyEngine.get_all_policies()}


@governance_router.get("/metrics")
async def get_metrics():
    return {"status": "success", "data": {**_metrics.get_metrics(), "safety_score": _metrics.get_safety_score()}}


@governance_router.get("/audit/{session_id}")
async def get_audit_log(session_id: str):
    return {"status": "success", "data": _audit.get_session_log(session_id)}
