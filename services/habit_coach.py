"""
services/habit_coach.py
-----------------------
AI-based habit coaching system.

Public API:
    generate_habit_tips(user_id, days=7)  ->  dict

Returns:
    {
      "tips":       list[dict],   # personalised habit suggestions
      "profile":    dict,         # summary of user's current health state
      "streak":     dict,         # logging consistency info
      "focus_area": str,          # primary area needing attention
    }

Each tip dict:
    {
      "category":    str,     # sleep, activity, nutrition, stress, vitals, medication, consistency
      "priority":    str,     # "high" | "medium" | "low"
      "title":       str,     # short actionable headline
      "tip":         str,     # detailed suggestion
      "reason":      str,     # why this was triggered (data-driven)
      "metric":      str|None,# the metric that triggered it
      "current":     Any,     # current observed value
      "target":      Any,     # ideal target value
    }

The coaching engine analyses:
  - Sleep patterns (avg hours, consistency)
  - Physical activity (steps, exercise frequency)
  - Vital signs trends (HR, BP, SpO2, glucose)
  - Stress levels
  - BMI / weight trajectory
  - Medication adherence
  - Data logging consistency

Tips are context-aware: they change based on what the data shows,
and adapt when metrics improve or worsen.

No Flask, no SQLAlchemy -- pure stdlib + sqlite3.
Re-uses data patterns from risk_engine and alert_service.
"""

from __future__ import annotations

import json
import math
import os
import random
from datetime import datetime, timedelta
from typing import Any

from utils.db_helper import fetch_one, fetch_all


# -- Priority ordering ---------------------------------------------------------
_PRIORITY_RANK = {'high': 3, 'medium': 2, 'low': 1}


def _make_tip(category: str, priority: str, title: str, tip: str,
              reason: str, metric: str | None = None,
              current: Any = None, target: Any = None) -> dict:
    return {
        'category': category,
        'priority': priority,
        'title':    title,
        'tip':      tip,
        'reason':   reason,
        'metric':   metric,
        'current':  current,
        'target':   target,
    }


# ==============================================================================
# Data fetchers
# ==============================================================================

