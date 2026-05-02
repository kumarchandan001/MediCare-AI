import logging
from datetime import datetime, timedelta, timezone, date
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from features.health.models import HealthMonitoring, ActivityTracking, BMIHistory
from features.reports.schemas import (
    MetricStat, ReportsOverview, TrendPoint, MetricTrendSeries,
    TrendsResponse, AISummaryResponse, StreakData, ReportStats,
)

logger = logging.getLogger(__name__)


def _safe_avg(vals: list) -> float:
    return round(sum(vals) / len(vals), 2) if vals else 0.0


def _trend(curr: float, prev: float) -> str:
    if prev == 0:
        return "flat"
    change = ((curr - prev) / prev) * 100
    if change > 2:
        return "up"
    if change < -2:
        return "down"
    return "flat"


def _make_stat(curr: float, prev: float, label: str, unit: str) -> MetricStat:
    change = round(curr - prev, 2)
    pct = round(((curr - prev) / prev) * 100, 1) if prev > 0 else 0.0
    return MetricStat(
        current=round(curr, 2), previous=round(prev, 2),
        change=change, change_pct=pct,
        trend=_trend(curr, prev), unit=unit, label=label,
    )


def _extract(recs, field):
    return [getattr(r, field) for r in recs if getattr(r, field) is not None]


async def get_overview(db: AsyncSession, user_id: int, days: int = 7) -> ReportsOverview:
    now = datetime.now(timezone.utc)
    period = now - timedelta(days=days)
    prev_start = period - timedelta(days=days)

    cur_result = await db.execute(
        select(HealthMonitoring).where(and_(
            HealthMonitoring.user_id == user_id,
            HealthMonitoring.created_at >= period,
        )).order_by(desc(HealthMonitoring.created_at))
    )
    cur_records = cur_result.scalars().all()

    prev_result = await db.execute(
        select(HealthMonitoring).where(and_(
            HealthMonitoring.user_id == user_id,
            HealthMonitoring.created_at >= prev_start,
            HealthMonitoring.created_at < period,
        ))
    )
    prev_records = prev_result.scalars().all()

    act_result = await db.execute(
        select(ActivityTracking).where(and_(
            ActivityTracking.user_id == user_id,
            ActivityTracking.created_at >= period,
        ))
    )
    activities = act_result.scalars().all()

    prev_act = await db.execute(
        select(ActivityTracking).where(and_(
            ActivityTracking.user_id == user_id,
            ActivityTracking.created_at >= prev_start,
            ActivityTracking.created_at < period,
        ))
    )
    prev_activities = prev_act.scalars().all()

    bmi_result = await db.execute(
        select(BMIHistory).where(BMIHistory.user_id == user_id)
        .order_by(desc(BMIHistory.created_at)).limit(2)
    )
    bmi_records = bmi_result.scalars().all()

    c_sleep = _safe_avg(_extract(cur_records, "sleep_hours"))
    p_sleep = _safe_avg(_extract(prev_records, "sleep_hours"))
    c_hr = _safe_avg(_extract(cur_records, "heart_rate"))
    p_hr = _safe_avg(_extract(prev_records, "heart_rate"))
    c_o2 = _safe_avg(_extract(cur_records, "oxygen_level"))
    p_o2 = _safe_avg(_extract(prev_records, "oxygen_level"))
    c_stress = _safe_avg(_extract(cur_records, "stress_level"))
    p_stress = _safe_avg(_extract(prev_records, "stress_level"))
    c_steps = _safe_avg([a.steps for a in activities])
    p_steps = _safe_avg([a.steps for a in prev_activities])

    active_dates = set()
    for r in cur_records:
        if r.created_at:
            active_dates.add(r.created_at.date())
    active_days = len(active_dates)

    score = 0
    if c_sleep >= 7: score += 25
    elif c_sleep >= 5: score += 12
    if 60 <= c_hr <= 80 and c_hr > 0: score += 20
    elif c_hr > 0: score += 10
    if c_o2 >= 97 and c_o2 > 0: score += 20
    elif c_o2 >= 95 and c_o2 > 0: score += 10
    if c_stress <= 4 and c_stress > 0: score += 20
    elif c_stress <= 6 and c_stress > 0: score += 10
    if c_steps >= 10000: score += 15
    elif c_steps >= 5000: score += 8

    metric_scores = {
        "Sleep": min(c_sleep / 8, 1) * 100 if c_sleep else 0,
        "Heart Rate": (100 - abs(70 - c_hr) * 2) if c_hr else 0,
        "Oxygen": (c_o2 - 90) * 10 if c_o2 else 0,
        "Stress": (10 - c_stress) * 10 if c_stress else 0,
        "Activity": min(c_steps / 10000, 1) * 100 if c_steps else 0,
    }
    non_zero = {k: v for k, v in metric_scores.items() if v > 0}
    best_metric = max(non_zero, key=non_zero.get) if non_zero else "Sleep"
    worst_metric = min(non_zero, key=non_zero.get) if non_zero else "Activity"

    bmi_stat = None
    if len(bmi_records) >= 1:
        curr_bmi = bmi_records[0].bmi
        prev_bmi = bmi_records[1].bmi if len(bmi_records) > 1 else curr_bmi
        bmi_stat = _make_stat(curr_bmi, prev_bmi, "BMI", "")

    return ReportsOverview(
        period_days=days, record_count=len(cur_records),
        active_days=active_days,
        completion_pct=round((active_days / days) * 100, 1),
        sleep=_make_stat(c_sleep, p_sleep, "Sleep", "h"),
        heart_rate=_make_stat(c_hr, p_hr, "Heart Rate", "bpm"),
        oxygen=_make_stat(c_o2, p_o2, "SpO2", "%"),
        stress=_make_stat(c_stress, p_stress, "Stress", "/10"),
        steps=_make_stat(c_steps, p_steps, "Steps", ""),
        bmi=bmi_stat, overall_score=min(score, 100),
        score_trend=_trend(score, score * 0.9),
        best_metric=best_metric, worst_metric=worst_metric,
    )


