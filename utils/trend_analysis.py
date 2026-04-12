"""
utils/trend_analysis.py
────────────────────────
Health trend analysis engine.

Public API:
    analyze_trends(user_id, days=7) -> list[str]

Returns a list of human-readable insight strings derived from the user's
last `days` days of data across:
  - health_monitoring  (heart rate, BP, oxygen, sleep, stress, glucose)
  - activity_tracking  (steps, calories, duration)
  - bmi_history        (weight, BMI)

Internally uses three analytical lenses:
  1. Threshold check   — is the metric in a healthy range right now?
  2. Trend detection   — is the metric improving, declining, or stable over N days?
  3. Consistency check — did the user log data at all? Are there gaps?

No Flask, no SQLAlchemy, no ML libraries required.
Uses only stdlib + the existing sqlite3 database.
"""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from utils.db_helper import fetch_all


# ─────────────────────────────────────────────────────────────────────────────
# Health reference thresholds
# ─────────────────────────────────────────────────────────────────────────────
# Each entry: (min_ok, max_ok, label, unit, low_msg, high_msg)
_THRESHOLDS: dict[str, tuple] = {
    'heart_rate':    (60,   100,  'Heart rate',    'bpm',
                      'Heart rate is below normal (bradycardia risk).',
                      'Heart rate is elevated — consider rest or consult a doctor.'),
    'oxygen_level':  (95,   100,  'Blood oxygen',  '%',
                      'Blood oxygen is low — seek medical attention if persistent.',
                      None),
    'body_temperature': (97.0, 99.5, 'Body temperature', '°F',
                          'Body temperature is lower than normal.',
                          'Body temperature is elevated — possible fever.'),
    'glucose_level': (70,   140,  'Blood glucose', 'mg/dL',
                      'Blood glucose is below normal — check for hypoglycaemia.',
                      'Blood glucose is high — monitor for diabetes risk.'),
    'stress_level':  (1,    6,    'Stress level',  '/10',
                      None,
                      'Stress level is high — consider relaxation techniques.'),
    'sleep_hours':   (7.0,  9.0,  'Sleep duration','hrs',
                      'Sleep is below the recommended 7–9 hours.',
                      'Sleeping more than 9 hours — check for fatigue or illness.'),
    'steps':         (8000, None, 'Daily steps',   'steps',
                      'Step count is below the recommended 8,000 steps/day.',
                      None),
    'bmi':           (18.5, 24.9, 'BMI',           '',
                      'BMI is underweight — consider nutritional guidance.',
                      'BMI is above the normal range — consider lifestyle adjustments.'),
    'weight':        (None, None, 'Weight',        'kg', None, None),  # trend-only
}

# Minimum absolute change to call a trend "meaningful"
_TREND_MIN_CHANGE: dict[str, float] = {
    'heart_rate':       3.0,
    'oxygen_level':     1.0,
    'body_temperature': 0.3,
    'glucose_level':    5.0,
    'stress_level':     1.0,
    'sleep_hours':      0.5,
    'steps':            500.0,
    'bmi':              0.3,
    'weight':           0.5,
    'calories_burned':  100.0,
    'duration':         10.0,
    'systolic':         5.0,
    'diastolic':        3.0,
}

# Recommended daily water intake (ml)
_WATER_GOAL_ML = 2000


# ─────────────────────────────────────────────────────────────────────────────
# Internal data classes
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class _Series:
    """Ordered time-series of (date_str, value) pairs."""
    metric: str
    points: list[tuple[str, float]] = field(default_factory=list)

    @property
    def values(self) -> list[float]:
        return [v for _, v in self.points]

    @property
    def latest(self) -> float | None:
        return self.values[-1] if self.values else None

    @property
    def average(self) -> float | None:
        v = self.values
        return sum(v) / len(v) if v else None

    def slope(self) -> float:
        """
        Simple linear-regression slope over the series.
        Positive → increasing, Negative → decreasing.
        Returns 0.0 for fewer than 2 points.
        """
        vals = self.values
        n = len(vals)
        if n < 2:
            return 0.0
        xs = list(range(n))
        x_mean = sum(xs) / n
        y_mean = sum(vals) / n
        num   = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, vals))
        denom = sum((x - x_mean) ** 2 for x in xs)
        return num / denom if denom else 0.0

    def consecutive_streak(self) -> tuple[str, int]:
        """
        Return ('increasing'|'decreasing'|'stable', streak_length).
        Streak counts consecutive days the metric moved in the same direction.
        """
        vals = self.values
        if len(vals) < 2:
            return 'stable', 0
        dirs = []
        for i in range(1, len(vals)):
            diff = vals[i] - vals[i - 1]
            if diff > 0.05:   dirs.append('up')
            elif diff < -0.05: dirs.append('down')
            else:              dirs.append('flat')

        streak_dir = dirs[-1]
        count = 0
        for d in reversed(dirs):
            if d == streak_dir:
                count += 1
            else:
                break

        direction = {'up': 'increasing', 'down': 'decreasing', 'flat': 'stable'}[streak_dir]
        return direction, count


