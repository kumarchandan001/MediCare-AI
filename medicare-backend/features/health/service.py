import logging
from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc

from features.health.models import (
    HealthMonitoring,
    ActivityTracking,
    BMIHistory,
    Alert,
)
from features.health.daily_health_model import DailyHealthRecord
from features.health.schemas import (
    HealthSummaryResponse,
    MetricTrend,
    RiskScoreResponse,
    InsightItem,
    InsightsResponse,
    AlertItem,
    AlertsResponse,
    HabitTip,
    HabitsResponse,
)

logger = logging.getLogger(__name__)


# ── BMI Helper ───────────────────────────
def _bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25.0:
        return "Normal"
    if bmi < 30.0:
        return "Overweight"
    return "Obese"


def _time_ago(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = datetime.now(timezone.utc) - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "just now"
    if seconds < 3600:
        return f"{seconds // 60}m ago"
    if seconds < 86400:
        return f"{seconds // 3600}h ago"
    return f"{seconds // 86400}d ago"


def _trend(current: float, previous: float) -> MetricTrend:
    if previous == 0:
        return MetricTrend(
            direction="flat", value=0, label="No previous data"
        )
    change = current - previous
    pct = abs(round((change / previous) * 100, 1))
    if change > 0:
        return MetricTrend(
            direction="up", value=pct, label=f"+{pct}% vs yesterday"
        )
    if change < 0:
        return MetricTrend(
            direction="down", value=pct, label=f"-{pct}% vs yesterday"
        )
    return MetricTrend(direction="flat", value=0, label="Same as yesterday")


def _safe_dt(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


# ═══════════════════════════════════════════
# HEALTH SUMMARY
# ═══════════════════════════════════════════

async def get_health_summary(
    db: AsyncSession, user_id: int, days: int = 7
) -> HealthSummaryResponse:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Get health records
    result = await db.execute(
        select(HealthMonitoring)
        .where(
            and_(
                HealthMonitoring.user_id == user_id,
                HealthMonitoring.created_at >= since,
            )
        )
        .order_by(desc(HealthMonitoring.created_at))
        .limit(days * 2)
    )
    records = result.scalars().all()

    # Get activity records
    act_result = await db.execute(
        select(ActivityTracking)
        .where(
            and_(
                ActivityTracking.user_id == user_id,
                ActivityTracking.created_at >= since,
            )
        )
        .order_by(desc(ActivityTracking.created_at))
        .limit(days)
    )
    activities = act_result.scalars().all()

    # Get latest BMI
    bmi_result = await db.execute(
        select(BMIHistory)
        .where(BMIHistory.user_id == user_id)
        .order_by(desc(BMIHistory.created_at))
        .limit(1)
    )
    latest_bmi = bmi_result.scalar_one_or_none()

    # Get daily records (NEW SYSTEM)
    daily_result = await db.execute(
        select(DailyHealthRecord)
        .where(
            and_(
                DailyHealthRecord.user_id == user_id,
                DailyHealthRecord.date >= since.date(),
            )
        )
        .order_by(desc(DailyHealthRecord.date))
    )
    daily_records = daily_result.scalars().all()

    # Calculate averages (Merge daily_records + legacy records)
    sleep_vals = [r.sleep_hours for r in daily_records if r.sleep_hours is not None] + [r.sleep_hours for r in records if r.sleep_hours]
    hr_vals = [r.heart_rate for r in daily_records if r.heart_rate is not None] + [r.heart_rate for r in records if r.heart_rate]
    stress_vals = [r.stress_level for r in daily_records if r.stress_level is not None] + [r.stress_level for r in records if r.stress_level]
    oxygen_vals = [r.oxygen_level for r in daily_records if r.oxygen_level is not None] + [r.oxygen_level for r in records if r.oxygen_level]
    step_vals = [r.steps for r in daily_records if r.steps is not None] + [a.steps for a in activities]
    cal_vals = [a.calories_burned for a in activities]

    avg_sleep = round(sum(sleep_vals) / len(sleep_vals), 1) if sleep_vals else 0.0
    avg_hr = int(sum(hr_vals) / len(hr_vals)) if hr_vals else 72
    avg_stress = round(sum(stress_vals) / len(stress_vals), 1) if stress_vals else 5.0
    avg_oxygen = round(sum(oxygen_vals) / len(oxygen_vals), 1) if oxygen_vals else 98.0
    avg_steps = int(sum(step_vals) / len(step_vals)) if step_vals else 0
    avg_cals = int(sum(cal_vals) / len(cal_vals)) if cal_vals else 0
    bmi_val = float(latest_bmi.bmi) if latest_bmi else 0.0

    # Trends
    current_sleep = sleep_vals[0] if sleep_vals else 0
    prev_sleep = sleep_vals[1] if len(sleep_vals) > 1 else 0
    current_steps = step_vals[0] if step_vals else 0
    prev_steps = step_vals[1] if len(step_vals) > 1 else 0

    # Build 7-day chart data
    labels: List[str] = []
    sleep_chart: List[float] = []
    steps_chart: List[int] = []
    hr_chart: List[int] = []
    stress_chart: List[float] = []

    for i in range(days - 1, -1, -1):
        day = datetime.now(timezone.utc) - timedelta(days=i)
        labels.append(day.strftime("%a"))
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Legacy day records
        day_records = [
            r for r in records
            if r.created_at and day_start <= _safe_dt(r.created_at) <= day_end
        ]
        day_activities = [
            a for a in activities
            if a.created_at and day_start <= _safe_dt(a.created_at) <= day_end
        ]

        # New daily records for this exact date
        target_date = day.date()
        daily_for_day = [r for r in daily_records if r.date == target_date]

        day_sleep = [r.sleep_hours for r in daily_for_day if r.sleep_hours is not None] + [r.sleep_hours for r in day_records if r.sleep_hours]
        day_hr = [r.heart_rate for r in daily_for_day if r.heart_rate is not None] + [r.heart_rate for r in day_records if r.heart_rate]
        day_stress = [r.stress_level for r in daily_for_day if r.stress_level is not None] + [r.stress_level for r in day_records if r.stress_level]
        day_steps = [r.steps for r in daily_for_day if r.steps is not None] + [a.steps for a in day_activities if a.steps]

        sleep_chart.append(
            round(sum(day_sleep) / len(day_sleep), 1) if day_sleep else 0.0
        )
        steps_chart.append(sum(day_steps))
        hr_chart.append(
            int(sum(day_hr) / len(day_hr)) if day_hr else 0
        )
        stress_chart.append(
            round(sum(day_stress) / len(day_stress), 1) if day_stress else 0.0
        )

    return HealthSummaryResponse(
        sleep=avg_sleep,
        heart_rate=avg_hr,
        stress=avg_stress,
        oxygen=avg_oxygen,
        steps=avg_steps,
        calories=avg_cals,
        water=1.8,
        bmi=bmi_val,
        bmi_category=_bmi_category(bmi_val),
        sleep_trend=_trend(current_sleep, prev_sleep),
        steps_trend=_trend(current_steps, prev_steps),
        water_trend=MetricTrend(
            direction="flat", value=0, label="Log daily intake"
        ),
        sleep_progress=min((avg_sleep / 8) * 100, 100),
        steps_progress=min((avg_steps / 10000) * 100, 100),
        water_progress=min((1.8 / 3.0) * 100, 100),
        bmi_progress=(
            min(max((bmi_val / 30) * 100, 0), 100) if bmi_val > 0 else 0
        ),
        sleep_history=sleep_chart,
        steps_history=steps_chart,
        hr_history=hr_chart,
        stress_history=stress_chart,
        chart_labels=labels,
        record_count=len(records),
        days=days,
    )


# ═══════════════════════════════════════════
# RISK SCORE ENGINE
# ═══════════════════════════════════════════

async def get_risk_score(
    db: AsyncSession, user_id: int
) -> RiskScoreResponse:
    since = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        select(HealthMonitoring)
        .where(
            and_(
                HealthMonitoring.user_id == user_id,
                HealthMonitoring.created_at >= since,
            )
        )
        .order_by(desc(HealthMonitoring.created_at))
        .limit(7)
    )
    records = result.scalars().all()

    bmi_result = await db.execute(
        select(BMIHistory.bmi)
        .where(BMIHistory.user_id == user_id)
        .order_by(desc(BMIHistory.created_at))
        .limit(1)
    )
    bmi_row = bmi_result.scalar_one_or_none()

    act_result = await db.execute(
        select(func.avg(ActivityTracking.steps))
        .where(
            and_(
                ActivityTracking.user_id == user_id,
                ActivityTracking.created_at >= since,
            )
        )
    )
    avg_steps = float(act_result.scalar() or 0)

    # Get daily records (NEW SYSTEM)
    daily_result = await db.execute(
        select(DailyHealthRecord)
        .where(
            and_(
                DailyHealthRecord.user_id == user_id,
                DailyHealthRecord.date >= since.date(),
            )
        )
    )
    daily_records = daily_result.scalars().all()

    if not records and not daily_records:
        return RiskScoreResponse(
            score=0,
            level="unknown",
            color="muted",
            reasons=["No health data yet. Start logging to see your risk score."],
            factors={},
        )

    sleep_vals = [r.sleep_hours for r in daily_records if r.sleep_hours is not None] + [r.sleep_hours for r in records if r.sleep_hours]
    hr_vals = [r.heart_rate for r in daily_records if r.heart_rate is not None] + [r.heart_rate for r in records if r.heart_rate]
    oxygen_vals = [r.oxygen_level for r in daily_records if r.oxygen_level is not None] + [r.oxygen_level for r in records if r.oxygen_level]
    stress_vals = [r.stress_level for r in daily_records if r.stress_level is not None] + [r.stress_level for r in records if r.stress_level]


    avg_sleep = sum(sleep_vals) / len(sleep_vals) if sleep_vals else 7.0
    avg_hr = sum(hr_vals) / len(hr_vals) if hr_vals else 72
    avg_oxygen = sum(oxygen_vals) / len(oxygen_vals) if oxygen_vals else 98.0
    avg_stress = sum(stress_vals) / len(stress_vals) if stress_vals else 5.0
    bmi_val = float(bmi_row) if bmi_row else 22.0

    score = 0
    reasons: List[str] = []
    factors = {}

    # Sleep risk (0-25)
    if avg_sleep < 5:
        score += 25
        reasons.append(f"Very low sleep ({avg_sleep:.1f}h) — severe health risk")
        factors["sleep"] = "critical"
    elif avg_sleep < 6:
        score += 15
        reasons.append(f"Low sleep ({avg_sleep:.1f}h) — affects recovery")
        factors["sleep"] = "high"
    elif avg_sleep < 7:
        score += 8
        reasons.append(f"Below optimal sleep ({avg_sleep:.1f}h)")
        factors["sleep"] = "moderate"
    else:
        factors["sleep"] = "good"

    # Heart rate risk (0-20)
    if avg_hr > 100 or avg_hr < 50:
        score += 20
        reasons.append(f"Abnormal heart rate ({avg_hr:.0f} bpm)")
        factors["heart_rate"] = "high"
    elif avg_hr > 90 or avg_hr < 55:
        score += 10
        reasons.append(f"Elevated heart rate ({avg_hr:.0f} bpm)")
        factors["heart_rate"] = "moderate"
    else:
        factors["heart_rate"] = "good"

    # Oxygen risk (0-20)
    if avg_oxygen < 90:
        score += 20
        reasons.append(f"Low oxygen ({avg_oxygen:.1f}%) — seek medical help")
        factors["oxygen"] = "critical"
    elif avg_oxygen < 95:
        score += 10
        reasons.append(f"Below normal oxygen ({avg_oxygen:.1f}%)")
        factors["oxygen"] = "moderate"
    else:
        factors["oxygen"] = "good"

    # Stress risk (0-15)
    if avg_stress >= 8:
        score += 15
        reasons.append(f"Very high stress level ({avg_stress:.1f}/10)")
        factors["stress"] = "high"
    elif avg_stress >= 6:
        score += 8
        reasons.append(f"Elevated stress ({avg_stress:.1f}/10)")
        factors["stress"] = "moderate"
    else:
        factors["stress"] = "good"

    # Activity risk (0-10)
    if avg_steps < 2000:
        score += 10
        reasons.append("Very low activity — less than 2,000 steps/day")
        factors["activity"] = "high"
    elif avg_steps < 5000:
        score += 5
        reasons.append("Low activity level — aim for 10,000 steps/day")
        factors["activity"] = "moderate"
    else:
        factors["activity"] = "good"

    # BMI risk (0-10)
    if bmi_val >= 35 or (bmi_val > 0 and bmi_val < 15):
        score += 10
        reasons.append(f"BMI ({bmi_val:.1f}) is in critical range")
        factors["bmi"] = "critical"
    elif bmi_val >= 30 or bmi_val < 17:
        score += 5
        reasons.append(f"BMI ({bmi_val:.1f}) needs attention")
        factors["bmi"] = "moderate"
    elif bmi_val > 0:
        factors["bmi"] = "good"

    score = min(score, 100)

    if score >= 70:
        level, color = "critical", "danger"
    elif score >= 50:
        level, color = "high", "warning"
    elif score >= 30:
        level, color = "moderate", "warning"
    else:
        level, color = "low", "recovery"

    if not reasons:
        reasons = ["Your health metrics look good! Keep it up."]

    return RiskScoreResponse(
        score=score,
        level=level,
        color=color,
        reasons=reasons[:4],
        factors=factors,
    )


# ═══════════════════════════════════════════
# AI INSIGHTS (TREND ANALYSIS)
# ═══════════════════════════════════════════

async def get_insights(
    db: AsyncSession, user_id: int
) -> InsightsResponse:
    since = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        select(HealthMonitoring)
        .where(
            and_(
                HealthMonitoring.user_id == user_id,
                HealthMonitoring.created_at >= since,
            )
        )
        .order_by(desc(HealthMonitoring.created_at))
        .limit(14)
    )
    records = result.scalars().all()

    # Get daily records (NEW SYSTEM)
    daily_result = await db.execute(
        select(DailyHealthRecord)
        .where(
            and_(
                DailyHealthRecord.user_id == user_id,
                DailyHealthRecord.date >= since.date(),
            )
        )
    )
    daily_records = daily_result.scalars().all()

    act_result = await db.execute(
        select(ActivityTracking)
        .where(
            and_(
                ActivityTracking.user_id == user_id,
                ActivityTracking.created_at >= since,
            )
        )
        .order_by(desc(ActivityTracking.created_at))
        .limit(7)
    )
    activities = act_result.scalars().all()

    insights: List[InsightItem] = []

    if not records:
        return InsightsResponse(
            insights=[
                InsightItem(
                    type="info",
                    message="No health data yet. Start logging your vitals to see AI insights.",
                    icon="fa-circle-info",
                )
            ],
            count=1,
        )

    sleep_vals = [r.sleep_hours for r in records if r.sleep_hours]
    hr_vals = [r.heart_rate for r in records if r.heart_rate]
    stress_vals = [r.stress_level for r in records if r.stress_level]
    oxygen_vals = [r.oxygen_level for r in records if r.oxygen_level]
    step_vals = [a.steps for a in activities]

    avg_sleep = sum(sleep_vals) / len(sleep_vals) if sleep_vals else 0
    avg_hr = sum(hr_vals) / len(hr_vals) if hr_vals else 0
    avg_stress = sum(stress_vals) / len(stress_vals) if stress_vals else 0
    avg_oxygen = sum(oxygen_vals) / len(oxygen_vals) if oxygen_vals else 0
    avg_steps = sum(step_vals) / len(step_vals) if step_vals else 0

    # Sleep insights
    if avg_sleep >= 8:
        insights.append(InsightItem(
            type="good",
            message=f"Excellent sleep quality! Averaging {avg_sleep:.1f}h — your recovery is optimized.",
            icon="fa-moon",
        ))
    elif avg_sleep >= 7:
        insights.append(InsightItem(
            type="good",
            message=f"Good sleep pattern — {avg_sleep:.1f}h average. Keep maintaining this schedule.",
            icon="fa-moon",
        ))
    elif avg_sleep >= 5:
        insights.append(InsightItem(
            type="warning",
            message=f"Sleep below optimal — averaging {avg_sleep:.1f}h. Aim for 7–9 hours for full recovery.",
            icon="fa-moon",
        ))
    elif avg_sleep > 0:
        insights.append(InsightItem(
            type="danger",
            message=f"Critical sleep deficit — only {avg_sleep:.1f}h average. This significantly impacts health.",
            icon="fa-moon",
        ))

    # Heart rate insights
    if avg_hr > 0:
        if 60 <= avg_hr <= 80:
            insights.append(InsightItem(
                type="good",
                message=f"Healthy resting heart rate at {avg_hr:.0f} bpm — excellent cardiovascular health.",
                icon="fa-heart-pulse",
            ))
        elif avg_hr > 90:
            insights.append(InsightItem(
                type="warning",
                message=f"Elevated heart rate at {avg_hr:.0f} bpm. Consider reducing caffeine and stress.",
                icon="fa-heart-pulse",
            ))

    # Oxygen insights
    if avg_oxygen > 0:
        if avg_oxygen >= 97:
            insights.append(InsightItem(
                type="good",
                message=f"Excellent oxygen saturation at {avg_oxygen:.1f}% — lungs functioning optimally.",
                icon="fa-lungs",
            ))
        elif avg_oxygen < 95:
            insights.append(InsightItem(
                type="danger",
                message=f"Low oxygen saturation ({avg_oxygen:.1f}%). Consult a doctor immediately.",
                icon="fa-lungs",
            ))

    # Stress insights
    if avg_stress > 0:
        if avg_stress <= 3:
            insights.append(InsightItem(
                type="good",
                message=f"Low stress levels ({avg_stress:.1f}/10). Great mental health balance!",
                icon="fa-brain",
            ))
        elif avg_stress >= 7:
            insights.append(InsightItem(
                type="warning",
                message=f"High stress detected ({avg_stress:.1f}/10). Try breathing exercises or meditation.",
                icon="fa-brain",
            ))

    # Activity insights
    if avg_steps > 0:
        if avg_steps >= 10000:
            insights.append(InsightItem(
                type="good",
                message=f"Outstanding activity! {int(avg_steps):,} steps/day — well above the 10K target.",
                icon="fa-person-walking",
            ))
        elif avg_steps < 5000:
            insights.append(InsightItem(
                type="warning",
                message=f"Low activity level — {int(avg_steps):,} steps/day. Try a 20-minute walk daily.",
                icon="fa-person-walking",
            ))

    # Trend insight
    if len(sleep_vals) >= 4:
        recent_avg = sum(sleep_vals[:3]) / 3
        older_avg = sum(sleep_vals[3:]) / max(len(sleep_vals[3:]), 1)
        if recent_avg > older_avg + 0.5:
            insights.append(InsightItem(
                type="good",
                message="Sleep is improving this week. Your recovery trend is going up.",
                icon="fa-arrow-trend-up",
            ))
        elif recent_avg < older_avg - 0.5:
            insights.append(InsightItem(
                type="warning",
                message="Sleep declining this week. Consider adjusting your bedtime routine.",
                icon="fa-arrow-trend-down",
            ))

    return InsightsResponse(insights=insights[:6], count=len(insights[:6]))


