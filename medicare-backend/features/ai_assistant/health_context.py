"""
health_context.py
──────────────────
Builds a rich health context snapshot from the user's database records.
This is injected into Gemini's system prompt so the AI knows the
user's actual health status.
"""

import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_

from features.health.models import (
    HealthMonitoring,
    ActivityTracking,
    BMIHistory,
    MedicationReminder,
    Alert,
    DiseasePrediction,
)
from features.auth.models import User
from features.ai_assistant.schemas import HealthContextSummary

logger = logging.getLogger(__name__)


async def build_health_context(
    db: AsyncSession,
    user: User,
) -> HealthContextSummary:
    """Pull real health data for this user and build a context object for Gemini."""
    since = datetime.now(timezone.utc) - timedelta(days=30)

    # ── Priority 1: Try daily health records (new time-series system) ──
    daily_vitals = None
    data_freshness = "none"
    try:
        from features.health.daily_health_service import get_latest as get_daily_latest
        daily_record, data_freshness = await get_daily_latest(db, user.id)
        if daily_record is not None:
            daily_vitals = daily_record
    except Exception as e:
        logger.warning(f"Daily health record lookup failed: {e}")

    # ── Priority 2: Fallback to legacy HealthMonitoring ──────────────
    latest_vitals = None
    if daily_vitals is None:
        vitals_result = await db.execute(
            select(HealthMonitoring)
            .where(HealthMonitoring.user_id == user.id)
            .order_by(desc(HealthMonitoring.created_at))
            .limit(1)
        )
        latest_vitals = vitals_result.scalar_one_or_none()
        if latest_vitals:
            data_freshness = "legacy"

    # ── Latest activity ──────────────────
    act_result = await db.execute(
        select(ActivityTracking)
        .where(ActivityTracking.user_id == user.id)
        .order_by(desc(ActivityTracking.created_at))
        .limit(1)
    )
    latest_act = act_result.scalar_one_or_none()

    # ── Latest BMI ───────────────────────
    bmi_result = await db.execute(
        select(BMIHistory)
        .where(BMIHistory.user_id == user.id)
        .order_by(desc(BMIHistory.created_at))
        .limit(1)
    )
    latest_bmi = bmi_result.scalar_one_or_none()

    # ── Latest prediction ────────────────
    pred_result = await db.execute(
        select(DiseasePrediction)
        .where(DiseasePrediction.user_id == user.id)
        .order_by(desc(DiseasePrediction.created_at))
        .limit(1)
    )
    latest_pred = pred_result.scalar_one_or_none()

    # ── Active alerts count ──────────────
    alert_result = await db.execute(
        select(func.count()).where(
            and_(
                Alert.user_id == user.id,
                Alert.is_read == False,  # noqa: E712
            )
        )
    )
    alert_count = alert_result.scalar() or 0

    # ── Active medications ───────────────
    med_result = await db.execute(
        select(MedicationReminder.medicine_name)
        .where(
            and_(
                MedicationReminder.user_id == user.id,
                MedicationReminder.is_active == True,  # noqa: E712
            )
        )
        .limit(5)
    )
    meds = [row[0] for row in med_result.fetchall()]

    # ── Days of data ─────────────────────
    count_result = await db.execute(
        select(func.count()).where(
            and_(
                HealthMonitoring.user_id == user.id,
                HealthMonitoring.created_at >= since,
            )
        )
    )
    record_count = count_result.scalar() or 0

    # ── Risk score from latest vitals ────
    risk_score = None
    risk_level = None

    # Determine which source to use for vitals
    effective_sleep = None
    effective_hr = None
    effective_oxygen = None
    effective_stress = None
    effective_steps = None

    if daily_vitals:
        effective_sleep = daily_vitals.sleep_hours
        effective_hr = daily_vitals.heart_rate
        effective_oxygen = daily_vitals.oxygen_level
        effective_stress = float(daily_vitals.stress_level) if daily_vitals.stress_level else None
        effective_steps = daily_vitals.steps
    elif latest_vitals:
        effective_sleep = latest_vitals.sleep_hours
        effective_hr = latest_vitals.heart_rate
        effective_oxygen = latest_vitals.oxygen_level
        effective_stress = float(latest_vitals.stress_level) if latest_vitals.stress_level else None

    has_vitals = any(v is not None for v in [effective_sleep, effective_hr, effective_oxygen])

    if has_vitals:
        score = 0
        if effective_sleep:
            if effective_sleep < 5:
                score += 25
            elif effective_sleep < 7:
                score += 10
        if effective_hr:
            if effective_hr > 100 or effective_hr < 50:
                score += 20
        if effective_oxygen:
            if effective_oxygen < 95:
                score += 20
        if effective_stress:
            if effective_stress >= 8:
                score += 15
        risk_score = min(score, 100)
        if risk_score >= 70:
            risk_level = "Critical"
        elif risk_score >= 50:
            risk_level = "High"
        elif risk_score >= 30:
            risk_level = "Moderate"
        else:
            risk_level = "Low"

    def _bmi_cat(bmi: float) -> str:
        if bmi < 18.5:
            return "Underweight"
        if bmi < 25.0:
            return "Normal"
        if bmi < 30.0:
            return "Overweight"
        return "Obese"

    return HealthContextSummary(
        has_data=has_vitals or (latest_act is not None) or (latest_bmi is not None),
        latest_sleep=effective_sleep,
        latest_heart_rate=effective_hr,
        latest_stress=effective_stress,
        latest_oxygen=effective_oxygen,
        latest_steps=effective_steps or (latest_act.steps if latest_act else None),
        latest_bmi=latest_bmi.bmi if latest_bmi else None,
        bmi_category=(
            _bmi_cat(latest_bmi.bmi) if latest_bmi else None
        ),
        risk_level=risk_level,
        risk_score=risk_score,
        last_prediction=(
            latest_pred.predicted_disease if latest_pred else None
        ),
        prediction_confidence=(
            latest_pred.confidence if latest_pred else None
        ),
        active_alerts=alert_count,
        medications=meds,
        days_of_data=record_count,
    )