def _fetch_health_profile(user_id: int, since: str) -> dict[str, Any]:
    """Pull aggregated health data for the coaching window."""
    data: dict[str, Any] = {}

    # -- Health monitoring averages ---
    row = fetch_one('''
        SELECT
            AVG(heart_rate)       AS avg_hr,
            AVG(oxygen_level)     AS avg_o2,
            AVG(body_temperature) AS avg_temp,
            AVG(glucose_level)    AS avg_glucose,
            AVG(stress_level)     AS avg_stress,
            AVG(sleep_hours)      AS avg_sleep,
            MIN(sleep_hours)      AS min_sleep,
            MAX(sleep_hours)      AS max_sleep,
            COUNT(DISTINCT DATE(created_at)) AS vitals_days
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since
    ''', {'uid': user_id, 'since': since})
    if row:
        for col in ['avg_hr', 'avg_o2', 'avg_temp', 'avg_glucose',
                     'avg_stress', 'avg_sleep', 'min_sleep', 'max_sleep']:
            data[col] = float(row[col]) if row[col] is not None else None
        data['vitals_days'] = row['vitals_days'] or 0

    # -- Sleep variance ---
    sleep_rows = fetch_all('''
        SELECT sleep_hours FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since AND sleep_hours IS NOT NULL
        ORDER BY created_at ASC
    ''', {'uid': user_id, 'since': since})
    sleep_vals = [float(r['sleep_hours']) for r in sleep_rows]
    data['sleep_values'] = sleep_vals
    if len(sleep_vals) >= 2:
        avg = sum(sleep_vals) / len(sleep_vals)
        data['sleep_std'] = (sum((v - avg) ** 2 for v in sleep_vals) / len(sleep_vals)) ** 0.5
    else:
        data['sleep_std'] = None

    # -- Blood pressure ---
    bp_rows = fetch_all('''
        SELECT blood_pressure FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since AND blood_pressure IS NOT NULL
    ''', {'uid': user_id, 'since': since})
    sys_vals, dia_vals = [], []
    for bprow in bp_rows:
        try:
            bp = json.loads(bprow['blood_pressure'])
            if 'systolic'  in bp: sys_vals.append(bp['systolic'])
            if 'diastolic' in bp: dia_vals.append(bp['diastolic'])
        except Exception:
            pass
    data['avg_systolic']  = sum(sys_vals) / len(sys_vals) if sys_vals else None
    data['avg_diastolic'] = sum(dia_vals) / len(dia_vals) if dia_vals else None

    # -- Activity ---
    act = fetch_one('''
        SELECT
            AVG(daily_steps) AS avg_steps,
            SUM(daily_steps) AS total_steps,
            COUNT(*)         AS activity_days
        FROM (
            SELECT SUM(steps) AS daily_steps
            FROM activity_tracking
            WHERE user_id = :uid AND activity_date >= :since
            GROUP BY activity_date
        ) AS daily
    ''', {'uid': user_id, 'since': since})
    if act:
        data['avg_steps']     = float(act['avg_steps']) if act['avg_steps'] else None
        data['total_steps']   = int(act['total_steps']) if act['total_steps'] else 0
        data['activity_days'] = act['activity_days'] or 0
    else:
        data['avg_steps'] = None
        data['total_steps'] = 0
        data['activity_days'] = 0

    # -- Exercise variety ---
    variety_rows = fetch_all('''
        SELECT DISTINCT activity_type FROM activity_tracking
        WHERE user_id = :uid AND activity_date >= :since
    ''', {'uid': user_id, 'since': since})
    data['activity_types'] = [r['activity_type'] for r in variety_rows]

    # -- Total exercise minutes ---
    dur = fetch_one('''
        SELECT SUM(duration) AS total_mins
        FROM activity_tracking
        WHERE user_id = :uid AND activity_date >= :since
    ''', {'uid': user_id, 'since': since})
    data['total_exercise_mins'] = int(dur['total_mins']) if dur and dur['total_mins'] else 0

    # -- BMI ---
    bmi_row = fetch_one('''
        SELECT bmi, weight, bmi_category
        FROM bmi_history WHERE user_id = :uid
        ORDER BY recorded_at DESC LIMIT 1
    ''', {'uid': user_id})
    data['latest_bmi']      = float(bmi_row['bmi']) if bmi_row else None
    data['latest_weight']   = float(bmi_row['weight']) if bmi_row else None
    data['bmi_category']    = bmi_row['bmi_category'] if bmi_row else None

    # -- BMI trend (last 3 records) ---
    bmi_trend_rows = fetch_all('''
        SELECT bmi FROM bmi_history WHERE user_id = :uid
        ORDER BY recorded_at DESC LIMIT 3
    ''', {'uid': user_id})
    data['bmi_history'] = [float(r['bmi']) for r in bmi_trend_rows]

    # -- Medication adherence ---
    med_rows = fetch_all('''
        SELECT status, COUNT(*) AS cnt
        FROM medication_history
        WHERE user_id = :uid AND taken_at >= :since
        GROUP BY status
    ''', {'uid': user_id, 'since': since})
    med_stats = {r['status']: r['cnt'] for r in med_rows}
    taken   = med_stats.get('taken', 0)
    skipped = med_stats.get('skipped', 0)
    total_med = taken + skipped
    data['med_taken']     = taken
    data['med_skipped']   = skipped
    data['med_adherence'] = round(taken / total_med * 100, 1) if total_med > 0 else None

    # -- Skipped medication names ---
    skipped_rows = fetch_all('''
        SELECT DISTINCT medication_name FROM medication_history
        WHERE user_id = :uid AND taken_at >= :since AND status = 'skipped'
    ''', {'uid': user_id, 'since': since})
    data['skipped_meds'] = [r['medication_name'] for r in skipped_rows]

    # -- Stress trend (daily averages) ---
    stress_rows = fetch_all('''
        SELECT DATE(created_at) AS day, AVG(stress_level) AS avg_stress
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since AND stress_level IS NOT NULL
        GROUP BY DATE(created_at) ORDER BY day ASC
    ''', {'uid': user_id, 'since': since})
    data['stress_trend'] = [float(r['avg_stress']) for r in stress_rows]

    # -- Health goals ---
    goal_rows = fetch_all('''
        SELECT goal_type, target_value, current_value
        FROM health_goals
        WHERE user_id = :uid AND is_active = true
    ''', {'uid': user_id})
    data['goals'] = [
        {'type': r['goal_type'], 'target': r['target_value'], 'current': r['current_value']}
        for r in goal_rows
    ]

    return data


