"""
services/personalization_service.py
───────────────────────────────────
Personalization Engine for MediCare AI.
Generates dynamic, rule-based health insights specific to a user's biological data.
"""

import time
from typing import List, Dict, Any
from utils.risk_engine import calculate_risk

# ── Configurability ──────────────────────────────────────────────────────────
# Centralized thresholds to avoid hardcoding inline
_THRESHOLDS = {
    'bmi': {
        'high': 25.0,     # >25 Overweight alert
        'low': 18.5       # <18.5 Underweight alert
    },
    'sleep': {
        'low_critical': 5.0, # <5 Severe sleep deprivation
        'low': 6.5,          # <6.5 Poor sleep
        'high': 9.5          # >9.5 Oversleeping
    },
    'steps': {
        'low_critical': 3000,
        'low': 6000
    },
    'heart_rate': {
        'high': 100,
        'low': 50
    },
    'blood_pressure': {
        'systolic_high': 130,
        'diastolic_high': 85
    }
}

# ── Caching ──────────────────────────────────────────────────────────────────
# Simple in-memory dict: {user_id: {'timestamp': float, 'data': list}}
_cache = {}
CACHE_TTL = 300  # 5 minutes

def invalidate_user_cache(user_id: int) -> None:
    """Clear personalization cache for a specific user to ensure data freshness."""
    if user_id in _cache:
        del _cache[user_id]