# ═══════════════════════════════════════════
# ALERTS SERVICE
# ═══════════════════════════════════════════

async def get_alerts(
    db: AsyncSession, user_id: int, limit: int = 10
) -> AlertsResponse:
    await _auto_generate_alerts(db, user_id)

    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == user_id)
        .order_by(desc(Alert.created_at))
        .limit(limit)
    )
    alerts = result.scalars().all()

    items = [
        AlertItem(
            id=a.id,
            title=a.title,
            message=a.message,
            severity=a.severity,
            category=a.category,
            is_read=a.is_read,
            time_ago=_time_ago(a.created_at),
        )
        for a in alerts
    ]

    critical = sum(1 for a in items if a.severity in ("high", "critical"))
    unread = sum(1 for a in items if not a.is_read)

    return AlertsResponse(
        alerts=items,
        count=len(items),
        critical_count=critical,
        unread_count=unread,
    )


async def _auto_generate_alerts(
    db: AsyncSession, user_id: int
) -> None:
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    existing = await db.execute(
        select(func.count()).where(
            and_(
                Alert.user_id == user_id,
                Alert.created_at >= today_start,
            )
        )
    )
    if (existing.scalar() or 0) > 0:
        return

    # Try to get the latest DailyHealthRecord first
    daily_result = await db.execute(
        select(DailyHealthRecord)
        .where(DailyHealthRecord.user_id == user_id)
        .order_by(desc(DailyHealthRecord.date))
        .limit(1)
    )
    daily_record = daily_result.scalar_one_or_none()
    
    record = daily_record
    
    if not record:
        # Fallback to old HealthMonitoring
        result = await db.execute(
            select(HealthMonitoring)
            .where(HealthMonitoring.user_id == user_id)
            .order_by(desc(HealthMonitoring.created_at))
            .limit(1)
        )
        record = result.scalar_one_or_none()

    if not record:
        return

    new_alerts: List[Alert] = []

    if record.sleep_hours and record.sleep_hours < 5:
        new_alerts.append(Alert(
            user_id=user_id,
            title="Critical Sleep Deficit",
            message=f"Only {record.sleep_hours:.1f}h sleep recorded. Severe impact on recovery.",
            severity="critical",
            category="sleep",
        ))
    elif record.sleep_hours and record.sleep_hours < 6:
        new_alerts.append(Alert(
            user_id=user_id,
            title="Low Sleep Hours",
            message=f"Sleep below recommended ({record.sleep_hours:.1f}h). Aim for 7-9 hours.",
            severity="high",
            category="sleep",
        ))

    if record.heart_rate and (record.heart_rate > 100 or record.heart_rate < 50):
        new_alerts.append(Alert(
            user_id=user_id,
            title="Abnormal Heart Rate",
            message=f"Heart rate at {record.heart_rate} bpm is outside normal range.",
            severity="high",
            category="cardiac",
        ))

    if record.oxygen_level and record.oxygen_level < 95:
        sev = "critical" if record.oxygen_level < 90 else "high"
        new_alerts.append(Alert(
            user_id=user_id,
            title="Low Oxygen Saturation",
            message=f"SpO2 at {record.oxygen_level:.1f}%. Seek medical attention if persistent.",
            severity=sev,
            category="respiratory",
        ))

    if record.stress_level and record.stress_level >= 8:
        new_alerts.append(Alert(
            user_id=user_id,
            title="High Stress Level",
            message=f"Stress at {record.stress_level}/10. Consider relaxation techniques.",
            severity="medium",
            category="mental_health",
        ))

    for alert in new_alerts:
        db.add(alert)
    if new_alerts:
        await db.commit()


