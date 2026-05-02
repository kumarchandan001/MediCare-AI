"""
features/google_fit/sync_engine.py
──────────────────────────────────────────
Fetches data from Google Fit REST API and maps to MediCare AI DB tables.

Data type → DB field mappings:
  step_count.delta     → activity_tracking.steps
  heart_rate.bpm       → health_monitoring.heart_rate
  sleep.segment        → health_monitoring.sleep_hours
  calories.expended    → activity_tracking.calories_burned
  active_minutes       → activity_tracking.duration_minutes
  distance.delta       → activity_tracking.distance (÷1000)
  weight               → bmi_history.weight, users.weight
  height               → bmi_history.height (×100 for cm)
  oxygen_saturation    → health_monitoring.oxygen_level
  blood_glucose        → health_monitoring.glucose_level
  blood_pressure       → health_monitoring.blood_pressure
  body.temperature     → health_monitoring.body_temperature
"""

import json
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from features.auth.models import User
from features.health.models import HealthMonitoring, ActivityTracking, BMIHistory
from features.google_fit.models import GoogleFitSync
from features.google_fit.service import get_valid_access_token
from core.cache import cache, cache_key

log = logging.getLogger(__name__)

GOOGLE_FIT_API = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"

SLEEP_TYPE_ALL = {2, 3, 4, 5, 6}  # 1=awake (skip), 2-6=sleep stages


# ── Low-level API caller ──────────────────

