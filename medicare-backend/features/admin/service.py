"""Admin service — platform stats, user management, health intelligence, AI monitor, system health."""

import os
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, distinct

from features.auth.models import User
from features.health.models import (
    HealthMonitoring, ActivityTracking, BMIHistory,
    MedicationReminder, Alert, DiseasePrediction, ChatMessage,
)

logger = logging.getLogger(__name__)
_start_time = time.time()


async def get_platform_stats(db: AsyncSession) -> dict:
    """Aggregate platform-wide statistics."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = now - timedelta(days=7)
    month = now - timedelta(days=30)
    prev_month = now - timedelta(days=60)

    total_users = await db.scalar(select(func.count()).select_from(User)) or 0
    active_today = await db.scalar(
        select(func.count(distinct(HealthMonitoring.user_id)))
        .where(HealthMonitoring.created_at >= today)
    ) or 0
    new_week = await db.scalar(select(func.count()).select_from(User).where(User.created_at >= week)) or 0
    new_month = await db.scalar(select(func.count()).select_from(User).where(User.created_at >= month)) or 0
    new_prev = await db.scalar(
        select(func.count()).select_from(User)
        .where(and_(User.created_at >= prev_month, User.created_at < month))
    ) or 0
    user_growth = round(((new_month - new_prev) / max(new_prev, 1)) * 100, 1)

    total_preds = await db.scalar(select(func.count()).select_from(DiseasePrediction)) or 0
    preds_today = await db.scalar(
        select(func.count()).select_from(DiseasePrediction)
        .where(DiseasePrediction.created_at >= today)
    ) or 0
    total_vitals = await db.scalar(select(func.count()).select_from(HealthMonitoring)) or 0
    total_chats = await db.scalar(select(func.count()).select_from(ChatMessage)) or 0
    total_alerts = await db.scalar(select(func.count()).select_from(Alert)) or 0
    critical_alerts = await db.scalar(
        select(func.count()).select_from(Alert).where(Alert.severity == "critical")
    ) or 0

    avg_sleep = await db.scalar(
        select(func.avg(HealthMonitoring.sleep_hours))
        .where(HealthMonitoring.sleep_hours.isnot(None))
    ) or 7.0
    avg_stress = await db.scalar(
        select(func.avg(HealthMonitoring.stress_level))
        .where(HealthMonitoring.stress_level.isnot(None))
    ) or 5.0

    score = 50
    if avg_sleep >= 7:
        score += 15
    if avg_stress <= 5:
        score += 15
    score = min(score, 100)

    return {
        "total_users": total_users,
        "active_today": active_today,
        "new_this_week": new_week,
        "new_this_month": new_month,
        "total_predictions": total_preds,
        "predictions_today": preds_today,
        "total_vitals": total_vitals,
        "total_chats": total_chats,
        "total_alerts": total_alerts,
        "critical_alerts": critical_alerts,
        "avg_health_score": round(score, 1),
        "avg_risk_score": round(max(0, 100 - score), 1),
        "user_growth_pct": user_growth,
        "prediction_growth_pct": 0.0,
    }


async def get_users_list(db: AsyncSession, page: int = 1, per_page: int = 20, search: str = "") -> dict:
    """Get paginated user list with stats."""
    offset = (page - 1) * per_page
    base = select(User)
    if search:
        base = base.where(User.username.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))

    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(base.order_by(desc(User.created_at)).offset(offset).limit(per_page))
    users = result.scalars().all()

    user_list = []
    for u in users:
        hr = await db.scalar(
            select(func.count()).select_from(HealthMonitoring)
            .where(HealthMonitoring.user_id == u.id)
        ) or 0
        pc = await db.scalar(
            select(func.count()).select_from(DiseasePrediction)
            .where(DiseasePrediction.user_id == u.id)
        ) or 0
        user_list.append({
            "id": u.id, "username": u.username, "email": u.email,
            "is_active": u.is_active, "is_admin": u.is_admin,
            "email_verified": u.email_verified, "account_locked": u.account_locked,
            "created_at": str(u.created_at),
            "last_login_at": str(u.last_login_at) if u.last_login_at else None,
            "health_records": hr, "predictions": pc,
            "risk_level": "Unknown", "risk_score": None,
        })

    return {
        "users": user_list, "total": total, "page": page,
        "per_page": per_page, "total_pages": max(1, (total + per_page - 1) // per_page),
    }


async def get_user_detail(db: AsyncSession, user_id: int) -> Optional[dict]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None

    async def cnt(model, field):
        return await db.scalar(select(func.count()).select_from(model).where(field == user_id)) or 0

    hr = await cnt(HealthMonitoring, HealthMonitoring.user_id)
    pc = await cnt(DiseasePrediction, DiseasePrediction.user_id)
    mc = await cnt(MedicationReminder, MedicationReminder.user_id)
    ac = await cnt(Alert, Alert.user_id)

    avgs = (await db.execute(
        select(
            func.avg(HealthMonitoring.sleep_hours),
            func.avg(HealthMonitoring.heart_rate),
            func.avg(HealthMonitoring.stress_level),
        ).where(HealthMonitoring.user_id == user_id)
    )).first()

    last_pred = (await db.execute(
        select(DiseasePrediction.predicted_disease)
        .where(DiseasePrediction.user_id == user_id)
        .order_by(desc(DiseasePrediction.created_at)).limit(1)
    )).scalar_one_or_none()

    return {
        "id": user.id, "username": user.username, "email": user.email,
        "first_name": user.first_name, "last_name": user.last_name,
        "gender": user.gender, "height": user.height, "weight": user.weight,
        "blood_type": user.blood_type,
        "is_active": user.is_active, "is_admin": user.is_admin,
        "email_verified": user.email_verified, "account_locked": user.account_locked,
        "failed_login_count": user.failed_login_count,
        "created_at": str(user.created_at),
        "last_login_at": str(user.last_login_at) if user.last_login_at else None,
        "health_records": hr, "predictions": pc, "medications": mc, "alerts": ac,
        "avg_sleep": round(float(avgs[0] or 0), 1),
        "avg_heart_rate": round(float(avgs[1] or 0), 1),
        "avg_stress": round(float(avgs[2] or 0), 1),
        "last_prediction": last_pred, "risk_score": None, "risk_level": None,
    }


async def update_user(db: AsyncSession, user_id: int, data: dict) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False
    for k, v in data.items():
        if v is not None:
            setattr(user, k, v)
    await db.commit()
    return True


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False
    await db.delete(user)
    await db.commit()
    return True


async def get_health_intelligence(db: AsyncSession) -> dict:
    """Aggregate health data across all users."""
    thirty = datetime.now(timezone.utc) - timedelta(days=30)

    avgs = (await db.execute(
        select(
            func.avg(HealthMonitoring.sleep_hours),
            func.avg(HealthMonitoring.heart_rate),
            func.avg(HealthMonitoring.stress_level),
            func.avg(HealthMonitoring.oxygen_level),
        ).where(HealthMonitoring.created_at >= thirty)
    )).first()

    avg_steps = await db.scalar(
        select(func.avg(ActivityTracking.steps)).where(ActivityTracking.created_at >= thirty)
    ) or 0
    avg_bmi = await db.scalar(select(func.avg(BMIHistory.bmi))) or 0

    low_sleep = await db.scalar(
        select(func.count(distinct(HealthMonitoring.user_id)))
        .where(and_(HealthMonitoring.sleep_hours < 6, HealthMonitoring.sleep_hours.isnot(None),
                     HealthMonitoring.created_at >= thirty))
    ) or 0
    high_stress = await db.scalar(
        select(func.count(distinct(HealthMonitoring.user_id)))
        .where(and_(HealthMonitoring.stress_level >= 7, HealthMonitoring.created_at >= thirty))
    ) or 0

    diseases_r = await db.execute(
        select(DiseasePrediction.predicted_disease, func.count().label("count"),
               func.avg(DiseasePrediction.confidence).label("avg_confidence"))
        .group_by(DiseasePrediction.predicted_disease).order_by(desc("count")).limit(10)
    )
    top_diseases = [
        {"disease": r[0], "count": r[1], "avg_confidence": round(float(r[2] or 0), 1)}
        for r in diseases_r.fetchall()
    ]

    daily_active = []
    for i in range(6, -1, -1):
        day = datetime.now(timezone.utc) - timedelta(days=i)
        ds = day.replace(hour=0, minute=0, second=0, microsecond=0)
        de = day.replace(hour=23, minute=59, second=59)
        c = await db.scalar(
            select(func.count(distinct(HealthMonitoring.user_id)))
            .where(and_(HealthMonitoring.created_at >= ds, HealthMonitoring.created_at <= de))
        ) or 0
        daily_active.append({"date": day.strftime("%a"), "count": c})

    return {
        "avg_sleep_platform": round(float(avgs[0] or 0), 1),
        "avg_heart_rate_platform": round(float(avgs[1] or 0), 1),
        "avg_stress_platform": round(float(avgs[2] or 0), 1),
        "avg_oxygen_platform": round(float(avgs[3] or 0), 1),
        "avg_steps_platform": round(float(avg_steps), 0),
        "avg_bmi_platform": round(float(avg_bmi), 1),
        "users_with_low_sleep": low_sleep,
        "users_with_high_stress": high_stress,
        "users_with_high_risk": 0,
        "top_diseases": top_diseases, "top_symptoms": [],
        "risk_distribution": {"low": 0, "moderate": 0, "high": 0, "critical": 0},
        "daily_active_users": daily_active,
    }


async def get_ai_monitor(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = now - timedelta(days=7)

    total = await db.scalar(select(func.count()).select_from(DiseasePrediction)) or 0
    today_c = await db.scalar(
        select(func.count()).select_from(DiseasePrediction).where(DiseasePrediction.created_at >= today)
    ) or 0
    week_c = await db.scalar(
        select(func.count()).select_from(DiseasePrediction).where(DiseasePrediction.created_at >= week)
    ) or 0
    avg_conf = await db.scalar(select(func.avg(DiseasePrediction.confidence))) or 0
    high_conf = await db.scalar(
        select(func.count()).select_from(DiseasePrediction).where(DiseasePrediction.confidence >= 75)
    ) or 0
    low_conf = await db.scalar(
        select(func.count()).select_from(DiseasePrediction).where(DiseasePrediction.confidence < 50)
    ) or 0

    top_d = await db.execute(
        select(DiseasePrediction.predicted_disease, func.count().label("c"),
               func.avg(DiseasePrediction.confidence).label("ac"))
        .group_by(DiseasePrediction.predicted_disease).order_by(desc("c")).limit(8)
    )
    top_diseases = [{"disease": r[0], "count": r[1], "avg_conf": round(float(r[2] or 0), 1)} for r in top_d.fetchall()]

    recent_r = await db.execute(
        select(DiseasePrediction).order_by(desc(DiseasePrediction.created_at)).limit(10)
    )
    recent = []
    for r in recent_r.scalars().all():
        symp = r.symptoms if r.symptoms else ""
        recent.append({
            "id": r.id, "disease": r.predicted_disease,
            "conf": round(r.confidence, 1),
            "symptoms": (symp[:60] + "...") if len(symp) > 60 else symp,
            "date": str(r.created_at)[:10],
        })

    return {
        "total_predictions": total, "predictions_today": today_c,
        "predictions_this_week": week_c, "avg_confidence": round(float(avg_conf), 1),
        "high_confidence_count": high_conf, "low_confidence_count": low_conf,
        "top_predicted_diseases": top_diseases,
        "confidence_distribution": {
            "high": high_conf, "medium": max(0, total - high_conf - low_conf), "low": low_conf,
        },
        "recent_predictions": recent,
    }


async def get_system_health(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    uptime = time.time() - _start_time

    db_status, db_latency = "ok", 0
    try:
        t0 = time.time()
        await db.execute(select(func.count(1)))
        db_latency = round((time.time() - t0) * 1000, 2)
    except Exception as e:
        db_status = f"error: {e}"

    cache_info = {"provider": "Cache", "status": "unknown", "latency_ms": 0}
    try:
        from core.cache import cache
        health = await cache.health_check()
        backend = health.get("backend", "unknown")
        cache_info["backend"] = backend
        cache_info["memory_entries"] = health.get("memory_entries", 0)
        cache_info["memory_max"] = health.get("memory_max", 0)

        if backend == "redis":
            cache_info["status"] = "ok"
            cache_info["provider"] = "Redis"
            cache_info["latency_ms"] = health.get("redis_latency_ms", 0)
        elif backend == "memory_fallback" or backend == "memory_only":
            cache_info["status"] = "ok"
            cache_info["provider"] = "In-Memory LRU"
            cache_info["latency_ms"] = 0.01  # ~instant
        else:
            cache_info["status"] = "unavailable"
    except Exception:
        cache_info["status"] = "unavailable"

    models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ai", "models")
    model_files = ["health_assistant_model.pkl", "label_encoder.pkl", "feature_names.pkl"]
    models_loaded = all(os.path.exists(os.path.join(models_dir, f)) for f in model_files)

    try:
        import shutil
        total_b, used_b, free_b = shutil.disk_usage("/")
        disk = {
            "total_gb": round(total_b / 1e9, 1), "used_gb": round(used_b / 1e9, 1),
            "free_gb": round(free_b / 1e9, 1), "used_pct": round((used_b / total_b) * 100, 1),
            "status": "ok" if free_b > 1e9 else "low",
        }
    except Exception:
        disk = {"total_gb": 0, "used_gb": 0, "free_gb": 0, "used_pct": 0, "status": "unknown"}

    try:
        import psutil
        mem = psutil.virtual_memory()
        memory = {"used_mb": round(mem.used / 1e6, 1), "total_mb": round(mem.total / 1e6, 1), "status": "ok"}
    except Exception:
        memory = {"used_mb": 0, "total_mb": 0, "status": "unknown"}

    overall = "healthy"
    if db_status != "ok":
        overall = "degraded"

    return {
        "status": overall, "api_version": "2.0.0", "uptime_seconds": round(uptime, 0),
        "database": {"status": db_status, "latency_ms": db_latency, "provider": "PostgreSQL"},
        "cache": cache_info,
        "disk": disk, "memory": memory,
        "ml_models": {"status": "loaded" if models_loaded else "missing", "files": model_files, "path": models_dir},
        "last_checked": now.isoformat(),
    }


# ═══════════════════════════════════════════
#  NEW: Expanded Admin Service Functions
# ═══════════════════════════════════════════

import csv
import io
from sqlalchemy import or_
from features.admin.models import (
    AdminAuditLog, AppSettings,
    DEFAULT_SETTINGS,
)


# ── AUDIT LOG ────────────────────────────

async def write_audit_log(
    db: AsyncSession,
    admin_id: int,
    admin_email: str,
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[str] = None,
) -> None:
    """Write an admin action to audit log."""
    log = AdminAuditLog(
        admin_id=admin_id,
        admin_email=admin_email,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(log)
    await db.commit()


async def get_audit_log(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 50,
    action: str = "",
) -> dict:
    """Get paginated admin audit log."""
    offset = (page - 1) * per_page

    query = select(AdminAuditLog)
    if action:
        query = query.where(AdminAuditLog.action.ilike(f"%{action}%"))

    count = await db.scalar(
        select(func.count()).select_from(query.subquery())
    ) or 0

    result = await db.execute(
        query
        .order_by(desc(AdminAuditLog.created_at))
        .offset(offset)
        .limit(per_page)
    )
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id":          l.id,
                "admin_email": l.admin_email,
                "action":      l.action,
                "target_type": l.target_type,
                "target_id":   l.target_id,
                "details":     l.details,
                "created_at":  str(l.created_at),
            }
            for l in logs
        ],
        "total":       count,
        "page":        page,
        "per_page":    per_page,
        "total_pages": max(1, (count + per_page - 1) // per_page),
    }


# ── ALL PREDICTIONS ───────────────────────

async def get_all_predictions(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    search: str = "",
    disease: str = "",
) -> dict:
    """Get all predictions with user info."""
    offset = (page - 1) * per_page

    query = (
        select(DiseasePrediction, User)
        .join(User, DiseasePrediction.user_id == User.id)
    )
    if search:
        query = query.where(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                DiseasePrediction.predicted_disease.ilike(f"%{search}%"),
            )
        )
    if disease:
        query = query.where(
            DiseasePrediction.predicted_disease.ilike(f"%{disease}%")
        )

    count = await db.scalar(
        select(func.count()).select_from(query.subquery())
    ) or 0

    result = await db.execute(
        query
        .order_by(desc(DiseasePrediction.created_at))
        .offset(offset)
        .limit(per_page)
    )
    rows = result.all()

    return {
        "predictions": [
            {
                "id":                row[0].id,
                "user_id":           row[0].user_id,
                "username":          row[1].username,
                "email":             row[1].email,
                "predicted_disease": row[0].predicted_disease,
                "confidence":        round(row[0].confidence, 1),
                "symptoms":          row[0].symptoms[:80] + "..."
                    if row[0].symptoms and len(row[0].symptoms) > 80
                    else (row[0].symptoms or ""),
                "created_at":        str(row[0].created_at),
            }
            for row in rows
        ],
        "total":       count,
        "page":        page,
        "per_page":    per_page,
        "total_pages": max(1, (count + per_page - 1) // per_page),
    }


# ── ALL ALERTS ────────────────────────────

async def get_all_alerts(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    severity: str = "",
    is_unread: bool = False,
) -> dict:
    """Get all platform alerts with user info."""
    offset = (page - 1) * per_page

    query = (
        select(Alert, User)
        .join(User, Alert.user_id == User.id)
    )
    if severity:
        query = query.where(Alert.severity == severity)
    if is_unread:
        query = query.where(Alert.is_read == False)

    count = await db.scalar(
        select(func.count()).select_from(query.subquery())
    ) or 0

    result = await db.execute(
        query
        .order_by(desc(Alert.created_at))
        .offset(offset)
        .limit(per_page)
    )
    rows = result.all()

    return {
        "alerts": [
            {
                "id":         row[0].id,
                "user_id":    row[0].user_id,
                "username":   row[1].username,
                "email":      row[1].email,
                "title":      row[0].title,
                "message":    row[0].message,
                "severity":   row[0].severity,
                "category":   row[0].category,
                "is_read":    row[0].is_read,
                "created_at": str(row[0].created_at),
            }
            for row in rows
        ],
        "total":       count,
        "page":        page,
        "per_page":    per_page,
        "total_pages": max(1, (count + per_page - 1) // per_page),
    }


async def resolve_alert(db: AsyncSession, alert_id: int) -> bool:
    """Mark any alert as read/resolved."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        return False
    alert.is_read = True
    await db.commit()
    return True


