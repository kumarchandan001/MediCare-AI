"""
utils/risk_engine.py
─────────────────────
Rule-based health risk prediction engine.

Public API:
    calculate_risk(user_id, days=7)  ->  dict

Returns:
    {
      "score":   int,           # 0 (excellent) – 100 (critical)
      "level":   str,           # "low" | "moderate" | "high" | "critical"
      "reasons": list[str],     # human-readable explanations
      "factors": dict,          # individual factor scores + values
    }

Scoring dimensions (each contributes a weighted sub-score):
  ┌────────────────────┬────────┬───────────────────────────────────┐
  │ Factor             │ Weight │ Ideal range                       │
  ├────────────────────┼────────┼───────────────────────────────────┤
  │ BMI                │ 20 %   │ 18.5 – 24.9                      │
  │ Sleep              │ 15 %   │ 7 – 9 hours/night                │
  │ Steps / Activity   │ 15 %   │ ≥ 8,000 steps/day                │
  │ Heart rate         │ 12 %   │ 60 – 100 bpm (resting)           │
  │ Blood pressure     │ 12 %   │ systolic < 120, diastolic < 80   │
  │ Stress             │ 10 %   │ ≤ 4 / 10                         │
  │ Blood glucose      │ 8 %    │ 70 – 140 mg/dL                   │
  │ Logging consistency│ 8 %    │ data logged most days             │
  └────────────────────┴────────┴───────────────────────────────────┘

The total is normalised to 0–100 where higher = worse.
Missing data receives a neutral-to-mild penalty rather than being ignored,
so the function never returns an artificially low score just because
a user hasn't logged anything.

Uses SQLAlchemy via utils.db_helper (PostgreSQL compatible).
"""

from __future__ import annotations

import json
import math
import os
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from utils.db_helper import fetch_one, fetch_all


# ─────────────────────────────────────────────────────────────────────────────
# Weight table — each factor contributes to the overall score
# ─────────────────────────────────────────────────────────────────────────────
_WEIGHTS = {
    'bmi':         0.30,  # Elevated logic for major risk indicator
    'sleep':       0.20,
    'steps':       0.20,
    'heart_rate':  0.10,
    'blood_pressure': 0.10,
    'stress':      0.05,
    'glucose':     0.03,
    'consistency': 0.02,
}

# Verify weights sum to 1.0
assert abs(sum(_WEIGHTS.values()) - 1.0) < 1e-9, "Weights must sum to 1.0"


# ─────────────────────────────────────────────────────────────────────────────
# Per-factor scoring functions
#
# Each returns (sub_score_0_to_100, reason_str | None)
# 0 = perfect, 100 = worst possible
# ─────────────────────────────────────────────────────────────────────────────

def _score_bmi(bmi: float | None) -> tuple[float, str | None]:
    """
    Ideal: 18.5–24.9
    ±5 points from boundary → proportional penalty, capped at 100.
    """
    if bmi is None:
        return 40.0, 'No BMI data available — record your height and weight for accurate assessment.'

    if 18.5 <= bmi <= 24.9:
        return 0.0, None

    if bmi < 18.5:
        diff = 18.5 - bmi
        score = min(100.0, diff * 15)
        return score, f'BMI is {bmi:.1f} (underweight) — healthy range is 18.5–24.9.'
    else:
        diff = bmi - 24.9
        score = min(100.0, diff * 10)
        if bmi >= 30:
            label = 'obese'
        else:
            label = 'overweight'
        return score, f'BMI is {bmi:.1f} ({label}) — healthy range is 18.5–24.9.'


def _score_sleep(avg_hours: float | None) -> tuple[float, str | None]:
    """
    Ideal: 7–9 hours.
    Below 5 or above 11 → very high penalty.
    """
    if avg_hours is None:
        return 40.0, 'No sleep data recorded — log sleep hours for better risk assessment.'

    if 7.0 <= avg_hours <= 9.0:
        return 0.0, None

    if avg_hours < 7.0:
        deficit = 7.0 - avg_hours
        score = min(100.0, deficit * 25)
        return score, f'Average sleep is only {avg_hours:.1f} hrs/night — recommended is 7–9 hours.'
    else:
        excess = avg_hours - 9.0
        score = min(100.0, excess * 20)
        return score, f'Average sleep is {avg_hours:.1f} hrs/night — oversleeping may indicate health issues.'