# ==============================================================================
# Tip generators -- each analyses one health dimension
# ==============================================================================

def _sleep_tips(data: dict) -> list[dict]:
    """Generate sleep habit coaching tips."""
    tips = []
    avg = data.get('avg_sleep')

    if avg is None:
        tips.append(_make_tip(
            'sleep', 'medium',
            'Start tracking your sleep',
            'Log your sleep hours each morning. Consistent tracking helps identify patterns '
            'and build better sleep habits. Even rough estimates are valuable.',
            'No sleep data recorded in the analysis window.',
            metric='sleep_hours', current=None, target='7-9 hrs',
        ))
        return tips

    # -- Severely low sleep ---
    if avg < 5:
        tips.append(_make_tip(
            'sleep', 'high',
            'Prioritize sleep -- your body needs rest',
            'You are averaging only {:.1f} hours/night. Start by setting a firm bedtime '
            '30 minutes earlier than usual. Avoid screens 1 hour before bed, and keep '
            'your bedroom cool and dark. Even adding 30 minutes can measurably improve '
            'cognitive performance and immune function.'.format(avg),
            'Average sleep is critically low at {:.1f} hrs/night.'.format(avg),
            metric='sleep_hours', current=round(avg, 1), target=7.0,
        ))
    elif avg < 7:
        deficit = 7.0 - avg
        tips.append(_make_tip(
            'sleep', 'medium',
            'Close your sleep gap',
            'You are {:.1f} hours short of the recommended 7 hours. Try going to bed '
            '15-20 minutes earlier this week. Consistent small improvements compound '
            'into significant health benefits over time.'.format(deficit),
            'Average sleep is {:.1f} hrs/night, below the 7-hour recommendation.'.format(avg),
            metric='sleep_hours', current=round(avg, 1), target=7.0,
        ))
    elif 7 <= avg <= 9:
        tips.append(_make_tip(
            'sleep', 'low',
            'Great sleep habits -- keep it up!',
            'Your average of {:.1f} hours/night is in the ideal range. To maintain this, '
            'keep a consistent wake-up time even on weekends, and avoid caffeine '
            'after 2 PM.'.format(avg),
            'Sleep is in the healthy 7-9 hour range.',
            metric='sleep_hours', current=round(avg, 1), target='7-9 hrs',
        ))

    # -- Sleep consistency ---
    std = data.get('sleep_std')
    if std is not None and std > 1.5:
        tips.append(_make_tip(
            'sleep', 'medium',
            'Stabilize your sleep schedule',
            'Your sleep times vary widely (std dev: {:.1f} hrs). An irregular schedule '
            'disrupts your circadian rhythm. Try to sleep and wake at the same time each '
            'day, even on weekends, within a 30-minute window.'.format(std),
            'High sleep variability detected (std dev {:.1f} hrs).'.format(std),
            metric='sleep_std', current=round(std, 1), target='< 1.0 hr',
        ))

    return tips


