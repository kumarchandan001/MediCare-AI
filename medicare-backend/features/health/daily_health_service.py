"""
daily_health_service.py
─────────────────────────────────────────────
Service layer for per-day health data tracking.

Core operations:
  • add_or_update_today  — upsert today's record (merge, don't overwrite nulls)
  • get_latest           — most recent record + freshness flag
  • get_by_date          — record for a specific date
  • get_history          — last N days of records
  • get_trends           — aggregated trend analysis
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from features.health.daily_health_model import DailyHealthRecord
from features.health.daily_health_schemas import (
    DailyHealthRecordResponse,
    DailyHealthHistoryResponse,
    DailyHealthTrendsResponse,
)
from core.cache import cache, cache_key

logger = logging.getLogger(__name__)

# Cache TTLs
CACHE_LATEST_TTL = 2 * 60     # 2 minutes
CACHE_HISTORY_TTL = 5 * 60    # 5 minutes

# Fields that can be updated on the DailyHealthRecord model
UPDATABLE_FIELDS = {
    "steps", "sleep_hours", "bp_systolic", "bp_diastolic",
    "heart_rate", "weight", "oxygen_level", "stress_level",
    "body_temperature", "notes",
}


# ═══════════════════════════════════════════
# ADD OR UPDATE TODAY
# ═══════════════════════════════════════════

async def add_or_update_today(
    db: AsyncSession,
    user_id: int,
    data: dict,
) -> DailyHealthRecord:
    """
    Upsert today's health record for a user.

    Logic:
      • If a row exists for (user_id, today) → update only non-None fields
        from `data` (merge strategy — preserves previously set values).
      • If no row exists → insert a new record.
      • Invalidates Redis cache after write.

    Args:
        db: Async database session.
        user_id: Authenticated user ID.
        data: Dict of health fields to set (only non-None values are written).

    Returns:
        The saved DailyHealthRecord instance.
    """
    today = datetime.now(timezone.utc).date()

    # Data validation
    validated_data = {}
    for field, value in data.items():
        if field not in UPDATABLE_FIELDS or value is None:
            continue
        # Bounds checking
        if field == "sleep_hours" and not (0 <= value <= 24):
            continue
        if field == "heart_rate" and not (30 <= value <= 250):
            continue
        if field == "bp_systolic" and not (50 <= value <= 250):
            continue
        if field == "bp_diastolic" and not (30 <= value <= 150):
            continue
        if field == "oxygen_level" and not (50 <= value <= 100):
            continue
        if field == "stress_level" and not (0 <= value <= 10):
            continue
        validated_data[field] = value

    # Check if today's record already exists
    result = await db.execute(
        select(DailyHealthRecord).where(
            and_(
                DailyHealthRecord.user_id == user_id,
                DailyHealthRecord.date == today,
            )
        )
    )
    record = result.scalar_one_or_none()

    if record:
        # ── Update existing record (merge, don't overwrite nulls) ──
        merge_health_data(record, validated_data)
        logger.info(f"Updated daily health record for user={user_id} date={today}")
    else:
        # ── Insert new record ──
        record = DailyHealthRecord(
            user_id=user_id,
            date=today,
        )
        merge_health_data(record, validated_data)
        db.add(record)
        logger.info(f"Created daily health record for user={user_id} date={today}")

    await db.commit()
    await db.refresh(record)

    # Invalidate cached data for this user
    await _invalidate_cache(user_id)

    return record


# ═══════════════════════════════════════════
# GET LATEST
# ═══════════════════════════════════════════

async def get_latest(
    db: AsyncSession,
    user_id: int,
) -> Tuple[Optional[DailyHealthRecord], str]:
    """
    Fetch the most recent daily health record for a user.

    Returns:
        Tuple of (record_or_None, freshness_flag).
        Freshness flags:
          "today"     — record is from today
          "yesterday" — record is from yesterday
          "stale"     — record is older than yesterday
          "none"      — no records exist at all
    """
    result = await db.execute(
        select(DailyHealthRecord)
        .where(DailyHealthRecord.user_id == user_id)
        .order_by(desc(DailyHealthRecord.date))
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if record is None:
        return None, "none"

    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    if record.date == today:
        freshness = "today"
    elif record.date == yesterday:
        freshness = "yesterday"
    else:
        freshness = "stale"

    return record, freshness


# ═══════════════════════════════════════════
# GET BY DATE
# ═══════════════════════════════════════════

async def get_by_date(
    db: AsyncSession,
    user_id: int,
    target_date: date,
) -> Optional[DailyHealthRecord]:
    """
    Fetch the health record for a specific date.

    Args:
        target_date: The calendar date to look up (YYYY-MM-DD).

    Returns:
        DailyHealthRecord or None if no record exists for that date.
    """
    result = await db.execute(
        select(DailyHealthRecord).where(
            and_(
                DailyHealthRecord.user_id == user_id,
                DailyHealthRecord.date == target_date,
            )
        )
    )
    return result.scalar_one_or_none()


# ═══════════════════════════════════════════
# HELPER: SAFE MERGE
# ═══════════════════════════════════════════

def merge_health_data(existing_record: DailyHealthRecord, new_data: dict) -> None:
    """
    Safely merges new health data into an existing record.
    Only updates fields where the new value is NOT None.
    Preserves manual inputs and existing data.
    """
    for field, value in new_data.items():
        if field in UPDATABLE_FIELDS and value is not None:
            setattr(existing_record, field, value)

# ═══════════════════════════════════════════
# DAILY HEALTH CRUD
# ═══════════════════════════════════════════

async def get_history(
    db: AsyncSession,
    user_id: int,
    days: int = 7,
) -> List[DailyHealthRecord]:
    """
    Fetch the last N days of health records, ordered newest first.

    Args:
        days: Number of days to look back (default 7).

    Returns:
        List of DailyHealthRecord instances (may be fewer than `days`
        if user didn't log every day).
    """
    since = datetime.now(timezone.utc).date() - timedelta(days=days)

    result = await db.execute(
        select(DailyHealthRecord)
        .where(
            and_(
                DailyHealthRecord.user_id == user_id,
                DailyHealthRecord.date >= since,
            )
        )
        .order_by(desc(DailyHealthRecord.date))
    )
    return list(result.scalars().all())


# ═══════════════════════════════════════════
# GET TRENDS
# ═══════════════════════════════════════════

async def get_trends(
    db: AsyncSession,
    user_id: int,
    days: int = 7,
) -> DailyHealthTrendsResponse:
    """
    Compute trend analysis over a period of days.

    Splits the period into two halves and compares averages
    to determine if a metric is improving, declining, or stable.
    """
    records = await get_history(db, user_id, days)

    if not records:
        return DailyHealthTrendsResponse(
            period_days=days,
            record_count=0,
        )

    # ── Calculate averages ──────────────────────
    sleep_vals = [r.sleep_hours for r in records if r.sleep_hours is not None]
    step_vals = [r.steps for r in records if r.steps is not None]
    hr_vals = [r.heart_rate for r in records if r.heart_rate is not None]
    sys_vals = [r.bp_systolic for r in records if r.bp_systolic is not None]
    dia_vals = [r.bp_diastolic for r in records if r.bp_diastolic is not None]
    o2_vals = [r.oxygen_level for r in records if r.oxygen_level is not None]
    stress_vals = [r.stress_level for r in records if r.stress_level is not None]

    def _avg(vals: list) -> Optional[float]:
        return round(sum(vals) / len(vals), 1) if vals else None

    def _avg_int(vals: list) -> Optional[int]:
        return int(sum(vals) / len(vals)) if vals else None

    # ── Calculate trends (first half vs second half) ──
    # Records are newest-first, so first half = recent, second half = older
    def _trend(vals: list, higher_is_better: bool = True) -> str:
        if len(vals) < 3:
            return "insufficient_data"
        mid = len(vals) // 2
        recent_avg = sum(vals[:mid]) / mid
        older_avg = sum(vals[mid:]) / len(vals[mid:])
        diff_pct = ((recent_avg - older_avg) / older_avg * 100) if older_avg else 0

        if abs(diff_pct) < 5:
            return "stable"
        if higher_is_better:
            return "improving" if diff_pct > 0 else "declining"
        else:
            return "declining" if diff_pct > 0 else "improving"

    return DailyHealthTrendsResponse(
        period_days=days,
        record_count=len(records),
        avg_sleep=_avg(sleep_vals),
        avg_steps=_avg_int(step_vals),
        avg_heart_rate=_avg_int(hr_vals),
        avg_bp_systolic=_avg_int(sys_vals),
        avg_bp_diastolic=_avg_int(dia_vals),
        avg_oxygen=_avg(o2_vals),
        avg_stress=_avg(stress_vals),
        sleep_trend=_trend(sleep_vals, higher_is_better=True),
        steps_trend=_trend(step_vals, higher_is_better=True),
        # For heart rate, lower resting HR is generally better
        heart_rate_trend=_trend(hr_vals, higher_is_better=False),
    )


# ═══════════════════════════════════════════
# SERIALIZATION HELPERS
# ═══════════════════════════════════════════

def serialize_record(
    record: DailyHealthRecord,
    freshness: str = "today",
) -> dict:
    """Convert a DailyHealthRecord to a dict matching DailyHealthRecordResponse."""
    return {
        "id": record.id,
        "user_id": record.user_id,
        "date": str(record.date),
        "steps": record.steps,
        "sleep_hours": record.sleep_hours,
        "bp_systolic": record.bp_systolic,
        "bp_diastolic": record.bp_diastolic,
        "heart_rate": record.heart_rate,
        "weight": record.weight,
        "oxygen_level": record.oxygen_level,
        "stress_level": record.stress_level,
        "body_temperature": record.body_temperature,
        "notes": record.notes,
        "created_at": str(record.created_at),
        "updated_at": str(record.updated_at),
        "data_freshness": freshness,
    }


# ═══════════════════════════════════════════
# CACHE INVALIDATION
# ═══════════════════════════════════════════

async def _invalidate_cache(user_id: int) -> None:
    """Clear all daily-health-related cache entries for a user."""
    try:
        await cache.delete(cache_key("daily_latest", user_id))
        await cache.delete(cache_key("daily_history", user_id))
        await cache.delete(cache_key("daily_trends", user_id))
        # Also invalidate existing health caches so dashboard picks up new data
        await cache.delete_pattern(f"health_summary:{user_id}*")
        for prefix in ["risk_score", "insights", "alerts", "habits"]:
            await cache.delete(cache_key(prefix, user_id))
    except Exception as e:
        logger.warning(f"Cache invalidation failed: {e}")