async def delete_alert(db: AsyncSession, alert_id: int) -> bool:
    """Delete any alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        return False
    await db.delete(alert)
    await db.commit()
    return True


# ── USER FULL HEALTH DATA ─────────────────

async def get_user_full_health(db: AsyncSession, user_id: int) -> dict:
    """Get complete health data for one user."""

    async def fetch_list(model, uid_field, limit=10):
        r = await db.execute(
            select(model)
            .where(uid_field == user_id)
            .order_by(desc(model.created_at))
            .limit(limit)
        )
        return r.scalars().all()

    vitals      = await fetch_list(HealthMonitoring, HealthMonitoring.user_id)
    activities  = await fetch_list(ActivityTracking, ActivityTracking.user_id)
    predictions = await fetch_list(DiseasePrediction, DiseasePrediction.user_id)
    medications = await fetch_list(MedicationReminder, MedicationReminder.user_id)
    alerts      = await fetch_list(Alert, Alert.user_id)

    bmi_r = await db.execute(
        select(BMIHistory)
        .where(BMIHistory.user_id == user_id)
        .order_by(desc(BMIHistory.created_at))
        .limit(1)
    )
    latest_bmi = bmi_r.scalar_one_or_none()

    def avgs(recs, field):
        vals = [getattr(r, field) for r in recs if getattr(r, field) is not None]
        return round(sum(vals) / len(vals), 1) if vals else 0.0

    def bmi_cat(bmi: float) -> str:
        if bmi < 18.5: return "Underweight"
        if bmi < 25:   return "Normal"
        if bmi < 30:   return "Overweight"
        return "Obese"

    avg_sleep  = avgs(vitals, "sleep_hours")
    avg_hr     = avgs(vitals, "heart_rate")
    avg_stress = avgs(vitals, "stress_level")
    avg_o2     = avgs(vitals, "oxygen_level")

    risk_delta = 0
    if avg_sleep < 6 and avg_sleep > 0:   risk_delta += 25
    if avg_hr > 100 or (avg_hr < 50 and avg_hr > 0): risk_delta += 25
    if avg_o2 < 95 and avg_o2 > 0:        risk_delta += 30
    if avg_stress >= 7 and avg_stress > 0: risk_delta += 20

    risk_level = (
        "Critical" if risk_delta >= 70 else
        "High"     if risk_delta >= 50 else
        "Moderate" if risk_delta >= 30 else
        "Low"
    )

    return {
        "vitals_count":      len(vitals),
        "activity_count":    len(activities),
        "predictions_count": len(predictions),
        "medications_count": len(medications),
        "alerts_count":      len(alerts),
        "avg_sleep":         avg_sleep,
        "avg_hr":            avg_hr,
        "avg_stress":        avg_stress,
        "latest_bmi":        latest_bmi.bmi if latest_bmi else None,
        "bmi_category":      bmi_cat(latest_bmi.bmi) if latest_bmi else None,
        "risk_score":        risk_delta,
        "risk_level":        risk_level,
        "recent_predictions": [
            {
                "id":       p.id,
                "disease":  p.predicted_disease,
                "conf":     round(p.confidence, 1),
                "date":     str(p.created_at)[:10],
                "symptoms": (p.symptoms[:60] if p.symptoms else ""),
            }
            for p in predictions[:5]
        ],
        "recent_vitals": [
            {
                "sleep":  v.sleep_hours,
                "hr":     v.heart_rate,
                "o2":     v.oxygen_level,
                "stress": v.stress_level,
                "date":   str(v.created_at)[:10],
            }
            for v in vitals[:5]
        ],
        "recent_alerts": [
            {
                "id":       a.id,
                "title":    a.title,
                "severity": a.severity,
                "is_read":  a.is_read,
                "date":     str(a.created_at)[:10],
            }
            for a in alerts[:5]
        ],
        "medications": [
            {
                "name":      m.medicine_name,
                "dosage":    m.dosage,
                "frequency": m.frequency,
                "is_active": m.is_active,
            }
            for m in medications
        ],
    }


# ── PROMOTE / DEMOTE ADMIN ────────────────

async def promote_to_admin(db: AsyncSession, user_id: int) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False
    user.is_admin = True
    await db.commit()
    return True


async def demote_from_admin(db: AsyncSession, user_id: int) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False
    user.is_admin = False
    await db.commit()
    return True


# ── CACHE CLEAR ───────────────────────────

async def clear_all_cache() -> int:
    """Flush all cache keys (Redis + memory fallback)."""
    try:
        from core.cache import cache
        return await cache.flush_all()
    except Exception as e:
        logger.warning(f"Cache clear failed: {e}")
        return 0


# ── APP SETTINGS ──────────────────────────

async def get_all_settings(db: AsyncSession) -> list:
    """Get all app settings."""
    result = await db.execute(select(AppSettings).order_by(AppSettings.key))
    return result.scalars().all()


async def update_setting(db: AsyncSession, key: str, value: str, admin_id: int) -> bool:
    """Update a single app setting."""
    result = await db.execute(select(AppSettings).where(AppSettings.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        return False
    setting.value      = value
    setting.updated_by = admin_id
    await db.commit()
    return True


async def seed_default_settings(db: AsyncSession) -> None:
    """Create default settings if missing."""
    for key, cfg in DEFAULT_SETTINGS.items():
        exists = await db.scalar(
            select(func.count()).select_from(AppSettings).where(AppSettings.key == key)
        )
        if not exists:
            db.add(AppSettings(
                key=key,
                value=cfg["value"],
                value_type=cfg["type"],
                description=cfg["description"],
                is_public=cfg["is_public"],
            ))
    await db.commit()


# ── BROADCAST MESSAGE ─────────────────────

async def broadcast_message(
    db: AsyncSession,
    admin_id: int,
    title: str,
    message: str,
    severity: str = "info",
) -> int:
    """Create an alert for ALL users."""
    result = await db.execute(select(User.id).where(User.is_active == True))
    user_ids = [row[0] for row in result.fetchall()]

    for uid in user_ids:
        alert = Alert(
            user_id=uid,
            title=title,
            message=message,
            severity=severity,
            category="announcement",
            is_read=False,
        )
        db.add(alert)

    await db.commit()
    return len(user_ids)


# ── CSV EXPORT ────────────────────────────

async def export_users_csv(db: AsyncSession) -> str:
    """Export all users to CSV string."""
    result = await db.execute(select(User).order_by(desc(User.created_at)))
    users = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Username", "Email",
        "Is Active", "Is Admin",
        "Email Verified", "Account Locked",
        "Created At", "Last Login",
    ])
    for u in users:
        writer.writerow([
            u.id, u.username, u.email,
            u.is_active, u.is_admin,
            u.email_verified, u.account_locked,
            str(u.created_at)[:19],
            str(u.last_login_at)[:19] if u.last_login_at else "",
        ])
    return output.getvalue()


async def export_predictions_csv(db: AsyncSession) -> str:
    """Export all predictions to CSV string."""
    result = await db.execute(
        select(DiseasePrediction, User)
        .join(User, DiseasePrediction.user_id == User.id)
        .order_by(desc(DiseasePrediction.created_at))
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Username", "Email",
        "Disease", "Confidence", "Symptoms",
        "Created At",
    ])
    for p, u in rows:
        writer.writerow([
            p.id, u.username, u.email,
            p.predicted_disease,
            round(p.confidence, 1),
            (p.symptoms[:100] if p.symptoms else ""),
            str(p.created_at)[:19],
        ])
    return output.getvalue()


# ── RESET PASSWORD ────────────────────────

async def admin_reset_user_password(db: AsyncSession, user_id: int) -> bool:
    """Generate a password reset token for a user and send it via email."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False

    try:
        from services.email_service import send_password_reset_email
        import secrets, hashlib
        token = secrets.token_urlsafe(32)
        hashed = hashlib.sha256(token.encode()).hexdigest()

        from features.auth.models import PasswordResetToken
        prt = PasswordResetToken(
            user_id=user.id,
            token_hash=hashed,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        )
        db.add(prt)
        await db.commit()

        await send_password_reset_email(
            email=user.email,
            username=user.username,
            token=token,
        )
        return True
    except Exception as e:
        logger.error(f"Admin password reset failed: {e}")
        return False