def _activity_tips(data: dict) -> list[dict]:
    """Generate physical activity coaching tips."""
    tips = []
    avg_steps = data.get('avg_steps')
    activity_days = data.get('activity_days', 0)
    exercise_mins = data.get('total_exercise_mins', 0)
    activity_types = data.get('activity_types', [])

    if avg_steps is None and activity_days == 0:
        tips.append(_make_tip(
            'activity', 'medium',
            'Get moving -- start with small steps',
            'No activity data found. Begin with just a 10-minute walk after meals. '
            'Studies show that even minimal movement significantly reduces health risks '
            'compared to a fully sedentary lifestyle.',
            'No activity data recorded.',
            metric='steps', current=0, target=8000,
        ))
        return tips

    # -- Step count coaching ---
    if avg_steps is not None:
        if avg_steps < 3000:
            tips.append(_make_tip(
                'activity', 'high',
                'Build up your daily steps gradually',
                'Your average of {:.0f} steps/day is very low. Set a realistic first '
                'goal of 4,000 steps -- that is roughly a 30-minute walk. Take the stairs, '
                'walk while on phone calls, or do a short walk after each meal.'.format(avg_steps),
                'Average steps ({:.0f}) far below 8,000 target.'.format(avg_steps),
                metric='steps', current=int(avg_steps), target=8000,
            ))
        elif avg_steps < 5000:
            tips.append(_make_tip(
                'activity', 'medium',
                'Push past 5,000 steps daily',
                'At {:.0f} steps/day, you are on the right track. Add a 15-minute walk '
                'to your routine -- morning or evening -- to push past 5,000. '
                'Pair it with a podcast or music to make it enjoyable.'.format(avg_steps),
                'Steps improving but still below target.'.format(avg_steps),
                metric='steps', current=int(avg_steps), target=8000,
            ))
        elif avg_steps < 8000:
            tips.append(_make_tip(
                'activity', 'low',
                'Almost at your step goal!',
                'You are averaging {:.0f} steps/day -- close to the 8,000 goal! '
                'Try a short evening stroll or take a walking meeting to bridge '
                'the gap.'.format(avg_steps),
                'Steps are close to the 8,000 daily target.',
                metric='steps', current=int(avg_steps), target=8000,
            ))
        else:
            tips.append(_make_tip(
                'activity', 'low',
                'Excellent step count -- consider a new challenge',
                'At {:.0f} steps/day, you are exceeding the target! Consider adding '
                'strength training, swimming, or yoga to complement your cardio.'.format(avg_steps),
                'Step goal consistently met.',
                metric='steps', current=int(avg_steps), target=8000,
            ))

    # -- Exercise variety ---
    if len(activity_types) <= 1 and activity_days >= 3:
        tips.append(_make_tip(
            'activity', 'low',
            'Add variety to your workouts',
            'You have been doing mostly {}. Cross-training reduces injury risk and '
            'improves overall fitness. Try adding yoga, swimming, or cycling '
            'once a week.'.format(activity_types[0] if activity_types else 'one activity type'),
            'Low exercise variety detected.',
            metric='activity_variety', current=len(activity_types), target='3+ types',
        ))

    # -- Weekly exercise minutes (WHO recommends 150 min/week) ---
    if exercise_mins < 150:
        tips.append(_make_tip(
            'activity', 'medium',
            'Aim for 150 minutes of exercise per week',
            'You have logged {} minutes this period. The WHO recommends at least '
            '150 minutes of moderate exercise per week. Break it into 5 sessions '
            'of 30 minutes each -- even brisk walking counts!'.format(exercise_mins),
            'Total exercise below WHO 150 min/week recommendation.',
            metric='exercise_mins', current=exercise_mins, target=150,
        ))

    return tips


def _stress_tips(data: dict) -> list[dict]:
    """Generate stress management coaching tips."""
    tips = []
    avg_stress = data.get('avg_stress')
    stress_trend = data.get('stress_trend', [])

    if avg_stress is None:
        return tips

    if avg_stress >= 7:
        tips.append(_make_tip(
            'stress', 'high',
            'Your stress needs immediate attention',
            'Average stress of {:.1f}/10 is very high. Start with the 4-7-8 breathing '
            'technique: inhale for 4 seconds, hold for 7, exhale for 8. Practice this '
            '3 times daily. Also consider reducing caffeine intake and scheduling '
            'at least one relaxing activity each day.'.format(avg_stress),
            'Chronic high stress ({:.1f}/10) detected.'.format(avg_stress),
            metric='stress_level', current=round(avg_stress, 1), target='<= 4',
        ))
    elif avg_stress >= 5:
        tips.append(_make_tip(
            'stress', 'medium',
            'Manage your stress proactively',
            'Your stress level ({:.1f}/10) is moderately elevated. Try a 10-minute '
            'guided meditation before bed, or take a walk outside during lunch. '
            'Nature exposure reduces cortisol levels measurably.'.format(avg_stress),
            'Stress moderately elevated at {:.1f}/10.'.format(avg_stress),
            metric='stress_level', current=round(avg_stress, 1), target='<= 4',
        ))
    else:
        tips.append(_make_tip(
            'stress', 'low',
            'Stress levels looking healthy',
            'Your stress is well-managed at {:.1f}/10. Keep it that way with regular '
            'breaks, physical activity, and social connections.'.format(avg_stress),
            'Stress in healthy range.',
            metric='stress_level', current=round(avg_stress, 1), target='<= 4',
        ))

    # -- Rising stress trend ---
    if len(stress_trend) >= 3:
        recent = stress_trend[-3:]
        if all(recent[i] < recent[i+1] for i in range(len(recent) - 1)):
            tips.append(_make_tip(
                'stress', 'medium',
                'Stress has been rising -- intervene now',
                'Your stress has increased over the last 3 days ({}->{}->{:.1f}). '
                'This is the time to intervene before it becomes chronic. Schedule '
                'something enjoyable today, even 15 minutes of a hobby.'.format(
                    f'{recent[0]:.1f}', f'{recent[1]:.1f}', recent[2]),
                'Consecutive daily increase in stress levels.',
                metric='stress_trend', current='rising', target='stable or decreasing',
            ))

    return tips


