import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

from core.database import get_db
from core.deps import get_current_user
from core.cache import cache, cache_key
from shared.response import success_response
from features.auth.models import User
from features.health import service
from features.health.schemas import (
    SaveVitalsRequest,
    SaveActivityRequest,
    BMIRequest,
)
from features.health.models import (
    HealthMonitoring,
    ActivityTracking,
    BMIHistory,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health"])

# Cache TTLs (seconds)
CACHE_SUMMARY = 5 * 60
CACHE_RISK = 10 * 60
CACHE_INSIGHTS = 10 * 60
CACHE_ALERTS = 2 * 60
CACHE_HABITS = 30 * 60


# ── GET /health/summary ───────────────────
@router.get("/summary")
async def health_summary(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated health metrics for dashboard."""
    ck = cache_key("health_summary", current_user.id, str(days))
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_health_summary(db, current_user.id, days)
    data_dict = data.model_dump()
    await cache.set(ck, data_dict, expire=CACHE_SUMMARY)
    return success_response(data=data_dict)


# ── GET /health/risk-score ────────────────
@router.get("/risk-score")
async def risk_score(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate user health risk score."""
    ck = cache_key("risk_score", current_user.id)
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_risk_score(db, current_user.id)
    data_dict = data.model_dump()
    await cache.set(ck, data_dict, expire=CACHE_RISK)
    return success_response(data=data_dict)


# ── GET /health/insights ──────────────────
@router.get("/insights")
async def health_insights(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-generated health insights."""
    ck = cache_key("insights", current_user.id)
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_insights(db, current_user.id)
    data_dict = data.model_dump()
    await cache.set(ck, data_dict, expire=CACHE_INSIGHTS)
    return success_response(data=data_dict)


# ── GET /health/alerts ────────────────────
@router.get("/alerts")
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user health alerts."""
    ck = cache_key("alerts", current_user.id)
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_alerts(db, current_user.id)
    data_dict = data.model_dump()
    await cache.set(ck, data_dict, expire=CACHE_ALERTS)
    return success_response(data=data_dict)


# ── GET /health/habits ────────────────────
@router.get("/habits")
async def habit_tips(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Personalized habit coaching tips."""
    ck = cache_key("habits", current_user.id)
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_habit_tips(db, current_user.id)
    data_dict = data.model_dump()
    await cache.set(ck, data_dict, expire=CACHE_HABITS)
    return success_response(data=data_dict)


# ── POST /health/vitals ───────────────────
@router.post("/vitals", status_code=201)
async def save_vitals(
    data: SaveVitalsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save health monitoring record."""
    record = HealthMonitoring(
        user_id=current_user.id,
        **data.model_dump(exclude_none=True),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Invalidate all caches
    await cache.delete_pattern(f"health_summary:{current_user.id}*")
    for prefix in [
        "risk_score", "insights", "alerts", "habits"
    ]:
        await cache.delete(cache_key(prefix, current_user.id))

    return success_response(
        data={"id": record.id},
        message="Vitals saved successfully.",
        status_code=201,
    )


# ── POST /health/activity ─────────────────
@router.post("/activity", status_code=201)
async def save_activity(
    data: SaveActivityRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log physical activity."""
    record = ActivityTracking(
        user_id=current_user.id,
        **data.model_dump(),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    await cache.delete_pattern(f"health_summary:{current_user.id}*")
    for prefix in ["risk_score", "habits"]:
        await cache.delete(cache_key(prefix, current_user.id))

    return success_response(
        data={"id": record.id},
        message="Activity logged.",
        status_code=201,
    )


# ── POST /health/bmi ──────────────────────
@router.post("/bmi")
async def calculate_bmi(
    data: BMIRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate and save BMI."""
    h_m = data.height / 100
    bmi = round(data.weight / (h_m * h_m), 1)
    cat = service._bmi_category(bmi)

    record = BMIHistory(
        user_id=current_user.id,
        height=data.height,
        weight=data.weight,
        bmi=bmi,
    )
    db.add(record)
    await db.commit()

    await cache.delete_pattern(f"health_summary:{current_user.id}*")
    await cache.delete(cache_key("risk_score", current_user.id))

    return success_response(
        data={
            "bmi": bmi,
            "category": cat,
            "height": data.height,
            "weight": data.weight,
        }
    )


# ── GET /health/history ───────────────────
@router.get("/history")
async def health_history(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Paginated health history."""
    from datetime import timedelta

    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(HealthMonitoring)
        .where(
            and_(
                HealthMonitoring.user_id == current_user.id,
                HealthMonitoring.created_at >= since,
            )
        )
        .order_by(desc(HealthMonitoring.created_at))
        .limit(30)
    )
    records = result.scalars().all()

    return success_response(
        data=[
            {
                "id": r.id,
                "date": str(r.created_at)[:10],
                "sleep": r.sleep_hours,
                "heart_rate": r.heart_rate,
                "oxygen": r.oxygen_level,
                "stress": r.stress_level,
                "temperature": r.body_temperature,
                "notes": r.notes,
                "created_at": str(r.created_at),
            }
            for r in records
        ]
    )


# ═══════════════════════════════════════════
# SMARTWATCH / GOOGLE FIT INTEGRATION
# ═══════════════════════════════════════════

@router.get("/google/auth")
async def get_google_auth_url(
    current_user: User = Depends(get_current_user)
):
    """Get the Google OAuth consent URL for linking Google Fit."""
    from features.health.google_auth_service import generate_auth_url
    url = generate_auth_url(current_user.id)
    if not url:
        return {"error": "Google OAuth is not configured on the server."}
    return success_response(data={"auth_url": url}, message="Auth URL generated")

@router.get("/google/callback")
async def google_auth_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    """Handle the Google OAuth callback and save the token."""
    from features.health.google_auth_service import exchange_code_for_token
    try:
        user_id = int(state)
        token = await exchange_code_for_token(db, code, user_id)
        if token:
            return success_response(message="Google Fit connected successfully!")
        else:
            return {"error": "Failed to exchange authorization code."}
    except Exception as e:
        logger.error(f"Google auth callback error: {e}")
        return {"error": "Failed to process callback."}




# ── GET /health/recommendations ───────────
@router.get("/recommendations")
async def get_health_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get actionable recommendations converted from health insights."""
    from features.health.recommendation_service import generate_recommendations
    from features.health.score_service import calculate_health_score
    from features.health import daily_health_service as daily_service
    
    recommendations = await generate_recommendations(db, current_user.id)
    
    record, _ = await daily_service.get_latest(db, current_user.id)
    if not record:
        return success_response(data={
            "recommendations": recommendations,
            "score": 0,
            "status": "none"
        })
        
    steps = record.steps or 0
    sleep = record.sleep_hours or 0.0
    hr = record.heart_rate or 0
    
    score_data = calculate_health_score(steps, sleep, hr)
    
    return success_response(data={
        "recommendations": recommendations,
        "score": score_data["score"],
        "status": score_data["status"]
    })

# ── GET /health/risks ─────────────────────
@router.get("/risks")
async def get_health_risks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Detect potential health risks and trigger intelligent alerts."""
    from features.health.risk_service import generate_risk_profile, generate_alerts
    
    risks = await generate_risk_profile(db, current_user.id)
    alerts = await generate_alerts(db, current_user.id)
    
    return success_response(data={
        "risks": risks,
        "alerts": alerts
    })
# ── GET /health/summary/daily ───────────────
@router.get("/summary/daily")
async def get_daily_health_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deliver proactive daily health summary."""
    from features.health.notification_service import generate_daily_summary
    summary_data = await generate_daily_summary(db, current_user.id)
    return success_response(data=summary_data)

# ── GET /health/report/weekly ───────────────
@router.get("/report/weekly")
async def get_weekly_health_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deliver proactive weekly health report and trend analysis."""
    from features.health.notification_service import generate_weekly_report
    report_data = await generate_weekly_report(db, current_user.id)
    return success_response(data=report_data)

# ── GET /health/report/pdf ──────────────────
@router.get("/report/pdf")
async def get_pdf_health_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download a comprehensive weekly health PDF report."""
    from fastapi.responses import Response
    from features.health.report_service import generate_pdf_report
    
    pdf_bytes = await generate_pdf_report(db, current_user.id)
    
    # Return as a downloadable file
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="Health_Report_{current_user.username}.pdf"'
        }
    )