def _score_steps(avg_steps: float | None) -> tuple[float, str | None]:
    """
    Ideal: ≥ 8,000 steps/day.
    Below 2,000 → very high penalty.
    """
    if avg_steps is None:
        return 40.0, 'No step data recorded — track daily steps for activity assessment.'

    if avg_steps >= 8000:
        return 0.0, None

    # Linear penalty from 8000 down to 0
    score = min(100.0, ((8000 - avg_steps) / 8000) * 100)
    if avg_steps < 2000:
        return score, f'Average steps is very low ({avg_steps:.0f}/day) — sedentary lifestyle is a major risk factor.'
    elif avg_steps < 5000:
        return score, f'Average steps is {avg_steps:.0f}/day — aim for at least 8,000 steps daily.'
    else:
        return score, f'Steps are slightly below target ({avg_steps:.0f}/day) — close to the 8,000 goal!'


def _score_heart_rate(avg_hr: float | None) -> tuple[float, str | None]:
    """
    Ideal resting HR: 60–100 bpm (60–80 is excellent).
    Below 50 or above 120 → significant penalty.
    """
    if avg_hr is None:
        return 30.0, None  # mild penalty, no alarming message

    if 60 <= avg_hr <= 80:
        return 0.0, None
    elif 80 < avg_hr <= 100:
        score = (avg_hr - 80) * 2.5  # 0–50
        return score, f'Resting heart rate is {avg_hr:.0f} bpm — slightly elevated (ideal: 60–80 bpm).'
    elif avg_hr > 100:
        score = min(100.0, 50 + (avg_hr - 100) * 2)
        return score, f'Resting heart rate is {avg_hr:.0f} bpm — tachycardia zone, consult a doctor.'
    else:  # < 60
        score = min(100.0, (60 - avg_hr) * 3)
        if avg_hr < 50:
            return score, f'Resting heart rate is {avg_hr:.0f} bpm — bradycardia, seek medical advice.'
        return score, None  # 50–60 is fine for athletes


def _score_blood_pressure(avg_sys: float | None,
                           avg_dia: float | None) -> tuple[float, str | None]:
    """
    Ideal: <120 / <80 mmHg   (normal)
    Elevated: 120–129 / <80
    Stage 1 hypertension: 130–139 / 80–89
    Stage 2 hypertension: ≥140 / ≥90
    """
    if avg_sys is None or avg_dia is None:
        return 30.0, None

    bp_str = f'{avg_sys:.0f}/{avg_dia:.0f} mmHg'
    score = 0.0

    # Systolic component
    if avg_sys < 120:
        pass
    elif avg_sys < 130:
        score += 20
    elif avg_sys < 140:
        score += 45
    else:
        score += 70 + min(30.0, (avg_sys - 140) * 1.5)

    # Diastolic component (combined)
    if avg_dia >= 90:
        score = max(score, 70 + min(30.0, (avg_dia - 90) * 2))
    elif avg_dia >= 80:
        score = max(score, 45)

    score = min(100.0, score)

    if score == 0:
        return 0.0, None
    elif score < 30:
        return score, f'Blood pressure is slightly elevated ({bp_str}).'
    elif score < 60:
        return score, f'Blood pressure is in hypertension stage 1 range ({bp_str}) — lifestyle changes recommended.'
    else:
        return score, f'Blood pressure is high ({bp_str}) — consult a healthcare provider.'