def _nutrition_bmi_tips(data: dict) -> list[dict]:
    """Generate nutrition and weight management tips."""
    tips = []
    bmi = data.get('latest_bmi')
    category = data.get('bmi_category')
    bmi_history = data.get('bmi_history', [])
    glucose = data.get('avg_glucose')

    if bmi is None:
        tips.append(_make_tip(
            'nutrition', 'medium',
            'Record your height and weight',
            'BMI tracking helps monitor your nutrition balance over time. '
            'Record your measurements to get personalized nutrition coaching.',
            'No BMI data available.',
            metric='bmi', current=None, target='18.5-24.9',
        ))
        return tips

    if category == 'Obese':
        tips.append(_make_tip(
            'nutrition', 'high',
            'Focus on sustainable weight management',
            'Your BMI is {:.1f} (obese range). Rather than crash diets, focus on: '
            '(1) reducing portion sizes by 20%, (2) replacing sugary drinks with water, '
            '(3) adding one serving of vegetables to each meal. Small sustainable changes '
            'lead to lasting results.'.format(bmi),
            'BMI {:.1f} is in the obese category.'.format(bmi),
            metric='bmi', current=round(bmi, 1), target='18.5-24.9',
        ))
    elif category == 'Overweight':
        tips.append(_make_tip(
            'nutrition', 'medium',
            'Make smart food swaps',
            'BMI of {:.1f} puts you in the overweight range. Try swapping refined carbs '
            'for whole grains, adding more protein to meals (keeps you full longer), '
            'and using smaller plates. Aim for a moderate calorie deficit '
            'of 300-500 cal/day.'.format(bmi),
            'BMI {:.1f} is overweight.'.format(bmi),
            metric='bmi', current=round(bmi, 1), target='18.5-24.9',
        ))
    elif category == 'Underweight':
        tips.append(_make_tip(
            'nutrition', 'medium',
            'Increase calorie intake healthily',
            'BMI of {:.1f} is underweight. Add calorie-dense nutritious foods: nuts, '
            'avocado, olive oil, and lean protein. Eat 5-6 smaller meals throughout '
            'the day instead of 3 large ones.'.format(bmi),
            'BMI {:.1f} is underweight.'.format(bmi),
            metric='bmi', current=round(bmi, 1), target='18.5-24.9',
        ))
    else:
        tips.append(_make_tip(
            'nutrition', 'low',
            'BMI is healthy -- maintain it',
            'Your BMI of {:.1f} is in the normal range. Maintain it with a balanced diet '
            'rich in fruits, vegetables, whole grains, and lean proteins.'.format(bmi),
            'BMI is in the healthy range.',
            metric='bmi', current=round(bmi, 1), target='18.5-24.9',
        ))

    # -- BMI trending up ---
    if len(bmi_history) >= 3:
        # bmi_history is newest-first
        if bmi_history[0] > bmi_history[1] > bmi_history[2]:
            tips.append(_make_tip(
                'nutrition', 'medium',
                'Weight is trending upward',
                'Your BMI has been increasing over recent measurements. '
                'Review your calorie intake and consider increasing your '
                'activity level slightly to stabilize.',
                'BMI trending up over last 3 records.',
                metric='bmi_trend', current='increasing', target='stable',
            ))

    # -- Glucose tips ---
    if glucose is not None:
        if glucose > 126:
            tips.append(_make_tip(
                'nutrition', 'high',
                'Monitor blood glucose closely',
                'Average glucose of {:.0f} mg/dL is in the diabetic range. '
                'Limit refined sugars, eat fiber-rich foods first in meals, '
                'and take a 15-minute walk after eating -- it can reduce '
                'post-meal glucose spikes by up to 30%.'.format(glucose),
                'Blood glucose elevated at {:.0f} mg/dL.'.format(glucose),
                metric='glucose_level', current=round(glucose, 1), target='70-100',
            ))
        elif glucose > 100:
            tips.append(_make_tip(
                'nutrition', 'medium',
                'Watch your sugar intake',
                'Average glucose of {:.0f} mg/dL is pre-diabetic territory. '
                'Choose complex carbs over simple sugars, pair carbs with '
                'protein or fat to slow absorption, and stay hydrated.'.format(glucose),
                'Blood glucose mildly elevated.'.format(glucose),
                metric='glucose_level', current=round(glucose, 1), target='70-100',
            ))

    return tips


