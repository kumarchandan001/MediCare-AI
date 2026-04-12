"""
services/alert_service.py
──────────────────────────
Smart health alert generation engine.

Public API:
    generate_alerts(user_id, days=7)  ->  list[dict]

Each alert dict:
    {
      "alert_type":  str,         # category of the alert
      "severity":    str,         # "low" | "medium" | "high" | "critical"
      "title":       str,         # short headline
      "message":     str,         # detailed explanation
      "metric":      str | None,  # metric name that triggered it
      "value":       Any,         # observed value
      "threshold":   Any,         # threshold that was breached
    }

Alert categories:
  vital_threshold   — HR, BP, O2, temp, glucose outside safe range
  sleep_deficit     — sleep below minimum
  activity_low      — step count dangerously low
  stress_elevated   — chronic stress detected
  bmi_warning       — BMI outside healthy range
  medication_missed — doses skipped recently
  risk_flag         — composite risk score in high/critical
  trend_warning     — metric worsening over consecutive days
  consistency       — no data logged recently

Uses only stdlib + SQLAlchemy (via utils.db_helper).
Re-uses risk_engine and trend_analysis where appropriate.
"""

from __future__ import annotations

import json
import os
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from utils.db_helper import fetch_one, fetch_all, execute_sql, table_exists


# ─────────────────────────────────────────────────────────────────────────────
# Threshold rule definitions
# ─────────────────────────────────────────────────────────────────────────────
# (metric, operator, threshold, severity, title_template, message_template)
# Templates use {value} and {threshold} placeholders.

_VITAL_RULES: list[dict] = [
    # ── Heart rate ────────────────────────────────────────────────────────────
    {
        'metric': 'heart_rate', 'op': '>', 'threshold': 120,
        'severity': 'critical',
        'title': 'Heart rate critically high',
        'message': 'Your heart rate is {value} bpm (threshold: {threshold} bpm). '
                   'Seek medical attention if symptoms persist.',
    },
    {
        'metric': 'heart_rate', 'op': '>', 'threshold': 100,
        'severity': 'high',
        'title': 'Heart rate elevated',
        'message': 'Your heart rate is {value} bpm — above the normal resting range '
                   '(60–100 bpm). Monitor and rest.',
    },
    {
        'metric': 'heart_rate', 'op': '<', 'threshold': 50,
        'severity': 'high',
        'title': 'Heart rate unusually low',
        'message': 'Your heart rate is {value} bpm — bradycardia range. '
                   'Consult a healthcare provider.',
    },
    # ── Blood oxygen ─────────────────────────────────────────────────────────
    {
        'metric': 'oxygen_level', 'op': '<', 'threshold': 90,
        'severity': 'critical',
        'title': 'Blood oxygen critically low',
        'message': 'SpO₂ is {value}% (critical threshold: {threshold}%). '
                   'Seek immediate medical help.',
    },
    {
        'metric': 'oxygen_level', 'op': '<', 'threshold': 95,
        'severity': 'high',
        'title': 'Blood oxygen below normal',
        'message': 'SpO₂ is {value}% — below the safe level of 95%. Monitor closely.',
    },
    # ── Body temperature ─────────────────────────────────────────────────────
    {
        'metric': 'body_temperature', 'op': '>', 'threshold': 100.4,
        'severity': 'high',
        'title': 'Fever detected',
        'message': 'Body temperature is {value}°F — above the fever threshold of {threshold}°F. '
                   'Consider medication and consult a doctor if persistent.',
    },
    {
        'metric': 'body_temperature', 'op': '>', 'threshold': 103.0,
        'severity': 'critical',
        'title': 'High fever — seek medical attention',
        'message': 'Body temperature is {value}°F — dangerously high. '
                   'Seek immediate medical care.',
    },
    {
        'metric': 'body_temperature', 'op': '<', 'threshold': 96.0,
        'severity': 'medium',
        'title': 'Body temperature low',
        'message': 'Body temperature is {value}°F — below normal. '
                   'Hypothermia risk if sustained.',
    },
    # ── Blood glucose ────────────────────────────────────────────────────────
    {
        'metric': 'glucose_level', 'op': '>', 'threshold': 180,
        'severity': 'critical',
        'title': 'Blood glucose dangerously high',
        'message': 'Blood glucose is {value} mg/dL — significantly above safe range. '
                   'Seek medical attention.',
    },
    {
        'metric': 'glucose_level', 'op': '>', 'threshold': 140,
        'severity': 'high',
        'title': 'Blood glucose elevated',
        'message': 'Blood glucose is {value} mg/dL — above the normal post-meal threshold '
                   'of {threshold} mg/dL.',
    },
    {
        'metric': 'glucose_level', 'op': '<', 'threshold': 70,
        'severity': 'high',
        'title': 'Blood glucose low — hypoglycaemia risk',
        'message': 'Blood glucose is {value} mg/dL — below {threshold} mg/dL. '
                   'Eat fast-acting carbohydrates and monitor.',
    },
    # ── Stress ───────────────────────────────────────────────────────────────
    {
        'metric': 'stress_level', 'op': '>=', 'threshold': 8,
        'severity': 'high',
        'title': 'Stress level very high',
        'message': 'Your stress level is {value}/10 — chronic high stress severely impacts '
                   'cardiovascular health. Consider professional help.',
    },
    {
        'metric': 'stress_level', 'op': '>=', 'threshold': 6,
        'severity': 'medium',
        'title': 'Stress level elevated',
        'message': 'Your stress level is {value}/10 — above comfortable range. '
                   'Try breathing exercises or a walk.',
    },
]

