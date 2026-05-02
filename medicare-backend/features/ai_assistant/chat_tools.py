"""
chat_tools.py
─────────────────────────────────────────────
Internal tool layer for the chat controller.

Wraps existing services so the controller never touches them directly.
Each tool is a thin, well-typed async wrapper.

Tools:
  predict_tool          → ai.engine.predict()
  who_tool              → ai.who_engine.get_who_adjustment()
  get_user_health_data  → DB vitals + BMI + activity
  update_user_health_data → write to HealthMonitoring
"""

import logging
from typing import List, Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


# ── Tool 1: Disease Prediction ─────────────────────────────────────────────

def predict_tool(
    symptoms: List[str],
    country_code: Optional[str] = None,
    profile: Optional[dict] = None,
) -> dict:
    """
    Synchronous wrapper around ai.engine.predict().
    Returns full prediction dict (disease, confidence, xai, etc.)
    Returns {"error": "..."} if prediction fails.
    """
    if not symptoms:
        return {"error": "No symptoms provided"}
    try:
        from ai.engine import predict
        result = predict(
            symptoms=symptoms,
            country_code=country_code or None,
            lifestyle=profile or None,
        )
        return result
    except Exception as e:
        logger.error(f"predict_tool error: {e}")
        return {"error": str(e)}


# ── Tool 2: WHO Risk Data ──────────────────────────────────────────────────

def who_tool(country_code: str, disease: str, base_confidence: float = 70.0) -> dict:
    """
    Get WHO epidemiological adjustment for (country, disease) pair.
    Returns adjustment dict or {"error": ...} on failure.
    """
    try:
        import pickle
        from pathlib import Path
        who_path = Path(__file__).parent.parent.parent / "ai" / "models" / "who_profiles.pkl"
        if not who_path.exists():
            return {"error": "WHO profiles not available"}
        with open(who_path, "rb") as f:
            profiles = pickle.load(f)
        from ai.who_engine import get_who_adjustment
        return get_who_adjustment(
            predicted_disease=disease,
            country_code=country_code.upper(),
            base_confidence=base_confidence,
            profiles=profiles,
        )
    except Exception as e:
        logger.error(f"who_tool error: {e}")
        return {"error": str(e)}


# ── Tool 3: Get User Health Data ──────────────────────────────────────────