def _vitals_tips(data: dict) -> list[dict]:
    """Generate tips based on vital sign patterns."""
    tips = []
    avg_hr = data.get('avg_hr')
    avg_sys = data.get('avg_systolic')
    avg_dia = data.get('avg_diastolic')

    # -- Heart rate ---
    if avg_hr is not None:
        if avg_hr > 90:
            tips.append(_make_tip(
                'vitals', 'medium',
                'Work on lowering your resting heart rate',
                'Your average heart rate of {:.0f} bpm is above the optimal range '
                '(60-80 bpm). Regular cardio exercise, deep breathing, and adequate '
                'hydration can help lower it over time. A lower resting HR is one of '
                'the best indicators of cardiovascular fitness.'.format(avg_hr),
                'Resting HR elevated at {:.0f} bpm.'.format(avg_hr),
                metric='heart_rate', current=round(avg_hr, 0), target='60-80 bpm',
            ))
        elif avg_hr < 55 and avg_hr > 0:
            tips.append(_make_tip(
                'vitals', 'medium',
                'Monitor your low heart rate',
                'Average HR of {:.0f} bpm is quite low. If you are an athlete this '
                'may be normal, but if you experience dizziness or fatigue, '
                'consult a cardiologist.'.format(avg_hr),
                'Low resting HR at {:.0f} bpm.'.format(avg_hr),
                metric='heart_rate', current=round(avg_hr, 0), target='60-80 bpm',
            ))

    # -- Blood pressure ---
    if avg_sys is not None and avg_dia is not None:
        if avg_sys >= 130 or avg_dia >= 80:
            tips.append(_make_tip(
                'vitals', 'high',
                'Take steps to lower blood pressure',
                'Your average BP is {:.0f}/{:.0f} mmHg -- above normal. '
                'The DASH diet (rich in fruits, vegetables, low-fat dairy) can '
                'lower BP by 8-14 mmHg. Also reduce sodium to under 2,300 mg/day, '
                'exercise regularly, and limit alcohol.'.format(avg_sys, avg_dia),
                'Blood pressure elevated at {:.0f}/{:.0f} mmHg.'.format(avg_sys, avg_dia),
                metric='blood_pressure',
                current=f'{avg_sys:.0f}/{avg_dia:.0f}',
                target='< 120/80',
            ))
        elif avg_sys < 120 and avg_dia < 80:
            tips.append(_make_tip(
                'vitals', 'low',
                'Blood pressure is excellent',
                'Your BP of {:.0f}/{:.0f} mmHg is in the normal range. '
                'Keep it that way with regular exercise, a balanced diet, '
                'and stress management.'.format(avg_sys, avg_dia),
                'BP in healthy range.',
                metric='blood_pressure',
                current=f'{avg_sys:.0f}/{avg_dia:.0f}',
                target='< 120/80',
            ))

    return tips