def format_context_for_prompt(
    ctx: HealthContextSummary,
    user: User,
) -> str:
    """Format the health context as a clean text block for Gemini's system prompt."""
    lines = [
        "USER HEALTH PROFILE:",
        f"Name: {user.username}",
        f"Email: {user.email}",
    ]

    if user.gender:
        lines.append(f"Gender: {user.gender}")
    if user.height:
        lines.append(f"Height: {user.height} cm")
    if user.weight:
        lines.append(f"Weight: {user.weight} kg")

    if ctx.has_data:
        freshness_note = ""
        lines.append(f"\nLATEST HEALTH METRICS:{freshness_note}")
        if ctx.latest_sleep is not None:
            tag = " (LOW - needs attention)" if ctx.latest_sleep < 6 else ""
            lines.append(f"- Sleep: {ctx.latest_sleep:.1f} hours{tag}")
        if ctx.latest_heart_rate:
            hr = ctx.latest_heart_rate
            status = ""
            if hr > 100 or hr < 50:
                status = " (ABNORMAL)"
            elif hr > 90:
                status = " (Elevated)"
            lines.append(f"- Heart Rate: {hr} bpm{status}")
        if ctx.latest_oxygen:
            o2 = ctx.latest_oxygen
            status = " (LOW - seek help)" if o2 < 95 else ""
            lines.append(f"- Oxygen Saturation: {o2:.1f}%{status}")
        if ctx.latest_stress is not None:
            stress = ctx.latest_stress
            status = " (HIGH STRESS)" if stress >= 7 else ""
            lines.append(f"- Stress Level: {stress:.0f}/10{status}")
        if ctx.latest_steps:
            tag = " (LOW activity)" if ctx.latest_steps < 5000 else ""
            lines.append(f"- Daily Steps: {ctx.latest_steps:,}{tag}")
        if ctx.latest_bmi:
            lines.append(f"- BMI: {ctx.latest_bmi:.1f} ({ctx.bmi_category})")
    else:
        lines.append("\nNo health data logged yet.")

    if ctx.risk_level:
        lines.append(
            f"\nCURRENT HEALTH RISK: {ctx.risk_level} "
            f"(Score: {ctx.risk_score:.0f}/100)"
        )

    if ctx.last_prediction:
        lines.append(
            f"\nLAST AI PREDICTION: {ctx.last_prediction} "
            f"({ctx.prediction_confidence:.1f}% confidence)"
        )

    if ctx.active_alerts > 0:
        lines.append(f"\nACTIVE HEALTH ALERTS: {ctx.active_alerts} unread")

    if ctx.medications:
        lines.append(f"\nCURRENT MEDICATIONS: " + ", ".join(ctx.medications))

    return "\n".join(lines)
