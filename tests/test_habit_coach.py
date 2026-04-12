"""
tests/test_habit_coach.py
─────────────────────────
Validation tests for the habit coaching system.

Tests:
  1. Tips generated for no data (baseline)
  2. Tips change based on low sleep data
  3. Tips change based on activity data
  4. Consistency tip adapts based on logged days
"""

import math
import os
import sqlite3
import sys
from datetime import datetime, timedelta

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from services.habit_coach import generate_habit_tips

# ─────────────────────────────────────────────────────────────────────────────
# Test helpers
# ─────────────────────────────────────────────────────────────────────────────

_PASSED = 0
_FAILED = 0


def _test(name: str, condition: bool, detail: str = ''):
    global _PASSED, _FAILED
    if condition:
        _PASSED += 1
        print(f'  [PASS]: {name}')
    else:
        _FAILED += 1
        print(f'  [FAIL]: {name}')
        if detail:
            print(f'          {detail}')

def _get_db():
    db_path = os.path.join(PROJECT_ROOT, 'instance', 'health.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def _clear_recent_data(user_id: int):
    conn = _get_db()
    cursor = conn.cursor()
    since = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('DELETE FROM health_monitoring WHERE user_id = ? AND created_at >= ?', (user_id, since))
    cursor.execute('DELETE FROM activity_tracking WHERE user_id = ? AND activity_date >= ?', (user_id, since[:10]))
    conn.commit()
    conn.close()

def _add_health_data(user_id: int, sleep_hours: float = None, stress_level: float = None):
    conn = _get_db()
    cursor = conn.cursor()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
        INSERT INTO health_monitoring (user_id, sleep_hours, stress_level, created_at)
        VALUES (?, ?, ?, ?)
    ''', (user_id, sleep_hours, stress_level, now))
    conn.commit()
    conn.close()

def _add_activity_data(user_id: int, steps: int = None, date: str = None):
    conn = _get_db()
    cursor = conn.cursor()
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')
    cursor.execute('''
        INSERT INTO activity_tracking (user_id, steps, activity_date, activity_type)
        VALUES (?, ?, ?, ?)
    ''', (user_id, steps, date, 'Walking'))
    conn.commit()
    conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# Test 1: Tips generated for no data
# ─────────────────────────────────────────────────────────────────────────────
def test_no_data():
    print('\n-- Test 1: No data baseline --')
    user_id = 9999 # Use an isolated user ID
    
    result = generate_habit_tips(user_id, days=7)
    _test('generate_habit_tips returns a dict', isinstance(result, dict))
    _test('Tips are returned', len(result['tips']) > 0)
    
    # We expect consistency and sleep tracking prompts, among others
    consistency_tips = [t for t in result['tips'] if t['category'] == 'consistency']
    _test('Contains consistency prompt for no data', len(consistency_tips) > 0 and 'Start logging' in consistency_tips[0]['title'])

# ─────────────────────────────────────────────────────────────────────────────
# Test 2: Low sleep triggers high priority tip
# ─────────────────────────────────────────────────────────────────────────────
def test_low_sleep():
    print('\n-- Test 2: Low sleep data --')
    user_id = 9999
    
    # Setup
    _clear_recent_data(user_id)
    _add_health_data(user_id, sleep_hours=3.5)
    _add_health_data(user_id, sleep_hours=4.0)

    result = generate_habit_tips(user_id, days=7)
    
    sleep_tips = [t for t in result['tips'] if t['category'] == 'sleep']
    _test('Sleep tip generated', len(sleep_tips) > 0)
    
    if sleep_tips:
        tip = sleep_tips[0]
        _test('Sleep priority is high for < 5 hours', tip['priority'] == 'high')
        _test('Sleep context is correctly parsed', 'Prioritize sleep' in tip['title'])

# ─────────────────────────────────────────────────────────────────────────────
# Test 3: Activity tips change based on steps
# ─────────────────────────────────────────────────────────────────────────────
def test_activity_tips():
    print('\n-- Test 3: Activity step target --')
    user_id = 9999
    
    _clear_recent_data(user_id)
    _add_activity_data(user_id, steps=2500)
    
    res1 = generate_habit_tips(user_id, days=7)
    act_tips1 = [t for t in res1['tips'] if t['category'] == 'activity']
    high_act = any(t['priority'] == 'high' for t in act_tips1)
    _test('Low steps (2500) triggers high priority activity tip', high_act)
    
    _clear_recent_data(user_id)
    _add_activity_data(user_id, steps=11000)
    _add_activity_data(user_id, steps=9000, date=(datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d'))
    
    res2 = generate_habit_tips(user_id, days=7)
    act_tips2 = [t for t in res2['tips'] if t['category'] == 'activity']
    low_priority_act = any(t['priority'] == 'low' for t in act_tips2)
    _test('High steps (>8000) triggers low priority "good job" activity tip', low_priority_act)

# ─────────────────────────────────────────────────────────────────────────────
# Test 4: Focus area identification
# ─────────────────────────────────────────────────────────────────────────────
def test_focus_area():
    print('\n-- Test 4: Focus area identification --')
    user_id = 9999
    
    _clear_recent_data(user_id)
    # Give perfectly fine steps, but terrible stress
    _add_activity_data(user_id, steps=10000)
    _add_health_data(user_id, sleep_hours=8.0, stress_level=9.0)
    _add_health_data(user_id, sleep_hours=8.0, stress_level=8.5)
    
    result = generate_habit_tips(user_id, days=7)
    
    _test('Focus area identifies stress correctly', result['focus_area'] == 'stress')


if __name__ == '__main__':
    print('============================================================')
    print(' Habit Coaching System -- Validation Tests')
    print('============================================================')

    test_no_data()
    test_low_sleep()
    test_activity_tips()
    test_focus_area()

    # Cleanup
    _clear_recent_data(9999)

    print('\n============================================================')
    total = _PASSED + _FAILED
    print(f' Results: {_PASSED}/{total} passed, {_FAILED} failed')
    if _FAILED == 0:
        print(' All tests passed!')
    else:
        print(' Some tests failed -- review above.')
    print('============================================================')

    sys.exit(0 if _FAILED == 0 else 1)
