import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from features.health.risk_service import generate_alerts
from features.health.recommendation_service import generate_recommendations
from features.health.score_service import calculate_health_score
from features.health import daily_health_service as daily_service
from core.cache import cache, cache_key
from datetime import date, datetime, timezone

logger = logging.getLogger(__name__)

async def send_alert_notification(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
    """
    Simulates sending an alert notification.
    Avoids duplicate notifications per day by using cache.
    Triggers only for high risk and repeated medium risks (via generate_alerts).
    """
    alerts = await generate_alerts(db, user_id)
    if not alerts:
        return []
        
    sent_notifications = []
    today_str = date.today().isoformat()
    
    for alert in alerts:
        # Generate a unique cache key for this user, alert type, and day
        ck = cache_key(f"notif_sent:{user_id}:{alert['type']}:{today_str}")
        
        # Check if we already sent this specific alert type today
        already_sent = await cache.get(ck)
        if not already_sent:
            # Simulate sending push notification/email
            logger.info(f"Sending Notification to User {user_id} - {alert['message']}")
            sent_notifications.append(alert)
            
            # Mark as sent for 24 hours
            await cache.set(ck, True, expire=86400)
            
    return sent_notifications


async def generate_daily_summary(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """
    Generates a clear, actionable human-friendly daily summary.
    Combines today's score with highest priority recommendation.
    """
    record, _ = await daily_service.get_latest(db, user_id)
    if not record:
        return {
            "summary": "No health data recorded yet today. Please sync your smartwatch to see your daily summary.",
            "score": 0,
            "status": "none"
        }
        
    steps = record.steps or 0
    sleep = record.sleep_hours or 0.0
    hr = record.heart_rate or 0
    
    score_data = calculate_health_score(steps, sleep, hr)
    recs = await generate_recommendations(db, user_id)
    
    # Construct a human-friendly summary
    summary_text = f"Your daily health score is {score_data['score']} ({score_data['status']}). "
    
    if recs:
        top_rec = recs[0] # Highest priority since they are sorted
        summary_text += f"Top focus today: {top_rec['message']}"
    else:
        summary_text += "Keep up the good work, all metrics look solid!"
        
    return {
        "summary": summary_text,
        "score": score_data["score"],
        "status": score_data["status"]
    }


async def generate_weekly_report(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """
    Generates a human-friendly weekly report analyzing the past 7 days.
    """
    records = await daily_service.get_history(db, user_id, days=7)
    
    if not records:
        return {
            "report": "Not enough data for a weekly report. Keep wearing your smartwatch to unlock insights.",
            "trend": "none",
            "score": 0
        }
        
    valid_steps = [r.steps for r in records if r.steps]
    valid_sleep = [r.sleep_hours for r in records if r.sleep_hours]
    valid_hr = [r.heart_rate for r in records if r.heart_rate]
    
    avg_steps = sum(valid_steps) // len(valid_steps) if valid_steps else 0
    avg_sleep = round(sum(valid_sleep) / len(valid_sleep), 1) if valid_sleep else 0.0
    avg_hr = int(sum(valid_hr) / len(valid_hr)) if valid_hr else 0
    
    weekly_score_data = calculate_health_score(avg_steps, avg_sleep, avg_hr)
    
    # Basic trend analysis (comparing average score to last recorded status)
    trend = "stable"
    if valid_steps:
        recent = valid_steps[:3]
        older = valid_steps[3:]
        if recent and older:
            r_avg = sum(recent)/len(recent)
            o_avg = sum(older)/len(older)
            if r_avg > o_avg * 1.1:
                trend = "improving"
            elif r_avg < o_avg * 0.9:
                trend = "declining"
                
    report_text = (
        f"This week you averaged {avg_steps:,} steps, {avg_sleep} hours of sleep, "
        f"and a resting heart rate of {avg_hr} bpm. "
    )
    
    if trend == "improving":
        report_text += "Your overall trajectory is improving. Excellent momentum!"
    elif trend == "declining":
        report_text += "Your activity and recovery metrics have dipped slightly this week. Let's aim to bounce back next week."
    else:
        report_text += "Your health metrics remained highly consistent throughout the week."

    return {
        "report": report_text,
        "trend": trend,
        "score": weekly_score_data["score"],
        "status": weekly_score_data["status"]
    }