# Severity ordering for deduplication (keep highest)
_SEVERITY_RANK = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}


def _compare(value: float, op: str, threshold: float) -> bool:
    """Evaluate a comparison operator."""
    if op == '>':  return value > threshold
    if op == '<':  return value < threshold
    if op == '>=': return value >= threshold
    if op == '<=': return value <= threshold
    if op == '==': return value == threshold
    return False


# ─────────────────────────────────────────────────────────────────────────────
# Data fetchers
# ─────────────────────────────────────────────────────────────────────────────

def _latest_vitals(user_id: int, since: str) -> dict[str, float]:
    """Return the most recent value for each vital metric."""
    row = fetch_one('''
        SELECT * FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since
        ORDER BY created_at DESC LIMIT 1
    ''', {'uid': user_id, 'since': since})
    if not row:
        return {}

    vitals: dict[str, float] = {}
    for col in ['heart_rate', 'oxygen_level', 'body_temperature',
                'glucose_level', 'stress_level', 'sleep_hours']:
        if row[col] is not None:
            vitals[col] = float(row[col])

    # Blood pressure
    if row['blood_pressure']:
        try:
            bp = json.loads(row['blood_pressure'])
            if 'systolic'  in bp: vitals['systolic']  = float(bp['systolic'])
            if 'diastolic' in bp: vitals['diastolic'] = float(bp['diastolic'])
        except Exception:
            pass

    return vitals


def _avg_sleep(user_id: int, since: str) -> float | None:
    """Average sleep over the window."""
    row = fetch_one('''
        SELECT AVG(sleep_hours) AS avg_sleep
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since AND sleep_hours IS NOT NULL
    ''', {'uid': user_id, 'since': since})
    return float(row['avg_sleep']) if row and row['avg_sleep'] else None


def _avg_steps(user_id: int, since: str) -> float | None:
    """Average daily steps."""
    row = fetch_one('''
        SELECT AVG(daily_steps) AS avg_steps FROM (
            SELECT SUM(steps) AS daily_steps
            FROM activity_tracking
            WHERE user_id = :uid AND activity_date >= :since
            GROUP BY activity_date
        ) AS daily
    ''', {'uid': user_id, 'since': since})
    return float(row['avg_steps']) if row and row['avg_steps'] else None


def _latest_bmi(user_id: int) -> float | None:
    row = fetch_one('''
        SELECT bmi FROM bmi_history
        WHERE user_id = :uid ORDER BY recorded_at DESC LIMIT 1
    ''', {'uid': user_id})
    return float(row['bmi']) if row else None


def _missed_meds(user_id: int, since: str) -> list[str]:
    """Return medication names with recent 'skipped' status."""
    rows = fetch_all('''
        SELECT DISTINCT medication_name
        FROM medication_history
        WHERE user_id = :uid AND taken_at >= :since AND status = 'skipped'
    ''', {'uid': user_id, 'since': since})
    return [row['medication_name'] for row in rows]


