"""
health_intelligence/api/clinical_interview_routes.py
────────────────────────────────────────────────────
FastAPI routes for the Conversational Clinical Interview Engine.

Endpoints:
  POST /clinical-interview/start     — Start a new clinical interview
  POST /clinical-interview/respond   — Submit a response & get next question
  GET  /clinical-interview/state     — Current reasoning state
  POST /clinical-interview/reset     — Reset the interview
  GET  /clinical-interview/history   — Past interview sessions
"""

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from health_intelligence.clinical_interview import ClinicalInterviewEngine

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/clinical-interview",
    tags=["Clinical Interview"],
    responses={
        500: {"description": "Internal processing error"},
    },
)

# Singleton engine instance
_engine = ClinicalInterviewEngine()


# ── Request / Response Models ───────────────────

class StartInterviewRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")

class RespondRequest(BaseModel):
    session_id: str = Field(..., description="Active session ID")
    user_id: str = Field(..., description="User identifier")
    question_id: str = Field(default="initial_intake", description="ID of the question being answered")
    text: str = Field(..., description="User's free-text or option response")

class ResetRequest(BaseModel):
    session_id: str = Field(..., description="Session to reset")


# ── Endpoints ───────────────────────────────────

@router.post(
    "/start",
    summary="Start Clinical Interview",
    description=(
        "Initializes a new adaptive clinical interview session. "
        "Returns the first question and an empty reasoning state."
    ),
)
async def start_interview(request: StartInterviewRequest):
    """Start a new clinical investigation session."""
    try:
        session_id = str(uuid.uuid4())
        result = _engine.start_interview(session_id, request.user_id)
        result["session_id"] = session_id
        return {
            "status": "success",
            "data": result,
        }
    except Exception as e:
        log.exception("Failed to start clinical interview")
        raise HTTPException(
            status_code=500,
            detail=f"Clinical interview start error: {str(e)}",
        )


@router.post(
    "/respond",
    summary="Submit Interview Response",
    description=(
        "Submits the user's answer and receives the next adaptive "
        "question, updated uncertainty state, and reasoning metadata."
    ),
)
async def respond_to_interview(request: RespondRequest):
    """Process a user response and return next question + state."""
    try:
        result = _engine.process_response(
            session_id=request.session_id,
            user_id=request.user_id,
            response_data={
                "question_id": request.question_id,
                "text": request.text,
            },
        )
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        result["session_id"] = request.session_id
        return {
            "status": "success",
            "data": result,
        }
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Failed to process interview response")
        raise HTTPException(
            status_code=500,
            detail=f"Clinical interview response error: {str(e)}",
        )


@router.get(
    "/state",
    summary="Get Interview State",
    description=(
        "Returns the current investigation state including "
        "uncertainty, completeness, active symptoms, severity, "
        "and structured clinical reasoning metadata."
    ),
)
async def get_interview_state(
    session_id: str = Query(..., description="Active session ID"),
):
    """Retrieve the current reasoning state of a session."""
    try:
        state = _engine.state_manager.get_state(session_id)
        if not state:
            raise HTTPException(status_code=404, detail="Session not found")

        hypotheses = _engine.hypothesis_tracker.track_hypothesis(state.active_symptoms)

        return {
            "status": "success",
            "data": {
                "current_stage": state.current_stage,
                "investigation_completeness": state.investigation_completeness,
                "remaining_ambiguity": state.remaining_ambiguity,
                "active_symptoms": state.active_symptoms,
                "severity_indicators": state.severity_indicators,
                "asked_questions": state.asked_questions,
                "answered_questions": state.answered_questions,
                "reasoning_metadata": {
                    "active_domain": state.active_domain,
                    "severity_risk_state": "high" if state.severity_indicators else "normal",
                    "evidence_sufficiency": "sufficient" if state.investigation_completeness > 0.8 else "insufficient",
                    "reasoning_confidence": max(0.1, state.investigation_completeness),
                    "contradiction_signals": [],
                    "hypotheses_preview": hypotheses[:3],
                },
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Failed to retrieve interview state")
        raise HTTPException(
            status_code=500,
            detail=f"Interview state retrieval error: {str(e)}",
        )


@router.post(
    "/reset",
    summary="Reset Interview",
    description="Discards the current session and clears all state.",
)
async def reset_interview(request: ResetRequest):
    """Reset (discard) an active interview session."""
    try:
        if request.session_id in _engine.state_manager.active_sessions:
            del _engine.state_manager.active_sessions[request.session_id]
        return {
            "status": "success",
            "data": {"message": "Interview session reset successfully."},
        }
    except Exception as e:
        log.exception("Failed to reset interview")
        raise HTTPException(
            status_code=500,
            detail=f"Interview reset error: {str(e)}",
        )


@router.get(
    "/history",
    summary="Interview History",
    description=(
        "Returns past interview sessions for a user, "
        "enabling longitudinal investigation continuity."
    ),
)
async def get_interview_history(
    user_id: str = Query(..., description="User identifier"),
):
    """Retrieve past interview sessions for longitudinal reasoning."""
    try:
        history = _engine.memory.get_history(user_id)
        return {
            "status": "success",
            "data": history,
        }
    except Exception as e:
        log.exception("Failed to retrieve interview history")
        raise HTTPException(
            status_code=500,
            detail=f"Interview history error: {str(e)}",
        )