def _medication_tips(data: dict) -> list[dict]:
    """Generate medication adherence coaching tips."""
    tips = []
    adherence = data.get('med_adherence')
    skipped = data.get('skipped_meds', [])

    if adherence is None:
        return tips

    if adherence < 70:
        tips.append(_make_tip(
            'medication', 'high',
            'Medication adherence needs improvement',
            'You have taken only {:.0f}% of your medications on time. '
            'Set phone alarms for each dose, use a pill organizer, and pair '
            'taking medicine with an existing habit (like brushing teeth). '
            'Skipped meds: {}.'.format(adherence, ', '.join(skipped[:3]) or 'various'),
            'Medication adherence at {:.0f}%.'.format(adherence),
            metric='med_adherence', current=f'{adherence:.0f}%', target='>= 90%',
        ))
    elif adherence < 90:
        tips.append(_make_tip(
            'medication', 'medium',
            'Improve medication consistency',
            'Adherence is at {:.0f}% -- good but not optimal. Missing doses '
            'reduces treatment effectiveness. Try keeping medications visible, '
            'or use this app\'s reminder feature to stay on track.'.format(adherence),
            'Medication adherence slightly below target.',
            metric='med_adherence', current=f'{adherence:.0f}%', target='>= 90%',
        ))
    else:
        tips.append(_make_tip(
            'medication', 'low',
            'Excellent medication adherence!',
            'You are at {:.0f}% adherence -- outstanding! Consistent medication '
            'use is one of the most impactful health habits. Keep it up.'.format(adherence),
            'Adherence is excellent.',
            metric='med_adherence', current=f'{adherence:.0f}%', target='>= 90%',
        ))

    return tips


def _consistency_tips(data: dict, days: int) -> list[dict]:
    """Encourage consistent health data logging."""
    tips = []
    vitals_days = data.get('vitals_days', 0)
    activity_days = data.get('activity_days', 0)

    if vitals_days == 0 and activity_days == 0:
        tips.append(_make_tip(
            'consistency', 'high',
            'Start logging your health data daily',
            'No health data was found for the past {} days. The coaching engine '
            'works best with daily data. Start by logging just your sleep hours '
            'and a brief vitals check each morning -- it takes under 2 minutes.'.format(days),
            'No data logged in {} days.'.format(days),
            metric='logging_days', current=0, target=days,
        ))
        return tips

    best_days = max(vitals_days, activity_days)
    ratio = best_days / days if days > 0 else 0

    if ratio < 0.4:
        tips.append(_make_tip(
            'consistency', 'medium',
            'Log health data more consistently',
            'Data recorded on only {}/{} days. Try setting a daily reminder at '
            'the same time each day. Consistent logging reveals patterns that '
            'sporadic recording misses.'.format(best_days, days),
            'Low logging consistency ({:.0f}%).'.format(ratio * 100),
            metric='logging_days', current=best_days, target=days,
        ))
    elif ratio < 0.7:
        tips.append(_make_tip(
            'consistency', 'low',
            'Good logging -- aim for daily',
            'You have logged on {}/{} days. Push for daily tracking to get '
            'the most accurate coaching insights.'.format(best_days, days),
            'Moderate logging consistency.',
            metric='logging_days', current=best_days, target=days,
        ))

    return tips


def _goal_tips(data: dict) -> list[dict]:
    """Coach toward active health goals."""
    tips = []
    goals = data.get('goals', [])

    for goal in goals:
        gtype = goal['type']
        target = goal['target']
        current = goal['current']
        if target <= 0:
            continue
        progress = current / target

        if progress >= 1.0:
            tips.append(_make_tip(
                'activity', 'low',
                '{} goal achieved!'.format(gtype.replace('_', ' ').title()),
                'You have reached your {} goal of {}! Consider raising the '
                'bar slightly to keep progressing.'.format(gtype.replace('_', ' '), target),
                'Goal met ({}/{}).'.format(current, target),
                metric=gtype, current=current, target=target,
            ))
        elif progress < 0.5:
            tips.append(_make_tip(
                'activity', 'medium',
                'Your {} goal needs attention'.format(gtype.replace('_', ' ')),
                'Progress is at {:.0f}% ({}/{}) for your {} goal. '
                'Break it into smaller daily milestones to build momentum.'.format(
                    progress * 100, current, target, gtype.replace('_', ' ')),
                'Goal progress below 50%.',
                metric=gtype, current=current, target=target,
            ))

    return tips


