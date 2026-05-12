"""
Explainability API Routes — Clinical Transparency Endpoints

Exposes reasoning chains, evidence explanations, trust indicators,
investigation graphs, and clinical stories.
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
import traceback

from health_intelligence.clinical_explainability.reasoning_explainer import ReasoningExplainer
from health_intelligence.clinical_explainability.evidence_explainer import EvidenceExplainer
from health_intelligence.clinical_explainability.contradiction_explainer import ContradictionExplainer
from health_intelligence.clinical_explainability.uncertainty_explainer import UncertaintyExplainer
from health_intelligence.clinical_explainability.decision_transparency_engine import DecisionTransparencyEngine
from health_intelligence.clinical_explainability.confidence_shift_explainer import ConfidenceShiftExplainer
from health_intelligence.clinical_explainability.trust_transparency_engine import TrustTransparencyEngine
from health_intelligence.clinical_explainability.reasoning_stability_tracker import ReasoningStabilityTracker
from health_intelligence.investigation_graph.investigation_graph_engine import InvestigationGraphEngine
from health_intelligence.investigation_graph.evidence_pathway_mapper import EvidencePathwayMapper
from health_intelligence.investigation_graph.reasoning_transition_tracker import ReasoningTransitionTracker
from health_intelligence.clinical_storytelling.investigation_story_builder import InvestigationStoryBuilder
from health_intelligence.clinical_storytelling.longitudinal_story_engine import LongitudinalStoryEngine
from health_intelligence.clinical_storytelling.contradiction_storytelling_engine import ContradictionStorytellingEngine

explainability_router = APIRouter(prefix="/explainability", tags=["Clinical Explainability"])

# Engine instances (per-process singletons)
_reasoning_explainer = ReasoningExplainer()
_evidence_explainer = EvidenceExplainer()
_contradiction_explainer = ContradictionExplainer()
_uncertainty_explainer = UncertaintyExplainer()
_decision_engine = DecisionTransparencyEngine()
_confidence_explainer = ConfidenceShiftExplainer()
_trust_engine = TrustTransparencyEngine()
_stability_tracker = ReasoningStabilityTracker()
_graph_engine = InvestigationGraphEngine()
_pathway_mapper = EvidencePathwayMapper()
_transition_tracker = ReasoningTransitionTracker()
_story_builder = InvestigationStoryBuilder()
_longitudinal_engine = LongitudinalStoryEngine()
_contradiction_stories = ContradictionStorytellingEngine()


class ExplainabilityRequest(BaseModel):
    session_id: str
    hypotheses: list = []
    observations: list = []
    severity_data: Optional[dict] = None
    escalation_data: Optional[dict] = None
    trajectory_data: Optional[dict] = None
    recovery_data: Optional[dict] = None
    wearable_data: Optional[dict] = None
    wearable_trust: float = 0.5
    detail_level: str = "simple"
    previous_hypotheses: Optional[list] = None


@explainability_router.post("/reasoning-chain")
async def get_reasoning_chain(req: ExplainabilityRequest):
    try:
        chain = _reasoning_explainer.generate_reasoning_chain(
            observations=req.observations, hypotheses=req.hypotheses,
            severity_level=req.severity_data.get("severity_level", "minimal") if req.severity_data else "minimal",
            escalation_state="calm",
            wearable_influence={"trust_score": req.wearable_trust} if req.wearable_data else None,
            temporal_context=req.trajectory_data,
            detail_level=req.detail_level,
        )
        return {"status": "success", "data": chain}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/evidence-landscape")
async def get_evidence_landscape(req: ExplainabilityRequest):
    try:
        landscape = _evidence_explainer.explain_evidence_landscape(
            hypotheses=req.hypotheses, observations=req.observations,
            wearable_data=req.wearable_data, wearable_trust=req.wearable_trust,
        )
        return {"status": "success", "data": landscape}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/contradictions")
async def get_contradictions(req: ExplainabilityRequest):
    try:
        contradictions = _contradiction_explainer.detect_and_explain(
            hypotheses=req.hypotheses, observations=req.observations,
            wearable_data=req.wearable_data, wearable_trust=req.wearable_trust,
            severity_signals=req.severity_data, trajectory_data=req.trajectory_data,
        )
        story = _contradiction_stories.narrate_contradictions(contradictions)
        return {"status": "success", "data": {**contradictions, "story": story}}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/uncertainty")
async def get_uncertainty(req: ExplainabilityRequest):
    try:
        stability = req.trajectory_data.get("stability_score", 0.5) if req.trajectory_data else 0.5
        evidence_suf = 0.5
        if req.observations and req.hypotheses:
            total_exp = sum(len(h.get("expected_symptoms", [])) for h in req.hypotheses) or 1
            matched = sum(1 for o in req.observations for h in req.hypotheses if o.get("symptom") in h.get("evidence_for", []))
            evidence_suf = min(1.0, matched / total_exp)

        uncertainty = _uncertainty_explainer.explain_uncertainty(
            hypotheses=req.hypotheses, evidence_sufficiency=evidence_suf,
            wearable_trust=req.wearable_trust, trajectory_stability=stability,
        )
        return {"status": "success", "data": uncertainty}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/decisions")
async def get_decisions(req: ExplainabilityRequest):
    try:
        decisions = _decision_engine.explain_decisions(
            hypotheses=req.hypotheses, severity_data=req.severity_data,
            escalation_data=req.escalation_data, trajectory_data=req.trajectory_data,
        )
        return {"status": "success", "data": decisions}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/confidence-shifts")
async def get_confidence_shifts(req: ExplainabilityRequest):
    try:
        shifts = _confidence_explainer.explain_shifts(
            hypotheses=req.hypotheses, previous_hypotheses=req.previous_hypotheses,
        )
        return {"status": "success", "data": shifts}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/trust-indicators")
async def get_trust_indicators(req: ExplainabilityRequest):
    try:
        stability_state = _stability_tracker.get_stability_state()
        contradictions = _contradiction_explainer.detect_and_explain(
            hypotheses=req.hypotheses, observations=req.observations,
        )
        evidence_suf = 0.5
        if req.observations and req.hypotheses:
            total_exp = sum(len(h.get("expected_symptoms", [])) for h in req.hypotheses) or 1
            matched = sum(1 for o in req.observations for h in req.hypotheses if o.get("symptom") in h.get("evidence_for", []))
            evidence_suf = min(1.0, matched / total_exp)

        trust = _trust_engine.calculate_trust_indicators(
            hypotheses=req.hypotheses, observations=req.observations,
            evidence_sufficiency=evidence_suf, wearable_trust=req.wearable_trust,
            reasoning_stability=stability_state.get("stability_score", 0.7),
            contradiction_count=contradictions.get("contradiction_count", 0),
        )
        return {"status": "success", "data": trust}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/reasoning-stability")
async def get_reasoning_stability(req: ExplainabilityRequest):
    try:
        evidence_suf = 0.5
        contradictions = _contradiction_explainer.detect_and_explain(
            hypotheses=req.hypotheses, observations=req.observations,
        )
        _stability_tracker.record_state(
            hypotheses=req.hypotheses,
            contradiction_count=contradictions.get("contradiction_count", 0),
            evidence_sufficiency=evidence_suf,
        )
        state = _stability_tracker.get_stability_state()
        return {"status": "success", "data": state}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/investigation-graph")
async def get_investigation_graph(req: ExplainabilityRequest):
    try:
        graph = _graph_engine.build_graph(
            hypotheses=req.hypotheses, observations=req.observations,
            trajectory_data=req.trajectory_data, recovery_data=req.recovery_data,
            escalation_data=req.escalation_data,
        )
        return {"status": "success", "data": graph}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/evidence-pathways")
async def get_evidence_pathways(req: ExplainabilityRequest):
    try:
        pathways = _pathway_mapper.map_pathways(
            hypotheses=req.hypotheses, observations=req.observations,
            wearable_data=req.wearable_data,
        )
        return {"status": "success", "data": pathways}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@explainability_router.post("/clinical-story")
async def get_clinical_story(req: ExplainabilityRequest):
    try:
        contradictions = _contradiction_explainer.detect_and_explain(
            hypotheses=req.hypotheses, observations=req.observations,
        )
        story = _story_builder.build_story(
            hypotheses=req.hypotheses, observations=req.observations,
            severity_data=req.severity_data, trajectory_data=req.trajectory_data,
            contradiction_data=contradictions, recovery_data=req.recovery_data,
        )
        _longitudinal_engine.record_session(
            hypotheses=req.hypotheses, observations=req.observations,
            severity_level=req.severity_data.get("severity_level", "minimal") if req.severity_data else "minimal",
            trajectory=req.trajectory_data.get("trajectory", "stable") if req.trajectory_data else "stable",
        )
        longitudinal = _longitudinal_engine.generate_longitudinal_narrative()
        return {"status": "success", "data": {**story, "longitudinal": longitudinal}}
    except Exception as e:
        return {"status": "error", "message": str(e)}
