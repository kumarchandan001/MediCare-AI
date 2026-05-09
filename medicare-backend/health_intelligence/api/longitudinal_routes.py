"""
health_intelligence/api/longitudinal_routes.py
───────────────────────────────────────────────
Longitudinal Health Intelligence API — separated from
real-time health intelligence to maintain scalable
architecture.

Endpoints:
  GET /longitudinal/timeline    — Health event timeline
  GET /longitudinal/trends      — Multi-metric trend analysis
  GET /longitudinal/insights    — Personalized health insights
  GET /longitudinal/scores      — Dynamic health scores
  GET /longitudinal/baseline    — Personal health baseline
  GET /longitudinal/preventive-alerts — Early-warning alerts
  GET /longitudinal/events      — Health event log
  POST /longitudinal/events     — Log a health event
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db

from health_intelligence.personalization.baseline_engine import BaselineEngine
from health_intelligence.personalization.profile_learning import ProfileLearner
from health_intelligence.personalization.adaptive_thresholds import AdaptiveThresholds
from health_intelligence.trends.trend_analyzer import TrendAnalyzer
from health_intelligence.trends.anomaly_detector import AnomalyDetector
from health_intelligence.trends.progression_engine import ProgressionEngine
from health_intelligence.scoring.health_score_engine import HealthScoreEngine
from health_intelligence.scoring.recovery_score import RecoveryScoreEngine
from health_intelligence.scoring.wellness_index import WellnessIndex
from health_intelligence.prevention.preventive_alerts import PreventiveAlertEngine
from health_intelligence.prevention.fatigue_detector import FatigueDetector
from health_intelligence.prevention.burnout_risk import BurnoutRiskAnalyzer
from health_intelligence.analytics.longitudinal_insights import LongitudinalInsightsEngine
from health_intelligence.analytics.behavioral_patterns import BehavioralPatternAnalyzer
from health_intelligence.history.event_timeline import EventTimeline

log = logging.getLogger(__name__)

router = APIRouter(
    prefix="/longitudinal",
    tags=["Longitudinal Health Intelligence"],
    responses={500: {"description": "Internal processing error"}},
)


# ── Request schemas ──────────────────────────────────────────

class HealthEventRequest(BaseModel):
    event_type: str = Field(
        ...,
        description=(
            "Type: illness | medication_change | travel | "
            "exam_stress | sleep_disruption | recovery_period | "
            "lifestyle_change | other"
        ),
    )
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    severity: Optional[str] = None
    metadata: Optional[dict] = None
    started_at: Optional[str] = None
    ended_at: Optional[str] = None


# ── Endpoints ────────────────────────────────────────────────

@router.get(
    "/baseline",
    summary="Personal Health Baseline",
    description=(
        "Retrieve the user's personalized health baseline "
        "with confidence and freshness scores."
    ),
)
async def get_baseline(
    user_id: int = Query(..., description="User ID"),
    recompute: bool = Query(
        False, description="Force recomputation of baseline",
    ),
    db: AsyncSession = Depends(get_db),
):
    try:
        engine = BaselineEngine()
        if recompute:
            await engine.compute_and_save_baseline(db, user_id)
            await db.commit()

        baseline = await engine.get_current_baseline(db, user_id)
        if not baseline:
            baseline = await engine.compute_baseline(db, user_id)

        return {"status": "success", "data": baseline}
    except Exception as e:
        log.exception("Baseline retrieval failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/trends",
    summary="Health Trend Analysis",
    description=(
        "Analyze trends for all wearable metrics over a "
        "configurable time window."
    ),
)
async def get_trends(
    user_id: int = Query(...),
    days: int = Query(14, ge=3, le=90),
    db: AsyncSession = Depends(get_db),
):
    try:
        analyzer = TrendAnalyzer()
        result = await analyzer.analyze_all_trends(
            db, user_id, days=days,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        log.exception("Trend analysis failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/scores",
    summary="Dynamic Health Scores",
    description=(
        "Get the unified health score, recovery score, "
        "and wellness index with per-component breakdowns."
    ),
)
async def get_scores(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        health_engine = HealthScoreEngine()
        recovery_engine = RecoveryScoreEngine()
        wellness_engine = WellnessIndex()

        health = await health_engine.compute_health_score(db, user_id)
        recovery = await recovery_engine.compute_recovery_score(db, user_id)
        wellness = await wellness_engine.compute_wellness_index(db, user_id)

        return {
            "status": "success",
            "data": {
                "health_score": health,
                "recovery": recovery,
                "wellness": wellness,
            },
        }
    except Exception as e:
        log.exception("Score computation failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/insights",
    summary="Personalized Health Insights",
    description=(
        "Generate high-level personalized health summaries "
        "with reliability scores."
    ),
)
async def get_insights(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        engine = LongitudinalInsightsEngine()
        result = await engine.generate_insights(db, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        log.exception("Insight generation failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/preventive-alerts",
    summary="Preventive Health Alerts",
    description=(
        "Generate and retrieve early-warning health alerts "
        "including fatigue detection and burnout risk."
    ),
)
async def get_preventive_alerts(
    user_id: int = Query(...),
    generate_new: bool = Query(
        False, description="Run alert generation engine",
    ),
    db: AsyncSession = Depends(get_db),
):
    try:
        engine = PreventiveAlertEngine()

        if generate_new:
            alerts = await engine.generate_alerts(db, user_id)
            await db.commit()
            return {"status": "success", "data": {"new_alerts": alerts}}

        active = await engine.get_active_alerts(db, user_id)
        return {"status": "success", "data": {"active_alerts": active}}
    except Exception as e:
        log.exception("Preventive alerts failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/timeline",
    summary="Health Event Timeline",
    description="Retrieve the user's health event timeline.",
)
async def get_timeline(
    user_id: int = Query(...),
    days: int = Query(90, ge=7, le=365),
    event_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    try:
        tl = EventTimeline()
        events = await tl.get_timeline(
            db, user_id, days=days, event_type=event_type,
        )
        summary = await tl.get_event_summary(db, user_id, days=days)
        return {
            "status": "success",
            "data": {"events": events, "summary": summary},
        }
    except Exception as e:
        log.exception("Timeline retrieval failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/events",
    summary="Log Health Event",
    description=(
        "Record a health/life event (illness, medication change, "
        "travel, exam stress, etc.) to the timeline."
    ),
)
async def log_event(
    user_id: int = Query(...),
    request: HealthEventRequest = ...,
    db: AsyncSession = Depends(get_db),
):
    try:
        from datetime import datetime
        tl = EventTimeline()

        started_at = None
        ended_at = None
        if request.started_at:
            started_at = datetime.fromisoformat(
                request.started_at.replace("Z", "+00:00")
            )
        if request.ended_at:
            ended_at = datetime.fromisoformat(
                request.ended_at.replace("Z", "+00:00")
            )

        event = await tl.log_event(
            db, user_id,
            event_type=request.event_type,
            title=request.title,
            description=request.description,
            severity=request.severity,
            metadata=request.metadata,
            started_at=started_at,
            ended_at=ended_at,
        )
        await db.commit()

        return {
            "status": "success",
            "data": {
                "event_id": event.id,
                "event_type": event.event_type,
                "title": event.title,
            },
        }
    except Exception as e:
        log.exception("Event logging failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/progressions",
    summary="Health Progressions",
    description=(
        "Get multi-window progression trajectories "
        "(improving, declining, relapsing, recovering)."
    ),
)
async def get_progressions(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        engine = ProgressionEngine()
        result = await engine.get_all_progressions(db, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        log.exception("Progression analysis failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/behavioral-patterns",
    summary="Behavioral Pattern Analysis",
    description=(
        "Mine correlations between lifestyle behaviors "
        "and health outcomes."
    ),
)
async def get_behavioral_patterns(
    user_id: int = Query(...),
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
):
    try:
        analyzer = BehavioralPatternAnalyzer()
        result = await analyzer.analyze_patterns(
            db, user_id, days=days,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        log.exception("Behavioral pattern analysis failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/fatigue",
    summary="Fatigue Assessment",
    description="Assess chronic fatigue accumulation risk.",
)
async def get_fatigue_assessment(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        detector = FatigueDetector()
        result = await detector.assess_fatigue(db, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        log.exception("Fatigue assessment failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/burnout-risk",
    summary="Burnout Risk Assessment",
    description="Analyze burnout risk from converging stressors.",
)
async def get_burnout_risk(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        analyzer = BurnoutRiskAnalyzer()
        result = await analyzer.assess_burnout_risk(db, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        log.exception("Burnout risk assessment failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/profile-confidence",
    summary="Profile Data Confidence",
    description=(
        "Get confidence metrics for baselines, trends, "
        "and insight reliability."
    ),
)
async def get_profile_confidence(
    user_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        learner = ProfileLearner()
        result = await learner.get_profile_confidence(db, user_id)
        return {"status": "success", "data": result}
    except Exception as e:
        log.exception("Profile confidence failed")
        raise HTTPException(status_code=500, detail=str(e))
