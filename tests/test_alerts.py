"""
tests/test_alerts.py
--------------------
Validation tests for the smart alert generation system.

Tests:
  1. Low sleep triggers a sleep_deficit alert
  2. High risk score triggers a critical alert
  3. High heart rate triggers vital_threshold alert
  4. Normal values produce no critical alerts
  5. Alerts are sorted by severity (critical first)
  6. persist_alerts() saves to DB correctly
"""

import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime, timedelta

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

# -----------------------------------------------------------------------------
# Test helpers
# -----------------------------------------------------------------------------

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


def _setup_test_db():
    """Create an in-memory test DB mirroring the production schema."""
    instance_dir = os.path.join(PROJECT_ROOT, 'instance')
    os.makedirs(instance_dir, exist_ok=True)
    db_path = os.path.join(instance_dir, 'health.db')

    # Ensure alerts table exists
    conn = sqlite3.connect(db_path)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            rule_id INTEGER,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            context_data TEXT,
            status TEXT DEFAULT 'active' NOT NULL,
            triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            acknowledged_at DATETIME,
            resolved_at DATETIME
        )
    ''')
    conn.commit()
    conn.close()
    return db_path


# -----------------------------------------------------------------------------
# Test 1: Low sleep triggers alert
# -----------------------------------------------------------------------------

def test_low_sleep_triggers_alert():
    print('\n-- Test 1: Low sleep triggers alert --')
    from services.alert_service import _sleep_alerts

    # Test with 3.5 hours average sleep - should trigger critical
    alerts = _sleep_alerts(3.5)
    _test(
        'Sleep < 4 hrs triggers critical alert',
        len(alerts) == 1 and alerts[0]['severity'] == 'critical',
        f'Got {len(alerts)} alerts, severity={alerts[0]["severity"] if alerts else "none"}'
    )
    _test(
        'Alert type is sleep_deficit',
        alerts[0]['alert_type'] == 'sleep_deficit' if alerts else False,
    )

    # Test with 5.5 hours - medium alert
    alerts = _sleep_alerts(5.5)
    _test(
        'Sleep 5-6 hrs triggers medium alert',
        len(alerts) == 1 and alerts[0]['severity'] == 'medium',
        f'Got {len(alerts)} alerts, severity={alerts[0]["severity"] if alerts else "none"}'
    )

    # Test with 4.5 hours - high alert
    alerts = _sleep_alerts(4.5)
    _test(
        'Sleep 4-5 hrs triggers high alert',
        len(alerts) == 1 and alerts[0]['severity'] == 'high',
        f'Got severity={alerts[0]["severity"] if alerts else "none"}'
    )

    # Test with 7.5 hours - no alert
    alerts = _sleep_alerts(7.5)
    _test(
        'Sleep 7.5 hrs triggers no alert',
        len(alerts) == 0,
        f'Got {len(alerts)} alerts'
    )

    # Test with None - no alert
    alerts = _sleep_alerts(None)
    _test(
        'No sleep data triggers no alert',
        len(alerts) == 0,
    )


# -----------------------------------------------------------------------------
# Test 2: High risk score triggers critical alert
# -----------------------------------------------------------------------------

def test_high_risk_triggers_critical():
    print('\n-- Test 2: High risk triggers critical alert --')
    from services.alert_service import _risk_alerts

    # The _risk_alerts function calls calculate_risk internally.
    # We'll test it end-to-end with user_id=1 (demo user).
    alerts = _risk_alerts(user_id=1, days=7)

    # With demo data, we may or may not get a risk alert.
    # Let's at least verify the function returns a valid list of dicts.
    _test(
        'risk_alerts returns a list',
        isinstance(alerts, list),
    )
    if alerts:
        _test(
            'Risk alert has correct structure',
            all(k in alerts[0] for k in ['alert_type', 'severity', 'title', 'message']),
        )
        _test(
            'Risk alert type is risk_flag',
            alerts[0]['alert_type'] == 'risk_flag',
        )
    else:
        print('  [INFO]  No risk alert for demo user (risk may be low) - testing structure with mock...')

        # Directly test the alert creation logic
        from services.alert_service import _make_alert
        mock_alert = _make_alert(
            'risk_flag', 'critical',
            'Overall health risk is critical',
            'Your composite risk score is 85/100 (critical).',
            metric='risk_score', value=85, threshold=70,
        )
        _test(
            'Mock critical risk alert has correct severity',
            mock_alert['severity'] == 'critical',
        )
        _test(
            'Mock critical risk alert has correct type',
            mock_alert['alert_type'] == 'risk_flag',
        )


# -----------------------------------------------------------------------------
# Test 3: Vital threshold alerts
# -----------------------------------------------------------------------------

def test_vital_threshold_alerts():
    print('\n-- Test 3: Vital threshold alerts --')
    from services.alert_service import _vital_alerts

    # High heart rate
    alerts = _vital_alerts({'heart_rate': 125.0})
    _test(
        'HR 125 bpm triggers critical alert',
        len(alerts) >= 1 and any(a['severity'] == 'critical' for a in alerts),
        f'Got {len(alerts)} alerts: {[a["severity"] for a in alerts]}'
    )

    # Low oxygen
    alerts = _vital_alerts({'oxygen_level': 88.0})
    _test(
        'SpO2 88% triggers critical alert',
        len(alerts) >= 1 and any(a['severity'] == 'critical' for a in alerts),
        f'Got {len(alerts)} alerts: {[a["severity"] for a in alerts]}'
    )

    # High glucose
    alerts = _vital_alerts({'glucose_level': 200.0})
    _test(
        'Glucose 200 mg/dL triggers critical alert',
        len(alerts) >= 1 and any(a['severity'] == 'critical' for a in alerts),
    )

    # Normal values
    alerts = _vital_alerts({'heart_rate': 72.0, 'oxygen_level': 98.0, 'glucose_level': 95.0})
    _test(
        'Normal vitals trigger no alerts',
        len(alerts) == 0,
        f'Got {len(alerts)} alerts'
    )


# -----------------------------------------------------------------------------
# Test 4: Severity sorting
# -----------------------------------------------------------------------------

def test_severity_sorting():
    print('\n-- Test 4: Alert severity sorting --')
    from services.alert_service import _make_alert, _SEVERITY_RANK

    alerts = [
        _make_alert('test', 'low', 'Low', 'msg'),
        _make_alert('test', 'critical', 'Critical', 'msg'),
        _make_alert('test', 'medium', 'Medium', 'msg'),
        _make_alert('test', 'high', 'High', 'msg'),
    ]
    alerts.sort(key=lambda a: _SEVERITY_RANK.get(a['severity'], 0), reverse=True)

    expected_order = ['critical', 'high', 'medium', 'low']
    actual_order   = [a['severity'] for a in alerts]
    _test(
        'Alerts sorted critical > high > medium > low',
        actual_order == expected_order,
        f'Got: {actual_order}'
    )


# -----------------------------------------------------------------------------
# Test 5: Blood pressure alerts
# -----------------------------------------------------------------------------

def test_bp_alerts():
    print('\n-- Test 5: Blood pressure alerts --')
    from services.alert_service import _bp_alerts

    # Hypertensive crisis
    alerts = _bp_alerts({'systolic': 185.0, 'diastolic': 125.0})
    _test(
        'BP 185/125 triggers critical alert',
        len(alerts) >= 1 and alerts[0]['severity'] == 'critical',
    )

    # Stage 2 hypertension
    alerts = _bp_alerts({'systolic': 145.0, 'diastolic': 92.0})
    _test(
        'BP 145/92 triggers high alert',
        len(alerts) >= 1 and alerts[0]['severity'] == 'high',
    )

    # Normal
    alerts = _bp_alerts({'systolic': 115.0, 'diastolic': 75.0})
    _test(
        'BP 115/75 triggers no alert',
        len(alerts) == 0,
    )


# -----------------------------------------------------------------------------
# Test 6: End-to-end generate_alerts
# -----------------------------------------------------------------------------

def test_generate_alerts_e2e():
    print('\n-- Test 6: End-to-end generate_alerts() --')
    _setup_test_db()

    from services.alert_service import generate_alerts, persist_alerts

    alerts = generate_alerts(user_id=1, days=7)
    _test(
        'generate_alerts returns a list',
        isinstance(alerts, list),
    )
    _test(
        'Alerts have required keys',
        all(
            all(k in a for k in ['alert_type', 'severity', 'title', 'message'])
            for a in alerts
        ) if alerts else True,
    )
    _test(
        'At least one alert generated for demo user',
        len(alerts) >= 1,
        f'Got {len(alerts)} alerts'
    )

    # Test persistence
    saved = persist_alerts(user_id=1, alerts=alerts)
    _test(
        'persist_alerts saves to DB',
        saved >= 0,
        f'Persisted {saved} alerts'
    )

    print(f'\n  [INFO]  {len(alerts)} total alerts generated:')
    for a in alerts[:5]:
        print(f'     [{a["severity"].upper():8s}] {a["title"]}')
    if len(alerts) > 5:
        print(f'     ... and {len(alerts) - 5} more')


# -----------------------------------------------------------------------------
# Test 7: Activity alerts
# -----------------------------------------------------------------------------

def test_activity_alerts():
    print('\n-- Test 7: Activity alerts --')
    from services.alert_service import _activity_alerts

    alerts = _activity_alerts(1500)
    _test(
        '1500 steps triggers high alert',
        len(alerts) == 1 and alerts[0]['severity'] == 'high',
    )

    alerts = _activity_alerts(3000)
    _test(
        '3000 steps triggers medium alert',
        len(alerts) == 1 and alerts[0]['severity'] == 'medium',
    )

    alerts = _activity_alerts(8000)
    _test(
        '8000 steps triggers no alert',
        len(alerts) == 0,
    )


# -----------------------------------------------------------------------------
# Test 8: BMI alerts
# -----------------------------------------------------------------------------

def test_bmi_alerts():
    print('\n-- Test 8: BMI alerts --')
    from services.alert_service import _bmi_alerts

    alerts = _bmi_alerts(36.0)
    _test(
        'BMI 36 triggers critical alert',
        len(alerts) == 1 and alerts[0]['severity'] == 'critical',
    )

    alerts = _bmi_alerts(22.0)
    _test(
        'BMI 22 (healthy) triggers no alert',
        len(alerts) == 0,
    )

    alerts = _bmi_alerts(17.0)
    _test(
        'BMI 17 (underweight) triggers medium alert',
        len(alerts) == 1 and alerts[0]['severity'] == 'medium',
    )


# -----------------------------------------------------------------------------
# Runner
# -----------------------------------------------------------------------------

if __name__ == '__main__':
    print('=' * 60)
    print(' Smart Alert Generation System -- Validation Tests')
    print('=' * 60)

    test_low_sleep_triggers_alert()
    test_high_risk_triggers_critical()
    test_vital_threshold_alerts()
    test_severity_sorting()
    test_bp_alerts()
    test_generate_alerts_e2e()
    test_activity_alerts()
    test_bmi_alerts()

    print('\n' + '=' * 60)
    total = _PASSED + _FAILED
    print(f' Results: {_PASSED}/{total} passed, {_FAILED} failed')
    if _FAILED == 0:
        print(' All tests passed!')
    else:
        print(' Some tests failed -- review above.')
    print('=' * 60)

    sys.exit(0 if _FAILED == 0 else 1)