# ==============================================================================
# Focus area determination
# ==============================================================================

def _determine_focus_area(tips: list[dict]) -> str:
    """Identify the primary area needing attention based on tip priorities."""
    category_scores: dict[str, int] = {}
    for tip in tips:
        cat = tip['category']
        score = _PRIORITY_RANK.get(tip['priority'], 0)
        category_scores[cat] = category_scores.get(cat, 0) + score

    if not category_scores:
        return 'general'

    return max(category_scores, key=category_scores.get)


# ==============================================================================
# Public API
# ==============================================================================

def generate_habit_tips(user_id: int, days: int = 7) -> dict:
    """
    Analyse the user's health data and generate personalised daily
    habit coaching tips.
    """
    since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    try:
        data = _fetch_health_profile(user_id, since)
    except Exception as e:
        return {
            'tips': [_make_tip(
                'system', 'high', 'Database unavailable',
                'Could not connect to the health database to generate coaching tips.',
                'Database connection failed.',
            )],
            'profile': {},
            'streak': {'days_logged': 0, 'total_days': days},
            'focus_area': 'system',
        }

    # -- Collect tips from all dimensions ---
    all_tips: list[dict] = []
    all_tips.extend(_sleep_tips(data))
    all_tips.extend(_activity_tips(data))
    all_tips.extend(_stress_tips(data))
    all_tips.extend(_nutrition_bmi_tips(data))
    all_tips.extend(_vitals_tips(data))
    all_tips.extend(_medication_tips(data))
    all_tips.extend(_consistency_tips(data, days))
    all_tips.extend(_goal_tips(data))

    # -- Sort: high priority first ---
    all_tips.sort(key=lambda t: _PRIORITY_RANK.get(t['priority'], 0), reverse=True)

    # -- Build profile summary ---
    profile = {
        'avg_sleep':      round(data['avg_sleep'], 1) if data.get('avg_sleep') else None,
        'avg_steps':      int(data['avg_steps']) if data.get('avg_steps') else None,
        'avg_stress':     round(data['avg_stress'], 1) if data.get('avg_stress') else None,
        'avg_heart_rate': round(data['avg_hr'], 0) if data.get('avg_hr') else None,
        'bmi':            round(data['latest_bmi'], 1) if data.get('latest_bmi') else None,
        'bmi_category':   data.get('bmi_category'),
        'med_adherence':  data.get('med_adherence'),
        'exercise_mins':  data.get('total_exercise_mins', 0),
    }

    streak = {
        'vitals_days':   data.get('vitals_days', 0),
        'activity_days': data.get('activity_days', 0),
        'total_days':    days,
    }

    focus = _determine_focus_area(all_tips)

    return {
        'tips':       all_tips,
        'profile':    profile,
        'streak':     streak,
        'focus_area': focus,
    }


# ==============================================================================
# CLI quick-test
# ==============================================================================
if __name__ == '__main__':
    import sys
    uid  = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7

    result = generate_habit_tips(uid, days)
    print(f'\n-- Habit Coaching Tips: user_id={uid}, last {days} days --\n')
    print(f'  Focus area: {result["focus_area"]}')
    print(f'  Profile: {result["profile"]}')
    print(f'  Streak: {result["streak"]}')
    print(f'\n  {len(result["tips"])} tips generated:\n')
    for i, t in enumerate(result['tips'], 1):
        print(f'  {i}. [{t["priority"].upper():6s}] [{t["category"]:12s}] {t["title"]}')
        print(f'     {t["tip"][:120]}...' if len(t['tip']) > 120 else f'     {t["tip"]}')
        print(f'     Reason: {t["reason"]}')
        if t.get('metric'):
            print(f'     {t["metric"]}: {t["current"]} -> target: {t["target"]}')
        print()