def _score_stress(avg_stress: float | None) -> tuple[float, str | None]:
    """
    Scale: 1–10.  Ideal: ≤ 4.
    Level 7+ → high penalty.
    """
    if avg_stress is None:
        return 25.0, None

    if avg_stress <= 4:
        return 0.0, None

    score = min(100.0, (avg_stress - 4) * 16.7)
    if avg_stress >= 7:
        return score, f'Average stress level is {avg_stress:.1f}/10 — chronic stress increases health risks significantly.'
    else:
        return score, f'Stress level is moderately elevated ({avg_stress:.1f}/10) — consider relaxation practices.'


def _score_glucose(avg_glucose: float | None) -> tuple[float, str | None]:
    """
    Normal fasting: 70–100 mg/dL.
    Pre-diabetic: 100–126 mg/dL.
    Diabetic: ≥126 mg/dL.
    Post-meal readings up to 140 are acceptable.
    """
    if avg_glucose is None:
        return 25.0, None

    if 70 <= avg_glucose <= 100:
        return 0.0, None
    elif avg_glucose < 70:
        score = min(100.0, (70 - avg_glucose) * 3)
        return score, f'Blood glucose is low ({avg_glucose:.0f} mg/dL) — hypoglycaemia risk.'
    elif avg_glucose <= 140:
        score = (avg_glucose - 100) * 1.5
        if avg_glucose > 126:
            return score, f'Blood glucose is {avg_glucose:.0f} mg/dL — in the diabetic range, seek guidance.'
        return score, f'Blood glucose is slightly elevated ({avg_glucose:.0f} mg/dL) — pre-diabetic range.'
    else:
        score = min(100.0, 60 + (avg_glucose - 140) * 1)
        return score, f'Blood glucose is high ({avg_glucose:.0f} mg/dL) — consult a doctor.'


def _score_consistency(data_days: int, total_days: int) -> tuple[float, str | None]:
    """
    Logging consistency: data on most days → low risk penalty.
    No data at all → moderate penalty (can't assess true risk).
    """
    if total_days == 0:
        return 50.0, 'No health data recorded — start logging for accurate risk prediction.'

    ratio = data_days / total_days
    if ratio >= 0.7:
        return 0.0, None

    score = min(100.0, (1 - ratio) * 80)
    if data_days == 0:
        return 60.0, 'No health data recorded recently — risk score may be inaccurate.'
    return score, f'Health data logged on only {data_days}/{total_days} days — more consistent tracking improves accuracy.'


# ─────────────────────────────────────────────────────────────────────────────
# Data fetchers
# ─────────────────────────────────────────────────────────────────────────────