# ─────────────────────────────────────────────────────────────────────────────
# Data fetchers
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_monitoring(user_id: int, since: str) -> dict[str, _Series]:
    """
    Pull daily averages from health_monitoring for each vital metric.
    Aggregates multiple readings per day into one data point.
    """
    metrics = ['heart_rate', 'oxygen_level', 'body_temperature',
               'glucose_level', 'stress_level', 'sleep_hours']
    series: dict[str, _Series] = {m: _Series(m) for m in metrics}

    rows = fetch_all('''
        SELECT
            DATE(created_at) AS day,
            AVG(heart_rate)       AS heart_rate,
            AVG(oxygen_level)     AS oxygen_level,
            AVG(body_temperature) AS body_temperature,
            AVG(glucose_level)    AS glucose_level,
            AVG(stress_level)     AS stress_level,
            AVG(sleep_hours)      AS sleep_hours
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since
        GROUP BY DATE(created_at)
        ORDER BY day ASC
    ''', {'uid': user_id, 'since': since})

    for row in rows:
        day = str(row['day'])
        for m in metrics:
            v = row[m]
            if v is not None:
                series[m].points.append((day, float(v)))

    return series


def _fetch_blood_pressure(user_id: int, since: str) -> tuple[_Series, _Series]:
    """Extract systolic / diastolic daily averages from JSON blood_pressure field."""
    systolic  = _Series('systolic')
    diastolic = _Series('diastolic')

    rows = fetch_all('''
        SELECT DATE(created_at) AS day, blood_pressure
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since AND blood_pressure IS NOT NULL
        ORDER BY day ASC
    ''', {'uid': user_id, 'since': since})

    bp_by_day: dict[str, list] = defaultdict(list)
    for row in rows:
        try:
            bp = json.loads(row['blood_pressure'])
            bp_by_day[str(row['day'])].append(bp)
        except Exception:
            pass

    for day in sorted(bp_by_day):
        readings = bp_by_day[day]
        sys_avg = sum(r.get('systolic',  0) for r in readings) / len(readings)
        dia_avg = sum(r.get('diastolic', 0) for r in readings) / len(readings)
        systolic.points.append((day, sys_avg))
        diastolic.points.append((day, dia_avg))

    return systolic, diastolic


def _fetch_activity(user_id: int, since: str) -> dict[str, _Series]:
    """Daily activity totals."""
    metrics = ['steps', 'calories_burned', 'duration']
    series: dict[str, _Series] = {m: _Series(m) for m in metrics}

    rows = fetch_all('''
        SELECT
            activity_date          AS day,
            SUM(steps)             AS steps,
            SUM(calories_burned)   AS calories_burned,
            SUM(duration)          AS duration
        FROM activity_tracking
        WHERE user_id = :uid AND activity_date >= :since
        GROUP BY activity_date
        ORDER BY activity_date ASC
    ''', {'uid': user_id, 'since': since})

    for row in rows:
        day = str(row['day'])
        for m in metrics:
            v = row[m]
            if v is not None:
                series[m].points.append((day, float(v)))

    return series


def _fetch_bmi(user_id: int, since: str) -> tuple[_Series, _Series]:
    """BMI and weight history."""
    bmi_s    = _Series('bmi')
    weight_s = _Series('weight')

    rows = fetch_all('''
        SELECT DATE(recorded_at) AS day, bmi, weight
        FROM bmi_history
        WHERE user_id = :uid AND recorded_at >= :since
        ORDER BY recorded_at ASC
    ''', {'uid': user_id, 'since': since})

    for row in rows:
        day = str(row['day'])
        if row['bmi']    is not None: bmi_s.points.append((day, float(row['bmi'])))
        if row['weight'] is not None: weight_s.points.append((day, float(row['weight'])))

    return bmi_s, weight_s


# ─────────────────────────────────────────────────────────────────────────────
# Insight generators
# ─────────────────────────────────────────────────────────────────────────────