# ═══════════════════════════════════════════
# HABIT COACH SERVICE
# ═══════════════════════════════════════════

async def get_habit_tips(
    db: AsyncSession, user_id: int
) -> HabitsResponse:
    since = datetime.now(timezone.utc) - timedelta(days=7)

    result = await db.execute(
        select(HealthMonitoring)
        .where(
            and_(
                HealthMonitoring.user_id == user_id,
                HealthMonitoring.created_at >= since,
            )
        )
        .order_by(desc(HealthMonitoring.created_at))
        .limit(7)
    )
    records = result.scalars().all()

    act_result = await db.execute(
        select(ActivityTracking)
        .where(
            and_(
                ActivityTracking.user_id == user_id,
                ActivityTracking.created_at >= since,
            )
        )
        .order_by(desc(ActivityTracking.created_at))
        .limit(7)
    )
    activities = act_result.scalars().all()

    # Get daily records (NEW SYSTEM)
    daily_result = await db.execute(
        select(DailyHealthRecord)
        .where(
            and_(
                DailyHealthRecord.user_id == user_id,
                DailyHealthRecord.date >= since.date(),
            )
        )
    )
    daily_records = daily_result.scalars().all()

    tips: List[HabitTip] = []
    focus_area = "general"

    sleep_vals = [r.sleep_hours for r in daily_records if r.sleep_hours is not None] + [r.sleep_hours for r in records if r.sleep_hours]
    stress_vals = [r.stress_level for r in daily_records if r.stress_level is not None] + [r.stress_level for r in records if r.stress_level]
    step_vals = [r.steps for r in daily_records if r.steps is not None] + [a.steps for a in activities]
    oxygen_vals = [r.oxygen_level for r in daily_records if r.oxygen_level is not None] + [r.oxygen_level for r in records if r.oxygen_level]

    avg_sleep = sum(sleep_vals) / len(sleep_vals) if sleep_vals else 7.0
    avg_stress = sum(stress_vals) / len(stress_vals) if stress_vals else 5.0
    avg_steps = sum(step_vals) / len(step_vals) if step_vals else 5000
    avg_oxygen = sum(oxygen_vals) / len(oxygen_vals) if oxygen_vals else 98.0

    if avg_sleep < 7:
        focus_area = "sleep"
        tips.append(HabitTip(
            title="Optimize Your Sleep",
            tip="Set a consistent sleep schedule — same time every night and morning.",
            reason=f"Your average sleep is {avg_sleep:.1f}h. Consistency trains your circadian rhythm.",
            priority="high",
            category="Sleep",
            icon="fa-moon",
        ))
        tips.append(HabitTip(
            title="Pre-Sleep Routine",
            tip="Avoid screens 30 minutes before bed. Use blue-light glasses if needed.",
            reason="Blue light suppresses melatonin, delaying sleep onset by up to 3 hours.",
            priority="high",
            category="Sleep",
            icon="fa-mobile-screen-button",
        ))

    if avg_stress >= 6:
        tips.append(HabitTip(
            title="4-7-8 Breathing",
            tip="Inhale 4 seconds, hold 7 seconds, exhale 8 seconds. Repeat 4 times.",
            reason=f"Your stress is {avg_stress:.1f}/10. This technique activates the parasympathetic system.",
            priority="high" if avg_stress >= 8 else "medium",
            category="Stress",
            icon="fa-wind",
        ))

    if avg_steps < 7000:
        tips.append(HabitTip(
            title="Daily Step Goal",
            tip="Take a 15-minute walk after each meal. It adds ~2,000 steps effortlessly.",
            reason=f"You average {int(avg_steps):,} steps. Each 1,000 extra steps reduces mortality risk by 6%.",
            priority="medium",
            category="Activity",
            icon="fa-person-walking",
        ))

    tips.append(HabitTip(
        title="Hydration Habit",
        tip="Drink a full glass of water first thing every morning before coffee.",
        reason="Your body loses ~500ml overnight. Morning hydration kickstarts metabolism.",
        priority="medium",
        category="Hydration",
        icon="fa-droplet",
    ))

    if avg_oxygen < 97:
        tips.append(HabitTip(
            title="Deep Breathing Exercise",
            tip="Practice box breathing: 4s inhale, 4s hold, 4s exhale, 4s hold.",
            reason=f"SpO2 at {avg_oxygen:.1f}%. Deep breathing exercises improve oxygen intake.",
            priority="high",
            category="Respiratory",
            icon="fa-lungs",
        ))

    if len(tips) < 2:
        tips.append(HabitTip(
            title="Log Daily Vitals",
            tip="Check your health metrics every morning for 21 days to build the habit.",
            reason="Daily tracking increases health awareness and helps catch issues early.",
            priority="low",
            category="General",
            icon="fa-clipboard-list",
        ))

    return HabitsResponse(
        tips=tips[:3],
        focus_area=focus_area,
        count=len(tips[:3]),
    )