def _data_days(user_id: int, since: str) -> int:
    """Count distinct days with any health_monitoring data."""
    row = fetch_one('''
        SELECT COUNT(DISTINCT DATE(created_at)) AS cnt
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since
    ''', {'uid': user_id, 'since': since})
    return row['cnt'] if row else 0


# ─────────────────────────────────────────────────────────────────────────────
# Alert generators
# ─────────────────────────────────────────────────────────────────────────────

def _make_alert(alert_type: str, severity: str, title: str,
                message: str, metric: str | None = None,
                value: Any = None, threshold: Any = None) -> dict:
    return {
        'alert_type': alert_type,
        'severity':   severity,
        'title':      title,
        'message':    message,
        'metric':     metric,
        'value':      value,
        'threshold':  threshold,
    }


def _vital_alerts(vitals: dict[str, float]) -> list[dict]:
    """
    Evaluate latest vitals against the rule table.
    For each metric, only the highest-severity match fires.
    """
    # Group rules by metric, evaluate, keep highest severity per metric
    fired: dict[str, dict] = {}  # metric -> best alert

    for rule in _VITAL_RULES:
        m = rule['metric']
        if m not in vitals:
            continue
        val = vitals[m]
        if not _compare(val, rule['op'], rule['threshold']):
            continue

        alert = _make_alert(
            alert_type='vital_threshold',
            severity=rule['severity'],
            title=rule['title'],
            message=rule['message'].format(value=f'{val:.1f}', threshold=rule['threshold']),
            metric=m,
            value=val,
            threshold=rule['threshold'],
        )

        existing = fired.get(m)
        if existing is None or _SEVERITY_RANK[rule['severity']] > _SEVERITY_RANK[existing['severity']]:
            fired[m] = alert

    return list(fired.values())


def _bp_alerts(vitals: dict[str, float]) -> list[dict]:
    """Blood pressure composite alerts."""
    alerts = []
    sys_v = vitals.get('systolic')
    dia_v = vitals.get('diastolic')
    if sys_v is None and dia_v is None:
        return alerts

    sys_v = sys_v or 0
    dia_v = dia_v or 0
    bp_str = f'{sys_v:.0f}/{dia_v:.0f}'

    if sys_v >= 180 or dia_v >= 120:
        alerts.append(_make_alert(
            'vital_threshold', 'critical',
            'Hypertensive crisis',
            f'Blood pressure is {bp_str} mmHg — emergency level. Seek immediate care.',
            metric='blood_pressure', value=bp_str, threshold='180/120',
        ))
    elif sys_v >= 140 or dia_v >= 90:
        alerts.append(_make_alert(
            'vital_threshold', 'high',
            'Blood pressure — hypertension stage 2',
            f'Blood pressure is {bp_str} mmHg — stage 2 hypertension range. '
            'Consult your healthcare provider.',
            metric='blood_pressure', value=bp_str, threshold='140/90',
        ))
    elif sys_v >= 130 or dia_v >= 80:
        alerts.append(_make_alert(
            'vital_threshold', 'medium',
            'Blood pressure slightly elevated',
            f'Blood pressure is {bp_str} mmHg — stage 1 hypertension range. '
            'Consider lifestyle changes.',
            metric='blood_pressure', value=bp_str, threshold='130/80',
        ))
    elif sys_v < 90 or dia_v < 60:
        alerts.append(_make_alert(
            'vital_threshold', 'medium',
            'Blood pressure low',
            f'Blood pressure is {bp_str} mmHg — hypotension. Monitor for dizziness.',
            metric='blood_pressure', value=bp_str, threshold='90/60',
        ))

    return alerts


def _sleep_alerts(avg_sleep: float | None) -> list[dict]:
    if avg_sleep is None:
        return []
    if avg_sleep < 4:
        return [_make_alert(
            'sleep_deficit', 'critical',
            'Severe sleep deprivation',
            f'Average sleep is only {avg_sleep:.1f} hrs/night — '
            'severe deprivation impacts cognition, immunity, and heart health.',
            metric='sleep_hours', value=avg_sleep, threshold=4,
        )]
    if avg_sleep < 5:
        return [_make_alert(
            'sleep_deficit', 'high',
            'Sleep significantly below recommended',
            f'Average sleep is {avg_sleep:.1f} hrs/night — well below the 7–9 hr recommendation.',
            metric='sleep_hours', value=avg_sleep, threshold=5,
        )]
    if avg_sleep < 6:
        return [_make_alert(
            'sleep_deficit', 'medium',
            'Sleep below recommended',
            f'Average sleep is {avg_sleep:.1f} hrs/night — aim for 7–9 hours.',
            metric='sleep_hours', value=avg_sleep, threshold=6,
        )]
    if avg_sleep < 7:
        return [_make_alert(
            'sleep_deficit', 'low',
            'Sleep slightly below target',
            f'Average sleep is {avg_sleep:.1f} hrs/night — slightly under the 7-hour minimum.',
            metric='sleep_hours', value=avg_sleep, threshold=7,
        )]
    return []


