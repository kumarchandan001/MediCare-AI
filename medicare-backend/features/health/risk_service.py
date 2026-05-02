import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from features.health import daily_health_service as daily_service
from features.health.recommendation_service import _get_user_profile, _analyze_history

logger = logging.getLogger(__name__)

async def generate_risk_profile(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
    """
    Detect potential health risks early using 14-day historical data
    and personalized context.
    """
    profile = await _get_user_profile(db, user_id)
    records = await daily_service.get_history(db, user_id, days=14)
    
    if not records:
        return []
        
    trends = _analyze_history(records)
    risks = []
    
    valid_steps = [r.steps for r in records if r.steps is not None]
    valid_sleep = [r.sleep_hours for r in records if r.sleep_hours is not None]
    valid_hr = [r.heart_rate for r in records if r.heart_rate is not None]
    
    # ── 1. Sleep Risk ──
    if valid_sleep:
        avg_sleep = sum(valid_sleep) / len(valid_sleep)
        if avg_sleep < 5.5:
            # If sleep is critically low, and trend is also declining -> severity escalates
            level = "high" if trends.get("sleep") == "declining" else "medium"
            risks.append({
                "type": "sleep",
                "level": level,
                "message": "Chronic low sleep detected." if level == "high" else "Average sleep is below 5.5 hours."
            })
            
    # ── 2. Activity Risk ──
    if valid_steps:
        avg_steps = sum(valid_steps) / len(valid_steps)
        if avg_steps < 4000:
            # If steps are very low, and dropping -> severity escalates
            level = "high" if trends.get("activity") == "declining" else "medium"
            risks.append({
                "type": "activity",
                "level": level,
                "message": "Severe continuous inactivity detected." if level == "high" else "Activity is consistently below 4000 steps."
            })
            
    # ── 3. Heart Risk ──
    if valid_hr:
        avg_hr = sum(valid_hr) / len(valid_hr)
        
        # Calculate localized HR trend
        mid = len(valid_hr) // 2
        recent_hr = valid_hr[:mid]
        older_hr = valid_hr[mid:]
        
        hr_rising = False
        if recent_hr and older_hr:
            if sum(recent_hr)/len(recent_hr) > (sum(older_hr)/len(older_hr)) * 1.05:
                hr_rising = True
                
        # Age-based risk adjustment
        hr_high_threshold = 85 if profile["age"] > 50 else 90
                
        if avg_hr > hr_high_threshold:
            risks.append({
                "type": "heart_rate",
                "level": "high",
                "message": f"Consistently elevated resting heart rate detected (> {hr_high_threshold} bpm)."
            })
        elif hr_rising and avg_hr > 75:
            risks.append({
                "type": "heart_rate",
                "level": "medium",
                "message": "Resting heart rate shows an abnormal rising trend."
            })
            
    return risks


async def generate_alerts(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
    """
    Trigger intelligent alerts based on risk severity.
    Filters out duplicates and handles priority scaling.
    """
    risks = await generate_risk_profile(db, user_id)
    
    alerts = []
    seen_types = set()
    
    for r in risks:
        # Avoid duplicate alerts for the same category
        if r["type"] in seen_types:
            continue
            
        if r["level"] == "high":
            alerts.append({
                "type": r["type"],
                "priority": "high",
                "message": f"URGENT: {r['message']} Immediate attention recommended."
            })
            seen_types.add(r["type"])
        elif r["level"] == "medium":
            alerts.append({
                "type": r["type"],
                "priority": "medium",
                "message": f"NOTICE: {r['message']} Please monitor closely."
            })
            seen_types.add(r["type"])
            
    # Priority sorting (High -> Medium)
    priority_weights = {"high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda x: priority_weights.get(x["priority"], 99))
    
    return alerts