def _threshold_insight(series: _Series) -> str | None:
    """Return an insight if the latest value is outside the healthy range."""
    t = _THRESHOLDS.get(series.metric)
    if not t or series.latest is None:
        return None
    lo, hi, label, unit, low_msg, high_msg = t
    val   = series.latest
    v_str = f'{val:.1f} {unit}'.strip()

    if lo is not None and val < lo and low_msg:
        return f'{label} is {v_str} — {low_msg}'
    if hi is not None and val > hi and high_msg:
        return f'{label} is {v_str} — {high_msg}'
    return None


def _trend_insight(series: _Series, days: int) -> str | None:
    """
    Return an insight describing the trend direction if meaningful over `days`.
    Uses both slope (direction) and consecutive streak (duration).
    """
    if len(series.values) < 3:
        return None

    t      = _THRESHOLDS.get(series.metric)
    label  = t[2] if t else series.metric.replace('_', ' ').title()
    unit   = t[3] if t else ''

    slope   = series.slope()
    min_chg = _TREND_MIN_CHANGE.get(series.metric, 1.0)
    direction, streak = series.consecutive_streak()

    # Only report if slope magnitude is meaningful
    if abs(slope) < min_chg / days:
        return None

    direction_word = 'increasing' if slope > 0 else 'decreasing'
    avg_str = f'{series.average:.1f} {unit}'.strip() if series.average else ''

    # Special: map direction to good/bad for context
    good_is_up   = {'steps', 'oxygen_level', 'sleep_hours', 'duration', 'calories_burned'}
    good_is_down = {'stress_level', 'glucose_level', 'bmi', 'weight',
                    'heart_rate', 'body_temperature', 'systolic', 'diastolic'}

    if series.metric in good_is_up:
        qualifier = '📈 improving' if slope > 0 else '📉 declining'
    elif series.metric in good_is_down:
        qualifier = '📉 improving' if slope < 0 else '📈 worsening'
    else:
        qualifier = '📈 ' + direction_word if slope > 0 else '📉 ' + direction_word

    msg = f'{label} is {qualifier} over the past {days} days'
    if avg_str:
        msg += f' (avg {avg_str})'
    if streak >= 3:
        msg += f'. {streak} consecutive days of {"increase" if direction == "increasing" else "decrease"}.'
    return msg


def _consistency_insight(label: str, n_days_with_data: int, total_days: int) -> str | None:
    """Flag if the user logged fewer than 50 % of days."""
    if total_days == 0:
        return None
    pct = n_days_with_data / total_days
    if pct < 0.5:
        return (f'⚠️  {label} data recorded on only {n_days_with_data}/{total_days} days '
                f'— more consistent logging will improve insight accuracy.')
    return None


def _bp_insight(systolic: _Series, diastolic: _Series) -> list[str]:
    insights = []
    if systolic.latest is not None:
        sys_v = systolic.latest
        dia_v = diastolic.latest if diastolic.latest else 0
        bp_str = f'{sys_v:.0f}/{dia_v:.0f} mmHg'
        if sys_v >= 140 or dia_v >= 90:
            insights.append(f'⚠️  Blood pressure is high ({bp_str}) — hypertension range.')
        elif sys_v < 90 or dia_v < 60:
            insights.append(f'⚠️  Blood pressure is low ({bp_str}) — hypotension risk.')
        else:
            # Trend only
            s_trend = _trend_insight(systolic, len(systolic.values))
            if s_trend:
                insights.append(s_trend)
    return insights


def _sleep_pattern_insight(sleep_series: _Series) -> str | None:
    """Detect irregular sleep patterns (high day-to-day variance)."""
    vals = sleep_series.values
    if len(vals) < 4:
        return None
    avg  = sum(vals) / len(vals)
    variance = sum((v - avg) ** 2 for v in vals) / len(vals)
    std_dev  = variance ** 0.5
    if std_dev > 1.5:
        return (f'💤 Sleep schedule is irregular (std dev {std_dev:.1f} hrs across recorded nights) '
                f'— inconsistent sleep impacts health significantly.')
    return None


def _steps_goal_insight(steps_series: _Series, days: int) -> str | None:
    """Report how many days the user met the 8,000-step goal."""
    goal = 8000
    if not steps_series.points:
        return f'🚶 No step data recorded in the past {days} days.'
    met   = sum(1 for _, v in steps_series.points if v >= goal)
    total = len(steps_series.points)
    if met == total:
        return f'🚶 Great! Daily step goal ({goal:,}) met every day logged ({met}/{total} days).'
    elif met == 0:
        return f'🚶 Step goal ({goal:,}/day) not met on any recorded day — try increasing daily movement.'
    else:
        return f'🚶 Step goal ({goal:,}/day) met {met}/{total} days this period.'


