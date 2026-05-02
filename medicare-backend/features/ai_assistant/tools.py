"""
tools.py
─────────────────────────────────────────────
Internal tool layer for the AI assistant.
All tools strictly require `user_id` to guarantee data segregation.
Chat controller MUST use these tools instead of direct service calls.
"""

import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# ── Tool 1: Predict ────────────────────────────────────────────────────────

def predict_tool(
    user_id: int,
    symptoms: List[str],
    country_code: Optional[str] = None,
    profile: Optional[dict] = None,
) -> dict:
    """
    Synchronous wrapper around prediction service.
    Requires user_id for strict logging and validation.
    """
    if not user_id:
        return {"error": "user_id is required"}
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
        logger.error(f"predict_tool error (user={user_id}): {e}")
        return {"error": str(e)}

# ── Tool 2: Get Health Data ────────────────────────────────────────────────

async def get_health_data(db: AsyncSession, user_id: int) -> dict:
    """
    Fetch the user's latest health data strictly through the daily health service.
    """
    if not user_id:
        return {"error": "user_id is required"}

    data = {
        "sleep": None, "heart_rate": None, "oxygen": None,
        "stress": None, "steps": None, "bmi": None,
        "weight": None, "height": None, "bp_systolic": None,
        "bp_diastolic": None, "data_freshness": "none",
    }

    try:
        from features.health.daily_health_service import get_latest
        daily_record, freshness = await get_latest(db, user_id)

        if daily_record is not None:
            data["data_freshness"] = freshness
            data["sleep"] = daily_record.sleep_hours
            data["heart_rate"] = daily_record.heart_rate
            data["oxygen"] = daily_record.oxygen_level
            data["stress"] = float(daily_record.stress_level) if daily_record.stress_level else None
            data["steps"] = daily_record.steps
            data["weight"] = daily_record.weight
            data["bp_systolic"] = daily_record.bp_systolic
            data["bp_diastolic"] = daily_record.bp_diastolic

        # Also get BMI (not stored in daily records)
        from sqlalchemy import select, desc
        from features.health.models import BMIHistory
        bmi_result = await db.execute(
            select(BMIHistory).where(BMIHistory.user_id == user_id)
            .order_by(desc(BMIHistory.created_at)).limit(1)
        )
        bmi_row = bmi_result.scalar_one_or_none()
        if bmi_row:
            data["bmi"] = bmi_row.bmi
            if data["weight"] is None:
                data["weight"] = bmi_row.weight
            data["height"] = bmi_row.height

    except Exception as e:
        logger.error(f"get_health_data error (user={user_id}): {e}")

    return data

# ── Tool 3: Update Health Data ─────────────────────────────────────────────

async def update_health_data(
    db: AsyncSession,
    user_id: int,
    data: dict,
) -> bool:
    """
    Safely update today's health record.
    """
    if not user_id:
        return False

    if not data:
        return True

    try:
        from features.health.daily_health_service import add_or_update_today
        await add_or_update_today(db, user_id, data)
        return True
    except Exception as e:
        logger.error(f"update_health_data error (user={user_id}): {e}")
        return False
