import logging
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from features.health import daily_health_service as daily_service

logger = logging.getLogger(__name__)

async def generate_insights(db: AsyncSession, user_id: int) -> List[str]:
    """
    Generate intelligent, human-readable health insights using 
    smartwatch data stored in the database.
    """
    # Fetch last 7 days of data
    records = await daily_service.get_history(db, user_id, days=7)
    
    if not records:
        return []
        
    insights = []
    
    # Filter valid metrics
    valid_steps = [r.steps for r in records if r.steps is not None]
    valid_sleep = [r.sleep_hours for r in records if r.sleep_hours is not None]
    
    # Most recent record is typically today or yesterday
    today_record = records[0]
    today_steps = today_record.steps
    today_hr = today_record.heart_rate
    
    # ── 1. Steps Insight ──
    if valid_steps:
        avg_steps = sum(valid_steps) / len(valid_steps)
        if avg_steps < 5000:
            insights.append("Low activity level: Aim for more daily movement.")
            
        if today_steps is not None and len(valid_steps) > 1:
            if today_steps < avg_steps * 0.8:
                insights.append("You are less active today than usual.")
            elif today_steps > avg_steps * 1.1:
                insights.append("Great! Activity improving.")
                
    # ── 2. Sleep Insight ──
    if valid_sleep:
        avg_sleep = sum(valid_sleep) / len(valid_sleep)
        if avg_sleep < 6:
            insights.append("Sleep is below optimal level.")
            
        if len(valid_sleep) >= 4:
            # Compare recent 2 days vs previous days to detect trend
            recent_sleep = sum(valid_sleep[:2]) / 2
            older_sleep = sum(valid_sleep[2:]) / len(valid_sleep[2:])
            
            if recent_sleep < older_sleep * 0.9:
                insights.append("Sleep is declining this week.")
            elif recent_sleep > older_sleep * 1.1:
                insights.append("Sleep quality improving.")

    # ── 3. Heart Rate Insight ──
    if today_hr is not None:
        if today_hr > 90:
            insights.append("Elevated heart rate detected.")
        elif 60 <= today_hr <= 90:
            insights.append("Heart rate is within normal range.")

    return insights
