import logging
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from features.health.insight_service import generate_insights
from features.health import daily_health_service as daily_service
from features.auth.models import User

logger = logging.getLogger(__name__)

async def _get_user_profile(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """Fetch user demographics for personalization."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        return {"age": 30, "weight": 70} # sensible defaults
        
    # We use a default age of 30 if age/DOB is not explicitly in the schema
    # We use actual weight if available.
    return {
        "age": 30, # Defaulted as age isn't currently tracked in User model
        "weight": user.weight or 70
    }

def _analyze_history(records: List[Any]) -> Dict[str, str]:
    """Analyze 14 days of history to determine long-term trends."""
    if not records or len(records) < 3:
        return {"activity": "neutral", "sleep": "neutral"}
        
    # Split into recent half vs older half
    mid = len(records) // 2
    recent = records[:mid]
    older = records[mid:]
    
    trends = {"activity": "neutral", "sleep": "neutral"}
    
    # Activity Trend
    recent_steps = [r.steps for r in recent if r.steps]
    older_steps = [r.steps for r in older if r.steps]
    
    if recent_steps and older_steps:
        r_avg = sum(recent_steps) / len(recent_steps)
        o_avg = sum(older_steps) / len(older_steps)
        if r_avg > o_avg * 1.1:
            trends["activity"] = "improving"
        elif r_avg < o_avg * 0.9:
            trends["activity"] = "declining"
            
    # Sleep Trend
    recent_sleep = [r.sleep_hours for r in recent if r.sleep_hours]
    older_sleep = [r.sleep_hours for r in older if r.sleep_hours]
    
    if recent_sleep and older_sleep:
        r_avg = sum(recent_sleep) / len(recent_sleep)
        o_avg = sum(older_sleep) / len(older_sleep)
        if r_avg > o_avg * 1.1:
            trends["sleep"] = "improving"
        elif r_avg < o_avg * 0.9:
            trends["sleep"] = "declining"
            
    return trends

async def generate_recommendations(db: AsyncSession, user_id: int) -> List[Dict[str, Any]]:
    """
    Convert health insights into actionable, prioritized, and personalized recommendations.
    """
    insights = await generate_insights(db, user_id)
    
    if not insights:
        return []
        
    # Fetch Personalization Data
    profile = await _get_user_profile(db, user_id)
    history_records = await daily_service.get_history(db, user_id, days=14)
    trends = _analyze_history(history_records)
    
    recommendations = []
    
    for insight in insights:
        rec = {"personalized": True}
        
        # ── Activity Mapping ──
        if "Low activity level" in insight:
            rec["type"] = "activity"
            
            if trends["activity"] == "declining":
                rec["message"] = "Your activity has been dropping steadily. Start small: commit to just 15-20 minutes of walking today."
                rec["priority"] = "high"
            else:
                rec["message"] = "Try walking at least 30 minutes daily to reach a healthier baseline."
                rec["priority"] = "medium"
                
        elif "less active today" in insight:
            rec["type"] = "activity"
            rec["message"] = "Take a short 15-minute evening walk to catch up to your weekly average."
            rec["priority"] = "medium"
            
        elif "Activity improving" in insight:
            rec["type"] = "activity"
            if profile["weight"] > 85:
                rec["message"] = "Great momentum! Keep walking, but ensure you wear supportive shoes to protect your joints."
            else:
                rec["message"] = "Great momentum! Consider increasing intensity slightly or trying a short jog."
            rec["priority"] = "low"
            
        # ── Sleep Mapping ──
        elif "Sleep is below optimal" in insight:
            rec["type"] = "sleep"
            if trends["sleep"] == "declining":
                rec["message"] = "Chronic lack of sleep detected. You must prioritize rest tonight to prevent immune system stress."
                rec["priority"] = "high"
            else:
                rec["message"] = "Improve sleep by reducing screen time 1 hour before bed and maintaining a fixed bedtime."
                rec["priority"] = "medium"
                
        elif "Sleep is declining" in insight:
            rec["type"] = "sleep"
            rec["message"] = "Your sleep duration is slipping. Try to avoid caffeine after 2 PM today."
            rec["priority"] = "medium"
            
        elif "Sleep quality improving" in insight:
            rec["type"] = "sleep"
            rec["message"] = "Your sleep routine is working perfectly! Keep it up to lock in these restorative benefits."
            rec["priority"] = "low"
            
        # ── Heart Rate Mapping ──
        elif "Elevated heart rate" in insight:
            rec["type"] = "heart_rate"
            # Simulated age logic (assuming 30 if unknown)
            if profile["age"] > 50:
                rec["message"] = "Your heart rate is elevated. Please sit down, rest, and hydrate. If it persists, consult a doctor."
                rec["priority"] = "high"
            else:
                rec["message"] = "Consider relaxation techniques like deep breathing or meditation to lower your resting heart rate."
                rec["priority"] = "medium"
                
        elif "within normal range" in insight:
            rec["type"] = "heart_rate"
            rec["message"] = "Your cardiovascular metrics are stable. Ensure you're staying properly hydrated."
            rec["priority"] = "low"
            
        if "type" in rec:
            recommendations.append(rec)
            
    # Priority adjustment based on consistent failure/improvement
    for r in recommendations:
        if r["type"] == "activity" and trends["activity"] == "improving" and r["priority"] == "medium":
            r["priority"] = "low"
        if r["type"] == "sleep" and trends["sleep"] == "declining" and r["priority"] == "medium":
            r["priority"] = "high"
            
    # Sort recommendations by priority (High -> Medium -> Low)
    priority_weights = {"high": 1, "medium": 2, "low": 3}
    recommendations.sort(key=lambda x: priority_weights.get(x["priority"], 99))
    
    return recommendations