def _activity_alerts(avg_steps: float | None) -> list[dict]:
    if avg_steps is None:
        return []
    if avg_steps < 2000:
        return [_make_alert(
            'activity_low', 'high',
            'Very low physical activity',
            f'Average daily steps: {avg_steps:.0f} — sedentary lifestyle is a major health risk.',
            metric='steps', value=avg_steps, threshold=2000,
        )]
    if avg_steps < 5000:
        return [_make_alert(
            'activity_low', 'medium',
            'Physical activity below target',
            f'Average daily steps: {avg_steps:.0f} — aim for at least 8,000 steps/day.',
            metric='steps', value=avg_steps, threshold=5000,
        )]
    return []


def _bmi_alerts(bmi: float | None) -> list[dict]:
    if bmi is None:
        return []
    if bmi >= 35:
        return [_make_alert(
            'bmi_warning', 'critical',
            'BMI in severe obesity range',
            f'BMI is {bmi:.1f} — class II/III obesity. '
            'Consult a healthcare provider for weight management.',
            metric='bmi', value=bmi, threshold=35,
        )]
    if bmi >= 30:
        return [_make_alert(
            'bmi_warning', 'high',
            'BMI in obesity range',
            f'BMI is {bmi:.1f} — obesity range (≥30). Lifestyle and dietary changes recommended.',
            metric='bmi', value=bmi, threshold=30,
        )]
    if bmi >= 25:
        return [_make_alert(
            'bmi_warning', 'medium',
            'BMI — overweight',
            f'BMI is {bmi:.1f} — overweight range (25–29.9). Consider increasing activity.',
            metric='bmi', value=bmi, threshold=25,
        )]
    if bmi < 18.5:
        return [_make_alert(
            'bmi_warning', 'medium',
            'BMI — underweight',
            f'BMI is {bmi:.1f} — below the healthy minimum of 18.5.',
            metric='bmi', value=bmi, threshold=18.5,
        )]
    return []


def _medication_alerts(missed: list[str]) -> list[dict]:
    if not missed:
        return []
    names = ', '.join(missed[:5])
    sev = 'high' if len(missed) >= 3 else 'medium'
    return [_make_alert(
        'medication_missed', sev,
        f'{len(missed)} medication(s) skipped recently',
        f'Skipped medications: {names}. Consistent adherence is important for treatment efficacy.',
        metric='medication_adherence', value=len(missed), threshold=0,
    )]


def _risk_alerts(user_id: int, days: int) -> list[dict]:
    """Fire an alert based on the composite risk score."""
    try:
        from utils.risk_engine import calculate_risk
        risk = calculate_risk(user_id, days=days)
    except Exception:
        return []

    score = risk.get('score', 0)
    level = risk.get('level', 'low')

    if level == 'critical':
        return [_make_alert(
            'risk_flag', 'critical',
            'Overall health risk is critical',
            f'Your composite risk score is {score}/100 (critical). '
            'Multiple factors are in dangerous ranges. Consult a doctor urgently.',
            metric='risk_score', value=score, threshold=70,
        )]
    if level == 'high':
        return [_make_alert(
            'risk_flag', 'high',
            'Overall health risk is elevated',
            f'Your composite risk score is {score}/100 (high). '
            'Review the contributing factors and take action.',
            metric='risk_score', value=score, threshold=45,
        )]
    if level == 'moderate':
        return [_make_alert(
            'risk_flag', 'low',
            'Health risk moderate — some attention needed',
            f'Your composite risk score is {score}/100. '
            'A few areas need improvement — see detailed breakdown.',
            metric='risk_score', value=score, threshold=20,
        )]
    return []