def _to_float(val) -> float | None:
    """Safely convert a DB value (which may be Decimal) to float."""
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _fetch_averages(user_id: int, since: str) -> dict[str, Any]:
    """
    Pull averaged metrics from health_monitoring, activity_tracking,
    and bmi_history for the given window.
    """
    data: dict[str, Any] = {}

    # Health monitoring averages
    row = fetch_one('''
        SELECT
            AVG(heart_rate)       AS avg_hr,
            AVG(oxygen_level)     AS avg_o2,
            AVG(body_temperature) AS avg_temp,
            AVG(glucose_level)    AS avg_glucose,
            AVG(stress_level)     AS avg_stress,
            AVG(sleep_hours)      AS avg_sleep,
            COUNT(DISTINCT DATE(created_at)) AS vitals_days
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since
    ''', {'uid': user_id, 'since': since})
    if row:
        data['avg_hr']      = _to_float(row['avg_hr'])
        data['avg_o2']      = _to_float(row['avg_o2'])
        data['avg_temp']    = _to_float(row['avg_temp'])
        data['avg_glucose'] = _to_float(row['avg_glucose'])
        data['avg_stress']  = _to_float(row['avg_stress'])
        data['avg_sleep']   = _to_float(row['avg_sleep'])
        data['vitals_days'] = int(row['vitals_days'] or 0)

    # Blood pressure (JSON field)
    bp_rows = fetch_all('''
        SELECT blood_pressure
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since AND blood_pressure IS NOT NULL
    ''', {'uid': user_id, 'since': since})
    sys_vals, dia_vals = [], []
    for bprow in bp_rows:
        try:
            bp = json.loads(bprow['blood_pressure'])
            if 'systolic'  in bp: sys_vals.append(float(bp['systolic']))
            if 'diastolic' in bp: dia_vals.append(float(bp['diastolic']))
        except Exception:
            pass
    data['avg_systolic']  = sum(sys_vals) / len(sys_vals) if sys_vals else None
    data['avg_diastolic'] = sum(dia_vals) / len(dia_vals) if dia_vals else None

    # Activity averages (daily totals → then averaged over active days)
    # Also include steps from daily_health_logs for comprehensive tracking
    act = fetch_one('''
        SELECT
            AVG(daily_steps) AS avg_steps,
            COUNT(*) AS activity_days
        FROM (
            SELECT SUM(steps) AS daily_steps
            FROM activity_tracking
            WHERE user_id = :uid AND activity_date >= :since
            GROUP BY activity_date
        ) AS daily
    ''', {'uid': user_id, 'since': since})

    avg_steps_activity = _to_float(act['avg_steps']) if act else None
    activity_days = int(act['activity_days'] or 0) if act else 0

    # If no activity_tracking data, fall back to daily_health_logs steps
    if avg_steps_activity is None:
        daily_steps = fetch_one('''
            SELECT AVG(steps) AS avg_steps, COUNT(*) AS days
            FROM daily_health_logs
            WHERE user_id = :uid AND log_date >= :since AND steps IS NOT NULL AND steps > 0
        ''', {'uid': user_id, 'since': since})
        if daily_steps and daily_steps['avg_steps']:
            avg_steps_activity = _to_float(daily_steps['avg_steps'])
            activity_days = int(daily_steps['days'] or 0)

    data['avg_steps']     = avg_steps_activity
    data['activity_days'] = activity_days

    # Latest BMI
    bmi_row = fetch_one('''
        SELECT bmi, weight
        FROM bmi_history
        WHERE user_id = :uid
        ORDER BY recorded_at DESC
        LIMIT 1
    ''', {'uid': user_id})
    data['latest_bmi']    = _to_float(bmi_row['bmi']) if bmi_row else None
    data['latest_weight'] = _to_float(bmi_row['weight']) if bmi_row else None

    return data


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def calculate_risk(user_id: int, days: int = 7) -> dict:
    """Calculate a composite health risk score for `user_id`."""
    since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    try:
        data = _fetch_averages(user_id, since)
    except Exception as e:
        return {
            'score': -1, 'level': 'unknown',
            'reasons': [f'Could not connect to the database: {e}'],
            'factors': {},
        }

    # ── Compute per-factor scores ─────────────────────────────────────────────
    vitals_days  = data.get('vitals_days', 0)
    activity_days = data.get('activity_days', 0)
    total_data_days = max(vitals_days, activity_days)

    factor_results: dict[str, dict] = {}
    reasons: list[str] = []

    def _record(name: str, score: float, reason: str | None, value: Any):
        factor_results[name] = {
            'score':  round(score, 1),
            'value':  value,
            'weight': _WEIGHTS[name],
        }
        if reason:
            reasons.append(reason)

    # BMI
    s, r = _score_bmi(data.get('latest_bmi'))
    _record('bmi', s, r, data.get('latest_bmi'))

    # Sleep
    s, r = _score_sleep(data.get('avg_sleep'))
    _record('sleep', s, r, round(data['avg_sleep'], 1) if data.get('avg_sleep') else None)

    # Steps
    s, r = _score_steps(data.get('avg_steps'))
    _record('steps', s, r, round(data['avg_steps'], 0) if data.get('avg_steps') else None)

    # Heart rate
    s, r = _score_heart_rate(data.get('avg_hr'))
    _record('heart_rate', s, r, round(data['avg_hr'], 1) if data.get('avg_hr') else None)

    # Blood pressure
    s, r = _score_blood_pressure(data.get('avg_systolic'), data.get('avg_diastolic'))
    bp_val = None
    if data.get('avg_systolic') and data.get('avg_diastolic'):
        bp_val = f"{data['avg_systolic']:.0f}/{data['avg_diastolic']:.0f}"
    _record('blood_pressure', s, r, bp_val)

    # Stress
    s, r = _score_stress(data.get('avg_stress'))
    _record('stress', s, r, round(data['avg_stress'], 1) if data.get('avg_stress') else None)

    # Glucose
    s, r = _score_glucose(data.get('avg_glucose'))
    _record('glucose', s, r, round(data['avg_glucose'], 1) if data.get('avg_glucose') else None)

    # Consistency
    s, r = _score_consistency(total_data_days, days)
    _record('consistency', s, r, f'{total_data_days}/{days} days')

    # ── Composite weighted score ──────────────────────────────────────────────
    composite = sum(
        factor_results[f]['score'] * _WEIGHTS[f]
        for f in _WEIGHTS
    )
    score = int(round(min(100.0, max(0.0, composite))))

    # ── Classify risk level ───────────────────────────────────────────────────
    if score <= 20:
        level = 'low'
    elif score <= 45:
        level = 'moderate'
    elif score <= 70:
        level = 'high'
    else:
        level = 'critical'

    # ── Sort reasons: most impactful first ────────────────────────────────────
    # (factors with higher weighted contribution come first)
    factor_scores = {
        f: factor_results[f]['score'] * _WEIGHTS[f]
        for f in factor_results
    }
    # Re-sort reasons by their factor's contribution (descending)
    reason_to_factor = {}
    for f, info in factor_results.items():
        for r in reasons:
            key = f.lower().replace('_', ' ')
            # heuristic: match reason to factor by keyword
            if any(kw in r.lower() for kw in _factor_keywords(f)):
                reason_to_factor[r] = f
                break

    sorted_reasons = sorted(
        reasons,
        key=lambda r: factor_scores.get(reason_to_factor.get(r, ''), 0),
        reverse=True
    )

    # Add a summary line at the top
    summary = _summary_line(score, level, days)
    sorted_reasons.insert(0, summary)

    return {
        'score':   score,
        'level':   level,
        'reasons': sorted_reasons,
        'factors': factor_results,
    }


