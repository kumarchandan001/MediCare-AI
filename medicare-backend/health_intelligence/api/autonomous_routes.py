"""
health_intelligence/api/autonomous_routes.py
───────────────────────────────────────────────
REST API for the Autonomous Preventive Health
Intelligence layer (Step 4).

Endpoints:
  GET  /health-reasoning        Full causal reasoning report
  GET  /causal-analysis         Detailed causal graph analysis
  GET  /interventions           Autonomous intervention plan
  POST /interventions/respond   Record intervention response
  POST /sequences/start         Start multi-step recovery sequence
  POST /sequences/advance       Advance to next step
  GET  /trajectory              Forward wellness simulation
  GET  /trajectory/compare      Compare current vs intervention
  GET  /wellness-optimization   Lifestyle optimization report
  GET  /coaching                Adaptive coaching messages
  GET  /deterioration-risk      Early deterioration detection
  GET  /decision-summary        Full autonomous decision summary
  GET  /uncertainty-report      Uncertainty & confidence report
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import get_current_user
from features.auth.models import User

from health_intelligence.decision.autonomous_decision_engine import (
    AutonomousDecisionEngine,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/autonomous", tags=["Autonomous Health Intelligence"])

# ── Singleton engine ──
_engine: Optional[AutonomousDecisionEngine] = None


def _get_engine() -> AutonomousDecisionEngine:
    global _engine
    if _engine is None:
        _engine = AutonomousDecisionEngine()
    return _engine


# ── Pydantic request/response models ──

class SignalInput(BaseModel):
    """Optional signal overrides for testing."""
    heart_rate_bpm: float = 72
    stress_level: float = 40
    sleep_hours: float = 7.0
    steps: int = 6000
    active_minutes: int = 25
    hrv_ms: float = 45
    spo2_percent: float = 97
    recovery_score: float = 70
    fatigue: float = 30
    wellness_score: float = 65
    burnout_risk: float = 0.1


class InterventionResponse(BaseModel):
    intervention_id: str
    category: str
    accepted: bool
    completed: bool = False
    improvement: Optional[float] = None


class SequenceStartRequest(BaseModel):
    root_cause: str = "stress_overload"


class SequenceAdvanceRequest(BaseModel):
    sequence_id: str
    completed: bool = True


# ── Helper ──

def _build_signals(params: Optional[SignalInput] = None) -> dict[str, float]:
    p = params or SignalInput()
    return {
        "heart_rate_bpm": p.heart_rate_bpm,
        "stress_level": p.stress_level,
        "sleep_hours": p.sleep_hours,
        "steps": p.steps,
        "active_minutes": p.active_minutes,
        "hrv_ms": p.hrv_ms,
        "spo2_percent": p.spo2_percent,
        "recovery_score": p.recovery_score,
        "fatigue": p.fatigue,
        "wellness_score": p.wellness_score,
        "burnout_risk": p.burnout_risk,
    }


# ── Endpoints ──

@router.get("/health-reasoning")
async def get_health_reasoning(
    trend: str = Query("stable", description="Overall trend direction"),
    user: User = Depends(get_current_user),
):
    """Full multi-signal causal reasoning report."""
    engine = _get_engine()
    signals = _build_signals()
    result = engine.intervention_engine.reasoner.reason(
        user.id, signals,
        trend_direction=trend,
    )
    return result


@router.get("/causal-analysis")
async def get_causal_analysis(
    user: User = Depends(get_current_user),
):
    """Detailed causal graph analysis with competing hypotheses."""
    engine = _get_engine()
    signals = _build_signals()
    causal = engine.intervention_engine.reasoner.causal_engine
    analysis = causal.analyze(user.id, signals)
    return {
        "deviations": analysis.observed_deviations,
        "primary_hypothesis": (
            {
                "root_cause": analysis.primary_hypothesis.root_cause,
                "confidence": analysis.primary_hypothesis.confidence,
                "uncertainty": analysis.primary_hypothesis.uncertainty,
                "mechanism": analysis.primary_hypothesis.mechanism_explanation,
                "competing_count": analysis.primary_hypothesis.competing_count,
            }
            if analysis.primary_hypothesis else None
        ),
        "competing_hypotheses": [
            {
                "root_cause": h.root_cause,
                "confidence": h.confidence,
                "mechanism": h.mechanism_explanation,
            }
            for h in analysis.competing_hypotheses
        ],
        "feedback_loops": analysis.feedback_loops_active,
        "overall_confidence": analysis.overall_causal_confidence,
        "overall_uncertainty": analysis.overall_uncertainty,
        "summary": analysis.explanation_summary,
        "factor_graph": causal.graph.to_dict(),
    }


@router.get("/interventions")
async def get_interventions(
    trend: str = Query("stable"),
    state: str = Query("normal"),
    user: User = Depends(get_current_user),
):
    """Generate autonomous preventive interventions."""
    engine = _get_engine()
    signals = _build_signals()
    return engine.intervention_engine.generate_interventions(
        user.id, signals,
        trend_direction=trend,
        physiological_state=state,
    )


@router.post("/interventions/respond")
async def respond_to_intervention(
    body: InterventionResponse,
    user: User = Depends(get_current_user),
):
    """Record user response to an intervention."""
    engine = _get_engine()
    engine.intervention_engine.record_intervention_response(
        user.id,
        body.intervention_id,
        body.category,
        body.accepted,
        body.completed,
        body.improvement,
    )
    return {"status": "recorded"}


@router.post("/sequences/start")
async def start_sequence(
    body: SequenceStartRequest,
    user: User = Depends(get_current_user),
):
    """Start a multi-step recovery sequence."""
    engine = _get_engine()
    return engine.intervention_engine.start_recovery_sequence(
        user.id, body.root_cause,
    )


@router.post("/sequences/advance")
async def advance_sequence(
    body: SequenceAdvanceRequest,
    user: User = Depends(get_current_user),
):
    """Advance to the next step in a recovery sequence."""
    engine = _get_engine()
    result = engine.intervention_engine.advance_sequence(
        user.id, body.sequence_id, body.completed,
    )
    if not result:
        raise HTTPException(404, "Sequence not found or already completed")
    return result


@router.get("/trajectory")
async def get_trajectory(
    horizon_days: int = Query(7, ge=1, le=14),
    user: User = Depends(get_current_user),
):
    """Simulate forward wellness trajectory."""
    engine = _get_engine()
    signals = _build_signals()
    sim_values = {
        "stress_level": signals["stress_level"],
        "fatigue": signals["fatigue"],
        "recovery_score": signals["recovery_score"],
        "burnout_risk": signals["burnout_risk"],
        "wellness_score": signals["wellness_score"],
    }
    result = engine.simulator.simulate(
        user.id, sim_values, horizon_days,
    )
    return {
        "direction": result.overall_direction,
        "confidence_at_horizon": result.confidence_at_horizon,
        "initial": result.initial_values,
        "final": result.final_values,
        "warnings": result.warnings,
        "steps": [
            {"day": s.day, "values": s.values, "confidence": s.confidence}
            for s in result.steps
        ],
    }


@router.get("/trajectory/compare")
async def compare_trajectories(
    horizon_days: int = Query(7, ge=1, le=14),
    user: User = Depends(get_current_user),
):
    """Compare current trend vs with-intervention trajectory."""
    engine = _get_engine()
    signals = _build_signals()
    sim_values = {
        "stress_level": signals["stress_level"],
        "fatigue": signals["fatigue"],
        "recovery_score": signals["recovery_score"],
        "burnout_risk": signals["burnout_risk"],
        "wellness_score": signals["wellness_score"],
    }
    intervention_effects = {
        "stress_level": -3.0,
        "fatigue": -2.5,
        "recovery_score": 2.0,
    }
    return engine.simulator.compare_scenarios(
        user.id, sim_values, intervention_effects, horizon_days,
    )


@router.get("/wellness-optimization")
async def get_wellness_optimization(
    trend: str = Query("stable"),
    user: User = Depends(get_current_user),
):
    """Lifestyle optimization report."""
    engine = _get_engine()
    signals = _build_signals()
    return engine.optimizer.optimize(
        user.id, signals, trend_direction=trend,
    )


@router.get("/coaching")
async def get_coaching(
    state: str = Query("normal"),
    user: User = Depends(get_current_user),
):
    """Adaptive coaching messages."""
    engine = _get_engine()
    signals = _build_signals()

    # Quick intervention generation for coaching
    interventions = engine.intervention_engine.generate_interventions(
        user.id, signals, physiological_state=state,
    )
    raw = interventions.get("interventions", [])

    return engine.coach.generate_coaching(
        user.id, raw,
        stress_level=signals["stress_level"],
        fatigue_level=signals["fatigue"],
        physiological_state=state,
    )


@router.get("/deterioration-risk")
async def get_deterioration_risk(
    user: User = Depends(get_current_user),
):
    """Early deterioration detection report."""
    engine = _get_engine()
    signals = _build_signals()
    return engine.deterioration_detector.detect(user.id, signals)


@router.get("/decision-summary")
async def get_decision_summary(
    trend: str = Query("stable"),
    state: str = Query("normal"),
    user: User = Depends(get_current_user),
):
    """Full autonomous decision summary (all subsystems)."""
    engine = _get_engine()
    signals = _build_signals()
    return engine.decide(
        user.id, signals,
        trend_direction=trend,
        physiological_state=state,
    )


@router.get("/uncertainty-report")
async def get_uncertainty_report(
    user: User = Depends(get_current_user),
):
    """Uncertainty and confidence report."""
    engine = _get_engine()
    profile = engine.uncertainty_manager.assess_uncertainty(user.id)
    return {
        "signal_reliability": profile.signal_reliability,
        "prediction_confidence": profile.prediction_confidence,
        "causal_confidence": profile.causal_confidence,
        "intervention_confidence": profile.intervention_confidence,
        "data_completeness": profile.data_completeness,
        "overall_confidence": profile.overall_confidence,
        "overall_uncertainty": profile.overall_uncertainty,
        "recommendations": profile.recommendations,
    }