async def get_trends(db: AsyncSession, user_id: int, days: int = 7) -> TrendsResponse:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    records_result = await db.execute(
        select(HealthMonitoring).where(and_(
            HealthMonitoring.user_id == user_id,
            HealthMonitoring.created_at >= since,
        )).order_by(HealthMonitoring.created_at)
    )
    records = records_result.scalars().all()

    act_result = await db.execute(
        select(ActivityTracking).where(and_(
            ActivityTracking.user_id == user_id,
            ActivityTracking.created_at >= since,
        )).order_by(ActivityTracking.created_at)
    )
    activities = act_result.scalars().all()

    date_range = []
    for i in range(days):
        d = (now - timedelta(days=days - 1 - i)).date()
        date_range.append(d)

    def bucket_by_date(recs, field, is_act=False):
        by_date: Dict[date, List] = {d: [] for d in date_range}
        for r in recs:
            if r.created_at:
                d = r.created_at.date()
                if d in by_date:
                    val = r.steps if is_act else getattr(r, field, None)
                    if val is not None:
                        by_date[d].append(float(val))
        return by_date

    def make_series(field, label, unit, color, is_act=False):
        buckets = bucket_by_date(activities if is_act else records, field, is_act)
        points, all_vals = [], []
        for d in date_range:
            vals = buckets[d]
            avg = round(sum(vals) / len(vals), 2) if vals else None
            if avg is not None:
                all_vals.append(avg)
            points.append(TrendPoint(
                date=d.isoformat(), value=avg,
                label=d.strftime("%b %d" if days > 7 else "%a"),
            ))
        return MetricTrendSeries(
            metric=field, label=label, unit=unit, color=color,
            data=points, average=_safe_avg(all_vals),
            min_val=min(all_vals) if all_vals else 0,
            max_val=max(all_vals) if all_vals else 0,
        )

    return TrendsResponse(
        period_days=days,
        sleep=make_series("sleep_hours", "Sleep", "h", "#9C6FFF"),
        heart_rate=make_series("heart_rate", "Heart Rate", "bpm", "#FF3D5A"),
        oxygen=make_series("oxygen_level", "SpO2", "%", "#00B4FF"),
        stress=make_series("stress_level", "Stress", "/10", "#FFB300"),
        steps=make_series("steps", "Steps", "", "#00F5C8", is_act=True),
    )