def _trend_alerts(user_id: int, days: int) -> list[dict]:
    """Convert worsening trend insights into alerts."""
    try:
        from utils.trend_analysis import analyze_trends
        trends = analyze_trends(user_id, days=days)
    except Exception:
        return []

    alerts = []
    for t in trends:
        t_lower = t.lower()
        if 'worsening' in t_lower or 'declining' in t_lower:
            if 'consecutive' in t_lower:
                sev = 'high'
            else:
                sev = 'medium'
            alerts.append(_make_alert(
                'trend_warning', sev,
                'Health metric trending in wrong direction',
                t,
                metric='trend',
            ))
    return alerts


def _consistency_alerts(data_logged: int, total_days: int) -> list[dict]:
    if total_days == 0:
        return []
    if data_logged == 0:
        return [_make_alert(
            'consistency', 'medium',
            'No health data recorded recently',
            f'No vitals logged in the past {total_days} days. '
            'Regular monitoring enables early warning detection.',
            metric='data_logging', value=0, threshold=1,
        )]
    ratio = data_logged / total_days
    if ratio < 0.3:
        return [_make_alert(
            'consistency', 'low',
            'Health data logging is inconsistent',
            f'Data logged on only {data_logged}/{total_days} days. '
            'More consistent logging improves alert accuracy.',
            metric='data_logging', value=data_logged, threshold=total_days,
        )]
    return []


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def generate_alerts(user_id: int, days: int = 7) -> list[dict]:
    """
    Evaluate the user's health data and return a list of alert dicts,
    sorted by severity (critical first).
    """
    since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    alerts: list[dict] = []

    try:
        vitals  = _latest_vitals(user_id, since)
        sleep   = _avg_sleep(user_id, since)
        steps   = _avg_steps(user_id, since)
        bmi     = _latest_bmi(user_id)
        missed  = _missed_meds(user_id, since)
        logged  = _data_days(user_id, since)
    except Exception as e:
        return [_make_alert('system', 'high', 'Database unavailable',
                            f'Could not connect to the health database: {e}')]

    # ── Collect all alerts ────────────────────────────────────────────────────
    alerts.extend(_vital_alerts(vitals))
    alerts.extend(_bp_alerts(vitals))
    alerts.extend(_sleep_alerts(sleep))
    alerts.extend(_activity_alerts(steps))
    alerts.extend(_bmi_alerts(bmi))
    alerts.extend(_medication_alerts(missed))
    alerts.extend(_risk_alerts(user_id, days))
    alerts.extend(_trend_alerts(user_id, days))
    alerts.extend(_consistency_alerts(logged, days))

    # ── Sort: critical → high → medium → low ─────────────────────────────────
    alerts.sort(key=lambda a: _SEVERITY_RANK.get(a['severity'], 0), reverse=True)

    return alerts


# ─────────────────────────────────────────────────────────────────────────────
# Persistence helper — save generated alerts to the DB
# ─────────────────────────────────────────────────────────────────────────────

def persist_alerts(user_id: int, alerts: list[dict]) -> int:
    """
    Save alerts to the `alerts` table if it exists.
    Returns the number of alerts persisted.
    """
    if not table_exists('alerts'):
        return 0

    try:
        count = 0
        for a in alerts:
            execute_sql('''
                INSERT INTO alerts
                (user_id, alert_type, severity, title, message, context_data, status)
                VALUES (:uid, :atype, :severity, :title, :message, :ctx, :status)
            ''', {
                'uid': user_id,
                'atype': a['alert_type'],
                'severity': a['severity'],
                'title': a['title'],
                'message': a['message'],
                'ctx': json.dumps({'metric': a.get('metric'), 'value': a.get('value'),
                                   'threshold': a.get('threshold')}),
                'status': 'active',
            }, commit=True)
            count += 1
        return count
    except Exception as e:
        print(f"[alert_service] Persist error: {e}")
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# CLI quick-test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    uid  = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7

    results = generate_alerts(uid, days)
    print(f'\n── Alerts for user_id={uid}, last {days} days ──\n')
    if not results:
        print('  No alerts generated.')
    for i, a in enumerate(results, 1):
        sev = a['severity'].upper()
        print(f'  {i}. [{sev:8s}] {a["title"]}')
        print(f'     {a["message"]}')
        if a.get('metric'):
            print(f'     metric={a["metric"]}  value={a["value"]}  threshold={a["threshold"]}')
        print()
    print(f'{len(results)} alert(s) generated.')