def _factor_keywords(factor: str) -> list[str]:
    """Return keywords to match a reason string to its factor."""
    return {
        'bmi':            ['bmi'],
        'sleep':          ['sleep'],
        'steps':          ['step', 'sedentary', 'activity'],
        'heart_rate':     ['heart rate', 'bpm', 'tachycardia', 'bradycardia'],
        'blood_pressure': ['blood pressure', 'hypertension', 'mmhg'],
        'stress':         ['stress'],
        'glucose':        ['glucose', 'diabetic', 'hypoglycaemia'],
        'consistency':    ['logged', 'recorded', 'tracking', 'data'],
    }.get(factor, [factor])


def _summary_line(score: int, level: str, days: int) -> str:
    """Return a one-line overall summary."""
    emoji = {'low': '🟢', 'moderate': '🟡', 'high': '🟠', 'critical': '🔴'}.get(level, '⚪')
    desc  = {
        'low':      'Your overall health risk is low. Keep up the good habits!',
        'moderate': 'Your health risk is moderate. Some areas need attention.',
        'high':     'Your health risk is elevated. Review the factors below and consult a healthcare provider.',
        'critical': 'Your health risk is critically high. Seek medical attention promptly.',
    }.get(level, '')
    return f'{emoji} Risk score: {score}/100 ({level.upper()}) — {desc}'


# ─────────────────────────────────────────────────────────────────────────────
# CLI quick-test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    uid  = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7

    result = calculate_risk(uid, days)
    print(f'\n── Health Risk Assessment: user_id={uid}, last {days} days ──\n')
    print(f'  Score : {result["score"]}/100')
    print(f'  Level : {result["level"]}')
    print(f'\n  Reasons:')
    for r in result['reasons']:
        print(f'    • {r}')
    print(f'\n  Factor details:')
    for f, info in result['factors'].items():
        print(f'    {f:20s}  score={info["score"]:5.1f}  weight={info["weight"]:.0%}  value={info["value"]}')