async def get_ai_summary(db: AsyncSession, user_id: int, days: int = 7) -> AISummaryResponse:
    overview = await get_overview(db, user_id, days)
    score = overview.overall_score

    if score >= 85: grade = "A"
    elif score >= 70: grade = "B"
    elif score >= 55: grade = "C"
    elif score >= 40: grade = "D"
    else: grade = "F"

    highlights, action_items = [], []

    s = overview.sleep
    if s.current >= 8:
        highlights.append({"type": "good", "text": f"Excellent sleep at {s.current:.1f}h avg — full recovery achieved."})
    elif s.current >= 7:
        highlights.append({"type": "good", "text": f"Good sleep at {s.current:.1f}h avg — within healthy range."})
    elif s.current > 0:
        highlights.append({"type": "warning", "text": f"Low sleep at {s.current:.1f}h avg — aim for 7-9 hours."})
        action_items.append("Set a consistent bedtime — same time every night.")

    hr = overview.heart_rate
    if 60 <= hr.current <= 80 and hr.current > 0:
        highlights.append({"type": "good", "text": f"Healthy heart rate at {hr.current:.0f} bpm — cardiovascular health is strong."})
    elif hr.current > 90:
        highlights.append({"type": "warning", "text": f"Elevated heart rate at {hr.current:.0f} bpm — consider reducing caffeine."})
        action_items.append("Practice 5-minute deep breathing daily to lower resting HR.")

    o2 = overview.oxygen
    if o2.current >= 97 and o2.current > 0:
        highlights.append({"type": "good", "text": f"Excellent SpO2 at {o2.current:.1f}% — lungs functioning optimally."})
    elif o2.current > 0 and o2.current < 95:
        highlights.append({"type": "danger", "text": f"Low SpO2 at {o2.current:.1f}% — consult a doctor immediately."})
        action_items.append("Seek medical attention for low oxygen levels.")

    st = overview.stress
    if st.current <= 4 and st.current > 0:
        highlights.append({"type": "good", "text": f"Low stress at {st.current:.1f}/10 — excellent mental balance."})
    elif st.current >= 7:
        highlights.append({"type": "warning", "text": f"High stress at {st.current:.1f}/10 — impact on recovery detected."})
        action_items.append("Try 10-minute meditation before bed to reduce cortisol.")

    steps = overview.steps
    if steps.current >= 10000:
        highlights.append({"type": "good", "text": f"Outstanding activity at {int(steps.current):,} steps/day."})
    elif steps.current < 5000 and steps.current > 0:
        highlights.append({"type": "warning", "text": f"Low activity at {int(steps.current):,} steps/day — target is 10,000."})
        action_items.append("Take a 20-minute walk after dinner to boost daily steps.")

    period_label = f"past {days} days"
    summaries = []
    if score >= 75:
        summaries.append(f"Your health over the {period_label} is looking strong with an overall score of {score:.0f}/100 (Grade {grade}).")
    elif score >= 50:
        summaries.append(f"Your health over the {period_label} shows moderate performance with a score of {score:.0f}/100 (Grade {grade}). There is room for improvement.")
    else:
        summaries.append(f"Your health metrics for the {period_label} indicate areas needing attention. Score: {score:.0f}/100 (Grade {grade}).")

    summaries.append(f"Your strongest area is {overview.best_metric} and your focus area is {overview.worst_metric}.")

    if overview.completion_pct >= 80:
        summaries.append(f"Great consistency — you logged data on {overview.active_days} out of {days} days ({overview.completion_pct:.0f}%).")
    else:
        summaries.append(f"You logged data on {overview.active_days} of {days} days. Try logging daily for better accuracy.")
        action_items.append("Log vitals every morning for more accurate insights.")

    if not action_items:
        action_items.append("Maintain your current healthy routine.")
        action_items.append("Continue logging daily for trend tracking.")

    return AISummaryResponse(
        summary=" ".join(summaries), highlights=highlights[:5],
        action_items=action_items[:4], score=score, grade=grade,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


async def get_stats(db: AsyncSession, user_id: int, days: int = 30) -> ReportStats:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    week = now - timedelta(days=7)
    month = now - timedelta(days=30)

    rec_result = await db.execute(
        select(HealthMonitoring).where(and_(
            HealthMonitoring.user_id == user_id,
            HealthMonitoring.created_at >= since,
        ))
    )
    records = rec_result.scalars().all()

    act_result = await db.execute(
        select(ActivityTracking).where(and_(
            ActivityTracking.user_id == user_id,
            ActivityTracking.created_at >= since,
        ))
    )
    activities = act_result.scalars().all()

    bmi_result = await db.execute(
        select(BMIHistory).where(BMIHistory.user_id == user_id)
        .order_by(desc(BMIHistory.created_at)).limit(1)
    )
    latest_bmi = bmi_result.scalar_one_or_none()

    all_rec_result = await db.execute(
        select(HealthMonitoring.created_at)
        .where(HealthMonitoring.user_id == user_id)
        .order_by(desc(HealthMonitoring.created_at))
    )
    all_dates = sorted(
        set(r[0].date() for r in all_rec_result.fetchall() if r[0]),
        reverse=True,
    )

    current_streak, longest_streak, temp_streak = 0, 0, 0
    today = datetime.now(timezone.utc).date()

    for i, d in enumerate(all_dates):
        if i == 0:
            if d == today or d == today - timedelta(days=1):
                current_streak = 1
                temp_streak = 1
        else:
            if (all_dates[i - 1] - d).days == 1:
                temp_streak += 1
                if i < 30:
                    current_streak = temp_streak
                longest_streak = max(longest_streak, temp_streak)
            else:
                longest_streak = max(longest_streak, temp_streak)
                temp_streak = 1

    longest_streak = max(longest_streak, current_streak)

    week_result = await db.execute(
        select(func.count(func.distinct(func.date(HealthMonitoring.created_at))))
        .where(and_(HealthMonitoring.user_id == user_id, HealthMonitoring.created_at >= week))
    )
    this_week = week_result.scalar() or 0

    month_result = await db.execute(
        select(func.count(func.distinct(func.date(HealthMonitoring.created_at))))
        .where(and_(HealthMonitoring.user_id == user_id, HealthMonitoring.created_at >= month))
    )
    this_month = month_result.scalar() or 0

    def _bmi_cat(bmi: float) -> str:
        if bmi < 18.5: return "Underweight"
        if bmi < 25: return "Normal"
        if bmi < 30: return "Overweight"
        return "Obese"

    return ReportStats(
        streaks=StreakData(
            current_streak=current_streak, longest_streak=longest_streak,
            total_logged=len(all_dates), this_week=min(this_week, 7),
            this_month=min(this_month, 30),
        ),
        total_vitals=len(records), total_activity=len(activities),
        avg_sleep=_safe_avg(_extract(records, "sleep_hours")),
        avg_hr=_safe_avg(_extract(records, "heart_rate")),
        avg_steps=_safe_avg([a.steps for a in activities]),
        avg_stress=_safe_avg(_extract(records, "stress_level")),
        bmi=latest_bmi.bmi if latest_bmi else None,
        bmi_category=_bmi_cat(latest_bmi.bmi) if latest_bmi else None,
        days_logged=len(set(r.created_at.date() for r in records if r.created_at)),
        period_days=days,
    )