def _positive_summary(series_map: dict[str, _Series]) -> list[str]:
    """Return encouraging messages when multiple metrics look good."""
    positives = []
    if series_map.get('oxygen_level') and (series_map['oxygen_level'].average or 0) >= 97:
        positives.append('✅ Blood oxygen levels are excellent (avg ≥ 97%).')
    if series_map.get('heart_rate'):
        avg = series_map['heart_rate'].average
        if avg and 60 <= avg <= 80:
            positives.append(f'✅ Resting heart rate is in a healthy range (avg {avg:.0f} bpm).')
    if series_map.get('sleep_hours'):
        avg = series_map['sleep_hours'].average
        if avg and 7.0 <= avg <= 9.0:
            positives.append(f'✅ Average sleep is healthy ({avg:.1f} hrs/night).')
    return positives


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def analyze_trends(user_id: int, days: int = 7) -> list[str]:
    """
    Analyse the last `days` days of health data for `user_id`.
    Returns a list of human-readable insight strings.
    """
    since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    try:
        # ── Fetch all time-series ─────────────────────────────────────────────
        monitoring = _fetch_monitoring(user_id, since)
        systolic, diastolic = _fetch_blood_pressure(user_id, since)
        activity   = _fetch_activity(user_id, since)
        bmi_s, weight_s = _fetch_bmi(user_id, since)
    except Exception as e:
        return [f'⚠️  Could not connect to the database to generate insights: {e}']

    # Merge into one flat lookup for convenience
    all_series: dict[str, _Series] = {
        **monitoring,
        'systolic':       systolic,
        'diastolic':      diastolic,
        **activity,
        'bmi':    bmi_s,
        'weight': weight_s,
    }

    insights: list[str] = []

    # ── 1. Threshold alerts ───────────────────────────────────────────────
    threshold_metrics = [
        'heart_rate', 'oxygen_level', 'body_temperature',
        'glucose_level', 'stress_level', 'sleep_hours', 'bmi',
    ]
    for m in threshold_metrics:
        s = all_series.get(m)
        if s:
            msg = _threshold_insight(s)
            if msg:
                insights.append(f'⚠️  {msg}')

    # Blood pressure composite alert
    insights.extend(_bp_insight(systolic, diastolic))

    # ── 2. Trend observations ─────────────────────────────────────────────
    trend_metrics = [
        'sleep_hours', 'heart_rate', 'stress_level',
        'glucose_level', 'steps', 'calories_burned',
        'bmi', 'weight', 'oxygen_level',
    ]
    for m in trend_metrics:
        s = all_series.get(m)
        if s and len(s.values) >= 3:
            msg = _trend_insight(s, days)
            if msg:
                insights.append(msg)

    if len(systolic.values) >= 3:
        msg = _trend_insight(systolic, days)
        if msg:
            insights.append(msg)

    sleep_s = all_series.get('sleep_hours')
    if sleep_s:
        msg = _sleep_pattern_insight(sleep_s)
        if msg:
            insights.append(msg)

    # ── 3. Consistency warnings ───────────────────────────────────────────────
    vitals_days   = len(monitoring.get('heart_rate', _Series('x')).points)
    activity_days = len(activity.get('steps', _Series('x')).points)
    msg = _consistency_insight('Vital signs', vitals_days, days)
    if msg: insights.append(msg)
    msg = _consistency_insight('Activity', activity_days, days)
    if msg: insights.append(msg)

    # ── 4. Goal summaries ─────────────────────────────────────────────────────
    si = _steps_goal_insight(all_series.get('steps', _Series('steps')), days)
    if si: insights.append(si)

    # ── 5. Positive reinforcement ─────────────────────────────────────────────
    insights.extend(_positive_summary(all_series))

    if not insights:
        insights.append(
            f'ℹ️  Not enough data in the last {days} days to generate insights. '
            'Keep logging daily health readings for better analysis.'
        )

    return insights


# ─────────────────────────────────────────────────────────────────────────────
# CLI quick-test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    uid  = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    days = int(sys.argv[2]) if len(sys.argv) > 2 else 7

    print(f'\n── Health Trend Report: user_id={uid}, last {days} days ──\n')
    results = analyze_trends(uid, days)
    for i, insight in enumerate(results, 1):
        print(f'{i:2d}. {insight}')
    print(f'\n{len(results)} insight(s) generated.')