# ── Core Logic ───────────────────────────────────────────────────────────────
def get_personalization_insights(user_id: int) -> List[Dict[str, Any]]:
    """
    Returns prioritized personalized insights for a user based on health data averages.
    Caps return at Top 3 insights.
    Format: {"insight": "...", "risk_level": "...", "recommendation": "...", "priority": int}
    """
    now = time.time()
    
    # Return cached insights if valid
    if user_id in _cache and (now - _cache[user_id]['timestamp']) < CACHE_TTL:
        return _cache[user_id]['data']
        
    # Grab the user's latest 7-day health averages via the risk engine data fetcher
    risk_data = calculate_risk(user_id, days=7)
    factors = risk_data.get('factors', {})
    
    insights = []
    
    # 1. Heart Rate (Priority 1 - Cardiovascular)
    hr = factors.get('heart_rate', {}).get('value')
    if hr is not None:
        if hr >= _THRESHOLDS['heart_rate']['high']:
            insights.append({
                "insight": f"Your resting heart rate is elevated ({hr:.0f} bpm).",
                "risk_level": "High",
                "recommendation": "Monitor your heart rate and seek medical advice if it remains consistently high.",
                "priority": 1
            })
            
    # 2. Blood Pressure (Priority 1)
    bp_val = factors.get('blood_pressure', {}).get('value')
    if bp_val and isinstance(bp_val, str) and '/' in bp_val:
        try:
            sys_str, dia_str = bp_val.split('/')
            sys, dia = float(sys_str), float(dia_str)
            if sys >= _THRESHOLDS['blood_pressure']['systolic_high'] or dia >= _THRESHOLDS['blood_pressure']['diastolic_high']:
                insights.append({
                    "insight": f"Your blood pressure is elevated ({bp_val} mmHg).",
                    "risk_level": "High" if sys >= 140 or dia >= 90 else "Medium",
                    "recommendation": "Reduce sodium intake, manage stress, and consult a healthcare provider.",
                    "priority": 1
                })
        except ValueError:
            pass

    # 3. BMI (Priority 2)
    bmi = factors.get('bmi', {}).get('value')
    if bmi is not None:
        if bmi >= _THRESHOLDS['bmi']['high']:
            insights.append({
                "insight": f"Your BMI is {bmi:.1f}, which is above the optimal range.",
                "risk_level": "High" if bmi >= 30 else "Medium",
                "recommendation": "Consider weight management strategies, such as a balanced diet and regular exercise.",
                "priority": 2
            })
        elif bmi <= _THRESHOLDS['bmi']['low']:
            insights.append({
                "insight": f"Your BMI is {bmi:.1f}, which is below optimal.",
                "risk_level": "Medium",
                "recommendation": "Consider nutritional counseling to reach a healthy weight safely.",
                "priority": 2
            })
            
    # 4. Sleep (Priority 2)
    sleep = factors.get('sleep', {}).get('value')
    if sleep is not None:
        if sleep <= _THRESHOLDS['sleep']['low_critical']:
            insights.append({
                "insight": f"You are averaging only {sleep:.1f} hours of sleep.",
                "risk_level": "High",
                "recommendation": "Severe sleep deprivation detected. Prioritize immediately establishing a 7-8 hour sleep routine.",
                "priority": 2
            })
        elif sleep <= _THRESHOLDS['sleep']['low']:
            insights.append({
                "insight": f"You are averaging {sleep:.1f} hours of sleep.",
                "risk_level": "Medium",
                "recommendation": "Aim for 7-9 hours of sleep. Try to limit screen time 1 hour before bed.",
                "priority": 3
            })
            
    # 5. Steps / Activity (Priority 3)
    steps = factors.get('steps', {}).get('value')
    if steps is not None:
        if steps <= _THRESHOLDS['steps']['low_critical']:
            insights.append({
                "insight": f"Your daily steps are very low ({steps:.0f} avg).",
                "risk_level": "High",
                "recommendation": "Sedentary risk detected. Begin with short 10-minute walks daily.",
                "priority": 3
            })
        elif steps < _THRESHOLDS['steps']['low']:
            insights.append({
                "insight": f"Your daily steps ({steps:.0f} avg) are below target.",
                "risk_level": "Medium",
                "recommendation": "Try to incorporate more movement into your day to reach an 8,000 steps goal.",
                "priority": 3
            })

    # 6. Google Fit Wearable Insights (Priority 3)
    # Pull the latest Google Fit synced data to surface wearable-specific insights
    try:
        from models.user import GoogleFitToken
        gfit_token = GoogleFitToken.query.filter_by(user_id=user_id).first()
        if gfit_token and gfit_token.is_connected and gfit_token.last_sync:
            from datetime import datetime, timedelta
            hours_since_sync = (datetime.utcnow() - gfit_token.last_sync).total_seconds() / 3600
            if hours_since_sync > 24:
                insights.append({
                    "insight": "Your Google Fit data hasn't synced in over 24 hours.",
                    "risk_level": "Low",
                    "recommendation": "Open MediCare AI to auto-sync wearable data for accurate tracking.",
                    "priority": 4
                })
            # Pull Google Fit step data from ActivityRecord for smarter insights
            from models.health_record import ActivityRecord
            from sqlalchemy import func
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            gfit_steps = ActivityRecord.query.filter(
                ActivityRecord.user_id == user_id,
                ActivityRecord.activity_type == "Google Fit Steps",
                ActivityRecord.activity_date >= seven_days_ago.date(),
            ).with_entities(func.avg(ActivityRecord.steps)).scalar()
            if gfit_steps is not None and steps is None:
                # User has no manual step data but has wearable data
                avg_wearable_steps = float(gfit_steps)
                if avg_wearable_steps < _THRESHOLDS['steps']['low_critical']:
                    insights.append({
                        "insight": f"Your wearable shows only {avg_wearable_steps:.0f} avg daily steps.",
                        "risk_level": "High",
                        "recommendation": "Your Google Fit data indicates low activity. Start with 10-minute walks.",
                        "priority": 3
                    })
                elif avg_wearable_steps < _THRESHOLDS['steps']['low']:
                    insights.append({
                        "insight": f"Wearable data shows {avg_wearable_steps:.0f} avg daily steps.",
                        "risk_level": "Medium",
                        "recommendation": "Your Google Fit data suggests you need more activity. Aim for 8,000 steps.",
                        "priority": 3
                    })
    except Exception:
        pass  # Google Fit integration is optional — never break personalization

    # Priority Sorting and Capping
    # Sort strictly by priority (1 is most critical, 3 is least)
    insights.sort(key=lambda x: x['priority'])
    
    # Avoid UI Overload: Cap at top 3 insights
    insights = insights[:3]
    
    # Save to memory cache
    _cache[user_id] = {
        'timestamp': now,
        'data': insights
    }
    
    return insights

