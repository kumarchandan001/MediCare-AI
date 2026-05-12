"""
health_intelligence/api/temporal_clinical_routes.py
───────────────────────────────────────────────────
REST endpoints for Temporal Clinical Intelligence & Severity Reasoning.

Endpoints:
  GET  /temporal-clinical/snapshot       — Full longitudinal reasoning snapshot
  GET  /temporal-clinical/severity       — Current severity classification
  GET  /temporal-clinical/triage         — Triage classification
  GET  /temporal-clinical/trajectory     — Progression trajectory
  GET  /temporal-clinical/recovery       — Recovery assessment
  GET  /temporal-clinical/escalation     — Escalation prediction
  GET  /temporal-clinical/follow-up      — Follow-up recommendations
  GET  /temporal-clinical/wearable-trust — Wearable reliability
  POST /temporal-clinical/record         — Record a new clinical snapshot
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from health_intelligence.temporal_clinical_intelligence import LongitudinalReasoningEngine
from health_intelligence.severity_reasoning import SeverityClassifier, TriageEngine
from health_intelligence.wearable.temporal_wearable_reliability import TemporalWearableReliability

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/temporal-clinical",
    tags=["Temporal Clinical Intelligence"],
    responses={500: {"description": "Internal processing error"}},
)

# Singleton engine instances
_longitudinal = LongitudinalReasoningEngine()
_severity = SeverityClassifier()
_triage = TriageEngine()
_wearable_reliability = TemporalWearableReliability()


class RecordSnapshotRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID")
    user_id: str = Field(..., description="User identifier")
    severity: float = Field(0.3, ge=0, le=1)
    active_symptoms: list[str] = Field(default_factory=list)
    wearable: dict | None = None
    severity_map: dict | None = None


@router.post("/record", summary="Record Clinical Snapshot")
async def record_snapshot(req: RecordSnapshotRequest):
    """Record a point-in-time clinical snapshot for longitudinal tracking."""
    try:
        _longitudinal.record_session_snapshot(
            session_id=req.session_id,
            user_id=req.user_id,
            severity=req.severity,
            active_symptoms=req.active_symptoms,
            wearable=req.wearable,
            severity_map=req.severity_map,
        )
        if req.wearable:
            _wearable_reliability.record_reading(req.session_id, req.wearable)
        return {"status": "success", "message": "Snapshot recorded."}
    except Exception as e:
        log.exception("Failed to record snapshot")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/snapshot", summary="Longitudinal Reasoning Snapshot")
async def get_snapshot(
    session_id: str = Query(...),
    user_id: str = Query(...),
):
    """Retrieve the full longitudinal reasoning snapshot."""
    try:
        snap = _longitudinal.get_longitudinal_snapshot(
            session_id=session_id,
            user_id=user_id,
            active_symptoms=[],
        )
        return {"status": "success", "data": snap}
    except Exception as e:
        log.exception("Failed to get longitudinal snapshot")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/severity", summary="Severity Classification")
async def get_severity(
    session_id: str = Query(...),
):
    """Retrieve the current severity classification."""
    try:
        det = _longitudinal.deterioration.detect(session_id)
        sev = _severity.classify(
            active_symptoms=[],
            deterioration_score=det.get("score", 0),
        )
        return {"status": "success", "data": sev}
    except Exception as e:
        log.exception("Failed to classify severity")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/triage", summary="Triage Classification")
async def get_triage(
    session_id: str = Query(...),
):
    """Retrieve the triage classification."""
    try:
        traj = _longitudinal.progression.evaluate_trajectory(session_id)
        det = _longitudinal.deterioration.detect(session_id)
        esc = _longitudinal.escalation.predict(session_id)
        sev = _severity.classify(active_symptoms=[], deterioration_score=det.get("score", 0))

        tri = _triage.classify(
            severity_score=sev["severity_score"],
            severity_level=sev["severity_level"],
            deterioration_score=det.get("score", 0),
            escalation_likelihood=esc.get("escalation_likelihood", 0),
            trajectory=traj.get("trajectory", "stable"),
        )
        return {"status": "success", "data": tri}
    except Exception as e:
        log.exception("Failed to classify triage")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trajectory", summary="Progression Trajectory")
async def get_trajectory(session_id: str = Query(...)):
    try:
        traj = _longitudinal.progression.evaluate_trajectory(session_id)
        return {"status": "success", "data": traj}
    except Exception as e:
        log.exception("Failed to evaluate trajectory")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recovery", summary="Recovery Assessment")
async def get_recovery(session_id: str = Query(...)):
    try:
        rec = _longitudinal.recovery.assess_recovery(session_id)
        return {"status": "success", "data": rec}
    except Exception as e:
        log.exception("Failed to assess recovery")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/escalation", summary="Escalation Prediction")
async def get_escalation(session_id: str = Query(...)):
    try:
        esc = _longitudinal.escalation.predict(session_id)
        return {"status": "success", "data": esc}
    except Exception as e:
        log.exception("Failed to predict escalation")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/follow-up", summary="Follow-Up Recommendations")
async def get_follow_up(
    session_id: str = Query(...),
    user_id: str = Query(...),
):
    try:
        snap = _longitudinal.get_longitudinal_snapshot(
            session_id=session_id, user_id=user_id, active_symptoms=[],
        )
        return {"status": "success", "data": snap["follow_up"]}
    except Exception as e:
        log.exception("Failed to get follow-up")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wearable-trust", summary="Wearable Reliability")
async def get_wearable_trust(session_id: str = Query(...)):
    try:
        rel = _wearable_reliability.assess_reliability(session_id)
        return {"status": "success", "data": rel}
    except Exception as e:
        log.exception("Failed to assess wearable reliability")
        raise HTTPException(status_code=500, detail=str(e))