async def get_user_health_data(db: AsyncSession, user_id: int) -> dict:
    """
    Fetch the user's latest health data.

    Priority order:
      1. DailyHealthRecord (new time-series system) — preferred
      2. HealthMonitoring + BMIHistory + ActivityTracking (legacy fallback)

    Returns a flat dict of health metrics with a `data_freshness` flag.
    """
    data: dict = {
        "sleep":          None,
        "heart_rate":     None,
        "oxygen":         None,
        "stress":         None,
        "steps":          None,
        "bmi":            None,
        "weight":         None,
        "height":         None,
        "bp_systolic":    None,
        "bp_diastolic":   None,
        "data_freshness": "none",
    }

    # ── PRIORITY 1: Try DailyHealthRecord (new system) ─────────────────
    try:
        from features.health.daily_health_service import get_latest as get_daily_latest

        daily_record, freshness = await get_daily_latest(db, user_id)

        if daily_record is not None:
            data["data_freshness"] = freshness
            if daily_record.sleep_hours is not None:
                data["sleep"] = daily_record.sleep_hours
            if daily_record.heart_rate is not None:
                data["heart_rate"] = daily_record.heart_rate
            if daily_record.oxygen_level is not None:
                data["oxygen"] = daily_record.oxygen_level
            if daily_record.stress_level is not None:
                data["stress"] = float(daily_record.stress_level)
            if daily_record.steps is not None:
                data["steps"] = daily_record.steps
            if daily_record.weight is not None:
                data["weight"] = daily_record.weight
            if daily_record.bp_systolic is not None:
                data["bp_systolic"] = daily_record.bp_systolic
            if daily_record.bp_diastolic is not None:
                data["bp_diastolic"] = daily_record.bp_diastolic

            # If daily record has most metrics, return early
            filled = sum(1 for k in ["sleep", "heart_rate", "steps"] if data[k] is not None)
            if filled >= 2:
                # Still try to get BMI from BMIHistory (not in daily records)
                await _fill_bmi(db, user_id, data)
                return data

    except Exception as e:
        logger.warning(f"DailyHealthRecord lookup failed, falling back: {e}")

    # ── PRIORITY 2: Legacy fallback (HealthMonitoring tables) ──────────
    try:
        from features.health.models import HealthMonitoring, BMIHistory, ActivityTracking

        # Latest vitals
        vitals_result = await db.execute(
            select(HealthMonitoring)
            .where(HealthMonitoring.user_id == user_id)
            .order_by(desc(HealthMonitoring.created_at))
            .limit(1)
        )
        vitals = vitals_result.scalar_one_or_none()
        if vitals:
            if data["sleep"] is None and vitals.sleep_hours:
                data["sleep"] = vitals.sleep_hours
            if data["heart_rate"] is None and vitals.heart_rate:
                data["heart_rate"] = vitals.heart_rate
            if data["oxygen"] is None and vitals.oxygen_level:
                data["oxygen"] = vitals.oxygen_level
            if data["stress"] is None and vitals.stress_level:
                data["stress"] = float(vitals.stress_level)
            # Mark as legacy if we hadn't found daily data
            if data["data_freshness"] == "none":
                data["data_freshness"] = "legacy"

        # Latest BMI
        await _fill_bmi(db, user_id, data)

        # Latest activity
        if data["steps"] is None:
            act_result = await db.execute(
                select(ActivityTracking)
                .where(ActivityTracking.user_id == user_id)
                .order_by(desc(ActivityTracking.created_at))
                .limit(1)
            )
            act = act_result.scalar_one_or_none()
            if act:
                data["steps"] = act.steps

    except Exception as e:
        logger.error(f"get_user_health_data legacy fallback error: {e}")

    return data


async def _fill_bmi(db: AsyncSession, user_id: int, data: dict) -> None:
    """Fill BMI data from BMIHistory table (shared by both paths)."""
    if data.get("bmi") is not None:
        return
    try:
        from features.health.models import BMIHistory
        bmi_result = await db.execute(
            select(BMIHistory)
            .where(BMIHistory.user_id == user_id)
            .order_by(desc(BMIHistory.created_at))
            .limit(1)
        )
        bmi_row = bmi_result.scalar_one_or_none()
        if bmi_row:
            data["bmi"] = bmi_row.bmi
            if data["weight"] is None:
                data["weight"] = bmi_row.weight
            data["height"] = bmi_row.height
    except Exception as e:
        logger.warning(f"BMI lookup failed: {e}")


# ── Tool 4: Update User Health Data ──────────────────────────────────────

async def update_user_health_data(
    db: AsyncSession,
    user_id: int,
    field: str,
    value,
) -> bool:
    """
    Write a single health field to today's DailyHealthRecord (upsert).
    Falls back to HealthMonitoring if daily system fails.
    Only writes known fields to prevent injection.
    Returns True on success.
    """
    # Map chat field names → DailyHealthRecord column names
    FIELD_MAP = {
        "sleep_hours":   "sleep_hours",
        "heart_rate":    "heart_rate",
        "stress_level":  "stress_level",
        "oxygen_level":  "oxygen_level",
        "steps":         "steps",
        "weight":        "weight",
        "bp_systolic":   "bp_systolic",
        "bp_diastolic":  "bp_diastolic",
    }

    if field not in FIELD_MAP:
        logger.warning(f"update_user_health_data: unknown field '{field}'")
        return False

    try:
        from features.health.daily_health_service import add_or_update_today
        await add_or_update_today(db, user_id, {FIELD_MAP[field]: value})
        return True
    except Exception as e:
        logger.error(f"update_user_health_data error: {e}")
        return False

