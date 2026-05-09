"""
health_intelligence/api/health_intelligence_routes.py
───────────────────────────────────────────────
FastAPI routes for the Health Intelligence Core.

Endpoints:
  POST /health-intelligence/process          — Full pipeline
  POST /health-intelligence/analyze-symptoms — Symptom-only analysis
  POST /health-intelligence/wearable-sync    — Ingest wearable data
  GET  /health-intelligence/summary          — Health summary

All endpoints use preventive health terminology:
  - health risk assessment
  - preventive monitoring
  - risk profiling
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from health_intelligence.schemas.health_profile import (
    HealthProcessRequest,
    SymptomAnalysisRequest,
    WearableSyncRequest,
)
from health_intelligence.orchestration.health_pipeline import (
    HealthIntelligencePipeline,
)

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/health-intelligence",
    tags=["Health Intelligence"],
    responses={
        500: {"description": "Internal processing error"},
    },
)

# Singleton pipeline instance
_pipeline = HealthIntelligencePipeline()


@router.post(
    "/process",
    summary="Full Health Risk Assessment",
    description=(
        "Runs the complete health intelligence pipeline: "
        "symptom normalization → health profile validation → "
        "medical safety rules → feature engineering → "
        "risk assessment → explainability."
    ),
)
async def process_health(request: HealthProcessRequest):
    """
    Process symptoms, vitals, and wearable data through
    the full health intelligence pipeline.

    Returns a structured risk assessment with calibrated
    confidence, uncertainty, contributing factors, safety
    rule alerts, and human-readable explanations.
    """
    try:
        result = await _pipeline.process(request)
        return {
            "status": "success",
            "data": result,
        }
    except Exception as e:
        log.exception("Health intelligence pipeline failed")
        raise HTTPException(
            status_code=500,
            detail=f"Health intelligence processing error: {str(e)}",
        )


@router.post(
    "/analyze-symptoms",
    summary="Symptom Analysis",
    description=(
        "Lightweight symptom normalization and severity analysis. "
        "Does not run the full risk assessment pipeline."
    ),
)
async def analyze_symptoms(request: SymptomAnalysisRequest):
    """
    Normalize and analyze raw symptoms without running the
    full pipeline. Useful for real-time symptom validation
    and severity preview.
    """
    try:
        result = await _pipeline.analyze_symptoms(request)
        return {
            "status": "success",
            "data": result,
        }
    except Exception as e:
        log.exception("Symptom analysis failed")
        raise HTTPException(
            status_code=500,
            detail=f"Symptom analysis error: {str(e)}",
        )


@router.post(
    "/wearable-sync",
    summary="Sync Wearable Data",
    description=(
        "Ingest wearable data from Google Fit, Health Connect, "
        "or other sources for time-series health tracking. "
        "Detects anomalies and computes trend summaries."
    ),
)
async def sync_wearable(request: WearableSyncRequest):
    """
    Receive and store wearable data snapshots. Returns
    anomaly detections and trend summaries.
    """
    try:
        result = await _pipeline.sync_wearable(request)
        return {
            "status": "success",
            "data": result,
        }
    except Exception as e:
        log.exception("Wearable sync failed")
        raise HTTPException(
            status_code=500,
            detail=f"Wearable sync error: {str(e)}",
        )


@router.get(
    "/summary",
    summary="Health Summary",
    description=(
        "Retrieve a summary of the user's health intelligence "
        "session, including tracked symptoms, wearable trends, "
        "and latest risk assessment."
    ),
)
async def get_health_summary(
    user_id: Optional[str] = Query(
        None,
        description="User identifier for session lookup",
    ),
):
    """
    Get an overview of the user's health tracking data,
    including wearable trends and latest risk assessment.
    """
    try:
        summary = await _pipeline.get_summary(user_id)
        return {
            "status": "success",
            "data": summary.model_dump(),
        }
    except Exception as e:
        log.exception("Health summary retrieval failed")
        raise HTTPException(
            status_code=500,
            detail=f"Health summary error: {str(e)}",
        )