async def _fetch_google_fit(
    access_token: str,
    data_type_names: List[str],
    start_dt: datetime,
    end_dt: datetime,
    bucket_duration_ms: int = 86_400_000,
) -> dict:
    """Call Google Fit aggregate API. Returns raw JSON."""
    start_ms = int(start_dt.timestamp() * 1000)
    end_ms = int(end_dt.timestamp() * 1000)

    body = {
        "aggregateBy": [{"dataTypeName": dt} for dt in data_type_names],
        "bucketByTime": {"durationMillis": bucket_duration_ms},
        "startTimeMillis": start_ms,
        "endTimeMillis": end_ms,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_FIT_API,
            json=body,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        if resp.status_code == 401:
            raise PermissionError("Google Fit token expired or invalid")
        resp.raise_for_status()
        return resp.json()


# ── Data extractors ───────────────────────

def _extract_int_point(dataset: dict) -> Optional[int]:
    for point in dataset.get("point", []):
        for val in point.get("value", []):
            if "intVal" in val:
                return val["intVal"]
            if "fpVal" in val and not math.isnan(val["fpVal"]):
                return int(val["fpVal"])
    return None


def _extract_float_point(dataset: dict) -> Optional[float]:
    for point in dataset.get("point", []):
        for val in point.get("value", []):
            if "fpVal" in val and not math.isnan(val["fpVal"]):
                return round(float(val["fpVal"]), 2)
    return None


def _extract_avg_float(dataset: dict) -> Optional[float]:
    values = []
    for point in dataset.get("point", []):
        for val in point.get("value", []):
            if "fpVal" in val and not math.isnan(val["fpVal"]):
                values.append(val["fpVal"])
    return round(sum(values) / len(values), 2) if values else None


def _extract_sleep_hours(dataset: dict) -> Optional[float]:
    total_ms = 0
    for point in dataset.get("point", []):
        start = int(point.get("startTimeNanos", 0)) // 1_000_000
        end = int(point.get("endTimeNanos", 0)) // 1_000_000
        for val in point.get("value", []):
            if val.get("intVal", 1) in SLEEP_TYPE_ALL:
                total_ms += (end - start)
    return round(total_ms / 3_600_000, 2) if total_ms > 0 else None


def _extract_blood_pressure(dataset: dict) -> Optional[dict]:
    for point in dataset.get("point", []):
        vals = point.get("value", [])
        if len(vals) >= 2:
            s = vals[0].get("fpVal")
            d = vals[1].get("fpVal")
            if s and d:
                return {"systolic": int(s), "diastolic": int(d)}
    return None


# ── Per-day bucket processor ──────────────

def _process_bucket(bucket: dict) -> dict:
    start_ms = int(bucket.get("startTimeMillis", 0))
    bucket_date = datetime.fromtimestamp(start_ms / 1000, tz=timezone.utc)

    data: Dict[str, Any] = {
        "date": bucket_date,
        "steps": None, "heart_rate": None, "sleep_hours": None,
        "calories_burned": None, "active_minutes": None,
        "distance_km": None, "weight_kg": None, "height_cm": None,
        "oxygen_level": None, "glucose_level": None,
        "blood_pressure": None, "body_temperature": None,
    }

    for ds in bucket.get("dataset", []):
        dt_name = ds.get("dataSourceId", "")

        if "step_count" in dt_name:
            data["steps"] = _extract_int_point(ds)
        elif "heart_rate" in dt_name:
            data["heart_rate"] = _extract_avg_float(ds)
        elif "sleep" in dt_name:
            data["sleep_hours"] = _extract_sleep_hours(ds)
        elif "calories.expended" in dt_name:
            v = _extract_float_point(ds)
            if v:
                data["calories_burned"] = int(v)
        elif "active_minutes" in dt_name:
            data["active_minutes"] = _extract_int_point(ds)
        elif "distance" in dt_name:
            v = _extract_float_point(ds)
            if v:
                data["distance_km"] = round(v / 1000, 2)
        elif "weight" in dt_name:
            data["weight_kg"] = _extract_float_point(ds)
        elif "height" in dt_name:
            v = _extract_float_point(ds)
            if v:
                data["height_cm"] = round(v * 100, 1)
        elif "oxygen_saturation" in dt_name:
            v = _extract_avg_float(ds)
            if v:
                data["oxygen_level"] = round(v * 100, 1)
        elif "blood_glucose" in dt_name:
            v = _extract_float_point(ds)
            if v:
                data["glucose_level"] = round(v * 18.0, 1)
        elif "blood_pressure" in dt_name:
            data["blood_pressure"] = _extract_blood_pressure(ds)
        elif "body.temperature" in dt_name:
            data["body_temperature"] = _extract_float_point(ds)

    return data


# ── DB writers ────────────────────────────

async def _upsert_health_monitoring(
    db: AsyncSession, user_id: int, day_data: dict
) -> bool:
    has_data = any(
        day_data.get(k) is not None
        for k in ["heart_rate", "sleep_hours", "oxygen_level",
                   "glucose_level", "blood_pressure", "body_temperature"]
    )
    if not has_data:
        return False

    day = day_data["date"].date()
    day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
    day_end = datetime.combine(day, datetime.max.time()).replace(tzinfo=timezone.utc)

    existing = await db.scalar(
        select(HealthMonitoring).where(
            and_(
                HealthMonitoring.user_id == user_id,
                HealthMonitoring.created_at >= day_start,
                HealthMonitoring.created_at <= day_end,
                HealthMonitoring.data_source == "google_fit",
            )
        ).limit(1)
    )

    bp = day_data.get("blood_pressure")
    bp_json = json.dumps(bp) if bp else None

    if existing:
        if day_data.get("heart_rate"):
            existing.heart_rate = int(day_data["heart_rate"])
        if day_data.get("sleep_hours"):
            existing.sleep_hours = day_data["sleep_hours"]
        if day_data.get("oxygen_level"):
            existing.oxygen_level = int(day_data["oxygen_level"])
        if day_data.get("glucose_level"):
            existing.glucose_level = day_data["glucose_level"]
        if bp_json:
            existing.blood_pressure = bp_json
        if day_data.get("body_temperature"):
            existing.body_temperature = day_data["body_temperature"]
    else:
        record = HealthMonitoring(
            user_id=user_id,
            heart_rate=int(day_data["heart_rate"]) if day_data.get("heart_rate") else None,
            sleep_hours=day_data.get("sleep_hours"),
            oxygen_level=int(day_data["oxygen_level"]) if day_data.get("oxygen_level") else None,
            glucose_level=day_data.get("glucose_level"),
            blood_pressure=bp_json,
            body_temperature=day_data.get("body_temperature"),
            data_source="google_fit",
            notes="Auto-synced from Google Fit",
            created_at=day_data["date"],
        )
        db.add(record)

    return True


async def _upsert_activity(
    db: AsyncSession, user_id: int, day_data: dict
) -> bool:
    has_data = any(
        day_data.get(k) is not None
        for k in ["steps", "calories_burned", "active_minutes", "distance_km"]
    )
    if not has_data:
        return False

    day = day_data["date"].date()
    day_start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
    day_end = datetime.combine(day, datetime.max.time()).replace(tzinfo=timezone.utc)

    existing = await db.scalar(
        select(ActivityTracking).where(
            and_(
                ActivityTracking.user_id == user_id,
                ActivityTracking.created_at >= day_start,
                ActivityTracking.created_at <= day_end,
                ActivityTracking.data_source == "google_fit",
            )
        ).limit(1)
    )

    if existing:
        if day_data.get("steps"):
            existing.steps = day_data["steps"]
        if day_data.get("calories_burned"):
            existing.calories_burned = day_data["calories_burned"]
        if day_data.get("active_minutes"):
            existing.duration_minutes = day_data["active_minutes"]
        if day_data.get("distance_km"):
            existing.distance = day_data["distance_km"]
        if day_data.get("heart_rate"):
            existing.heart_rate_avg = int(day_data["heart_rate"])
    else:
        activity = ActivityTracking(
            user_id=user_id,
            activity_type="Daily Activity",
            steps=day_data.get("steps"),
            calories_burned=day_data.get("calories_burned"),
            duration_minutes=day_data.get("active_minutes") or 0,
            distance=day_data.get("distance_km"),
            heart_rate_avg=int(day_data["heart_rate"]) if day_data.get("heart_rate") else None,
            data_source="google_fit",
            notes="Auto-synced from Google Fit",
        )
        db.add(activity)

    return True


async def _upsert_bmi(
    db: AsyncSession, user_id: int, day_data: dict
) -> bool:
    weight = day_data.get("weight_kg")
    height = day_data.get("height_cm")
    if not weight:
        return False

    if not height:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user and user.height:
            height = user.height

    if not height:
        return False

    height_m = height / 100
    bmi = round(weight / (height_m ** 2), 1)
    bmi_cat = (
        "Underweight" if bmi < 18.5 else
        "Normal" if bmi < 25.0 else
        "Overweight" if bmi < 30.0 else
        "Obese"
    )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user:
        user.weight = weight
        if height:
            user.height = height

    bmi_record = BMIHistory(
        user_id=user_id,
        height=height,
        weight=weight,
        bmi=bmi,
        bmi_category=bmi_cat,
        notes="Synced from Google Fit",
    )
    db.add(bmi_record)
    return True


# ── Main sync function ────────────────────

ALL_DATA_TYPES = [
    "com.google.step_count.delta",
    "com.google.heart_rate.bpm",
    "com.google.sleep.segment",
    "com.google.calories.expended",
    "com.google.active_minutes",
    "com.google.weight",
    "com.google.height",
    "com.google.oxygen_saturation",
    "com.google.blood_glucose",
    "com.google.blood_pressure",
    "com.google.body.temperature",
]


async def run_sync(
    db: AsyncSession,
    user_id: int,
    days_back: int = 1,
    sync_type: str = "manual",
) -> dict:
    """
    Main sync function. Fetches last N days from Google Fit and saves to DB.
    """
    log.info(f"Starting Google Fit sync for user {user_id} ({sync_type}, {days_back} days)")

    sync_log = GoogleFitSync(
        user_id=user_id,
        sync_type=sync_type,
        status="running",
        date_range_from=datetime.now(timezone.utc) - timedelta(days=days_back),
        date_range_to=datetime.now(timezone.utc),
    )
    db.add(sync_log)
    await db.flush()

    try:
        token = await get_valid_access_token(db, user_id)
        if not token:
            raise PermissionError("User is not connected to Google Fit")

        end_dt = datetime.now(timezone.utc)
        start_dt = end_dt - timedelta(days=days_back)

        raw = await _fetch_google_fit(
            access_token=token,
            data_type_names=ALL_DATA_TYPES,
            start_dt=start_dt,
            end_dt=end_dt,
        )

        buckets = raw.get("bucket", [])
        log.info(f"Processing {len(buckets)} day buckets")

        vitals_count = 0
        activities_count = 0
        bmi_count = 0
        total_steps = 0
        hr_values: List[float] = []

        for bucket in buckets:
            day_data = _process_bucket(bucket)
            has_any = any(v is not None for k, v in day_data.items() if k != "date")
            if not has_any:
                continue

            if await _upsert_health_monitoring(db, user_id, day_data):
                vitals_count += 1
                if day_data.get("heart_rate"):
                    hr_values.append(day_data["heart_rate"])

            if await _upsert_activity(db, user_id, day_data):
                activities_count += 1
                if day_data.get("steps"):
                    total_steps += day_data["steps"]

            if await _upsert_bmi(db, user_id, day_data):
                bmi_count += 1

        await db.commit()

        # Update user last sync timestamp
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.google_fit_last_sync = datetime.now(timezone.utc)
            await db.commit()

        # Invalidate health caches so dashboard updates immediately
        try:
            await cache.delete_pattern(f"health_summary:{user_id}*")
            for prefix in ["risk_score", "insights", "alerts", "habits", "daily_latest", "daily_history", "daily_trends"]:
                await cache.delete(cache_key(prefix, user_id))
        except Exception as e:
            log.warning(f"Cache invalidation failed after sync: {e}")

        avg_hr = round(sum(hr_values) / len(hr_values), 1) if hr_values else None
        summary = {
            "vitals_synced": vitals_count,
            "activities_synced": activities_count,
            "weight_synced": bmi_count,
            "total_steps": total_steps,
            "avg_heart_rate": avg_hr,
            "days_processed": len(buckets),
        }

        sync_log.status = "success"
        sync_log.completed_at = datetime.now(timezone.utc)
        sync_log.vitals_synced = vitals_count
        sync_log.activities_synced = activities_count
        sync_log.weight_records = bmi_count
        sync_log.total_steps = total_steps
        sync_log.avg_heart_rate = avg_hr
        sync_log.sync_summary = json.dumps(summary)
        await db.commit()

        log.info(f"Sync complete for user {user_id}: {summary}")
        return summary

    except Exception as e:
        log.error(f"Sync failed for user {user_id}: {e}")
        sync_log.status = "failed"
        sync_log.completed_at = datetime.now(timezone.utc)
        sync_log.error_message = str(e)
        await db.commit()
        raise
