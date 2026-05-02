"""
daily_health_router.py
─────────────────────────────────────────────
FastAPI routes for per-day health data tracking.

Endpoints:
  POST   /health/daily/update         — Add or update today's health data
  GET    /health/daily/latest         — Get most recent record + freshness
  GET    /health/daily/history        — Get last N days of records
  GET    /health/daily/trends         — Get trend analysis
  GET    /health/daily/{target_date}  — Get record for a specific date
"""

import logging
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import get_current_user
from shared.response import success_response, error_response
from features.auth.models import User
from features.health.daily_health_schemas import DailyHealthUpdateRequest
from features.health import daily_health_service as service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health/daily", tags=["Daily Health Tracking"])


# ── POST /health/daily/update ─────────────────────────────────
@router.post("/update", status_code=201)
async def update_daily_health(
    data: DailyHealthUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add or update today's health data.

    • If today's record exists → merges new values (doesn't overwrite nulls).
    • If no record for today → creates a new one.
    • All fields are optional — send only what you want to update.
    """
    try:
        # Convert Pydantic model to dict, excluding None values
        update_data = data.model_dump(exclude_none=True)

        record = await service.add_or_update_today(
            db=db,
            user_id=current_user.id,
            data=update_data,
        )

        return success_response(
            data=service.serialize_record(record, freshness="today"),
            message="Health data saved successfully.",
            status_code=201,
        )
    except Exception as e:
        logger.error(f"Failed to save daily health data: {e}", exc_info=True)
        return error_response(
            message="Failed to save health data.",
            error_type="SAVE_ERROR",
            status_code=500,
        )


# ── GET /health/daily/latest ──────────────────────────────────
@router.get("/latest")
async def get_latest_daily_health(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the most recent daily health record.

    Returns the record along with a `data_freshness` flag:
      • "today"     — data is from today
      • "yesterday" — data is from yesterday
      • "stale"     — data is older than yesterday
      • "none"      — no daily health data exists
    """
    record, freshness = await service.get_latest(db, current_user.id)

    if record is None:
        return success_response(
            data={
                "record": None,
                "data_freshness": "none",
                "message": "No daily health data found. Start tracking today!",
            }
        )

    return success_response(
        data=service.serialize_record(record, freshness=freshness),
    )


# ── GET /health/daily/history ─────────────────────────────────
@router.get("/history")
async def get_daily_health_history(
    days: int = Query(7, ge=1, le=365, description="Number of days to look back"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get daily health records for the last N days.

    Records are returned newest-first. Days without data are
    simply missing from the list (no zero-fill).
    """
    records = await service.get_history(db, current_user.id, days=days)

    today = date.today()
    serialized = []
    for r in records:
        if r.date == today:
            f = "today"
        elif r.date == today - timedelta(days=1):
            f = "yesterday"
        else:
            f = "stale"
        serialized.append(service.serialize_record(r, freshness=f))

    return success_response(
        data={
            "records": serialized,
            "count": len(serialized),
            "period_days": days,
        }
    )


# ── GET /health/daily/trends ──────────────────────────────────
@router.get("/trends")
async def get_daily_health_trends(
    days: int = Query(7, ge=3, le=365, description="Number of days for trend analysis"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get trend analysis over a period.

    Requires at least 3 days of data for meaningful trends.
    Compares recent half vs older half of the period.
    """
    trends = await service.get_trends(db, current_user.id, days=days)

    return success_response(
        data=trends.model_dump(),
    )


# ── GET /health/daily/{target_date} ───────────────────────────
@router.get("/{target_date}")
async def get_daily_health_by_date(
    target_date: str = Path(
        ...,
        description="Date in YYYY-MM-DD format",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get health data for a specific date.

    Date must be in YYYY-MM-DD format (e.g., 2026-05-01).
    """
    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        return error_response(
            message="Invalid date format. Use YYYY-MM-DD.",
            error_type="VALIDATION_ERROR",
            status_code=400,
        )

    # Don't allow future dates
    if parsed_date > date.today():
        return error_response(
            message="Cannot query future dates.",
            error_type="VALIDATION_ERROR",
            status_code=400,
        )

    record = await service.get_by_date(db, current_user.id, parsed_date)

    if record is None:
        return success_response(
            data={
                "record": None,
                "date": target_date,
                "message": f"No health data recorded for {target_date}.",
            }
        )

    today = date.today()
    if parsed_date == today:
        freshness = "today"
    elif parsed_date == today - timedelta(days=1):
        freshness = "yesterday"
    else:
        freshness = "stale"

    return success_response(
        data=service.serialize_record(record, freshness=freshness),
    )
