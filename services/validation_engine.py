"""
services/validation_engine.py
─────────────────────────────
Production-grade data validation and anomaly detection engine.
Provides Strict (blocking errors) and Soft (warnings/auto-correct) boundaries.
Includes historical deviation tracking.
"""

import logging
from datetime import datetime, date, timedelta
from models.health_record import HealthMonitoring, ActivityRecord, DailyHealthLog
from models import db
from sqlalchemy import func

# Strict bounds (Hard Rejection)
_STRICT_BOUNDS = {
    'heart_rate': (40, 200),
    'sleep_hours': (0, 24),
    'steps': (0, 50000),
    'water_ml': (0, 10000),  # 10L max
    'water_intake': (0, 10000), # alias
    'oxygen_level': (50, 100),
}

# Soft bounds (Anomaly Warnings -> Auto suggests fixes)
_SOFT_BOUNDS = {
    'heart_rate': (50, 120),  # Over 120 resting is unusual, <50 is unusual
    'sleep_hours': (3.0, 14.0), # <3h or >14h is unusual
    'steps': (0, 30000), # >30k steps is unusual
    # No soft bound on water currently
}

class ValidationEngine:
    @staticmethod
    def evaluate(user_id: int, data: dict, force_confirm: bool = False) -> dict:
        """
        Evaluate full incoming JSON payload.
        Returns:
            {
                'is_valid': bool,
                'requires_confirmation': bool,
                'errors': list,
                'warnings': list,
                'suggestions': dict,
            }
        """
        result = {
            'is_valid': True,
            'requires_confirmation': False,
            'errors': [],
            'warnings': [],
            'suggestions': {}
        }

        # 1. STRICT BOUNDARY CHECK
        for key, value in data.items():
            if value is None or value == "":
                continue
                
            try:
                val = float(value)
            except (ValueError, TypeError):
                continue # Let traditional validators handle string/type errors

            if key in _STRICT_BOUNDS:
                min_val, max_val = _STRICT_BOUNDS[key]
                if val < min_val or val > max_val:
                    result['is_valid'] = False
                    result['errors'].append(f"{key} value {val} is outside valid biological limits ({min_val}-{max_val}).")

        if not result['is_valid']:
            return result # Halt if strict bounds crossed

        # 2. SOFT BOUNDARY CHECK & AUTO-CORRECTIONS
        for key, value in data.items():
            if value is None or value == "":
                continue
            try:
                val = float(value)
            except (ValueError, TypeError):
                continue
                
            if key in _SOFT_BOUNDS:
                min_soft, max_soft = _SOFT_BOUNDS[key]
                
                if val < min_soft or val > max_soft:
                    result['requires_confirmation'] = True
                    result['warnings'].append(f"Unusual {key.replace('_', ' ')} value: {val}. Please confirm.")
                    
                    # Auto-correct heuristics
                    if key == 'sleep_hours' and val > 24: # Actually >24 is strict error, but if say val >= 20
                        # Handled by strict, but if we changed strict to >100
                        pass
                    if key == 'sleep_hours' and val >= 15 and val <= 240: 
                        # E.g. entered 60 meaning 6.0
                        result['suggestions'][key] = round(val / 10.0, 1)
                        if result['suggestions'][key] <= 24:
                            result['warnings'][-1] = f"Did you mean {result['suggestions'][key]} hours?"
                            
                    if key == 'steps' and val >= 30000:
                        # E.g. accidentally added a 0
                        suggested = val / 10.0
                        result['suggestions'][key] = int(suggested)
                        result['warnings'][-1] = f"Did you mean {int(suggested)} steps instead of {int(val)}?"

        # 3. HISTORICAL DEVIATION CHECK
        if not force_confirm:
            ValidationEngine._check_historical_deviation(user_id, data, result)

        # 4. FINAL STATE & LOGGING
        if result['requires_confirmation'] and force_confirm:
            # Overrule soft warnings if forced
            result['requires_confirmation'] = False
            logging.warning(f"User {user_id} forced anomaly confirmation for payload: {data}")

        return result

    @staticmethod
    def _check_historical_deviation(user_id: int, data: dict, result: dict):
        """Fetch past 7 day averages to detect >50% variance."""
        since = datetime.utcnow() - timedelta(days=7)
        
        # Check sleep_hours against HealthMonitoring avg
        if 'sleep_hours' in data and data['sleep_hours']:
            try:
                val = float(data['sleep_hours'])
                avg_sleep = db.session.query(func.avg(HealthMonitoring.sleep_hours)).filter(
                    HealthMonitoring.user_id == user_id, 
                    HealthMonitoring.created_at >= since,
                    HealthMonitoring.sleep_hours != None
                ).scalar()
                
                if avg_sleep and float(avg_sleep) > 0:
                    diff = abs(val - float(avg_sleep)) / float(avg_sleep)
                    if diff > 0.50:
                        result['requires_confirmation'] = True
                        result['warnings'].append(f"Sleep hours ({val}h) is significantly different from your usual pattern ({round(float(avg_sleep), 1)}h).")
            except Exception as e:
                logging.error(f"Anomaly check sleep error: {e}")

        # Check steps against ActivityRecord
        if 'steps' in data and data['steps']:
            try:
                val = float(data['steps'])
                step_records = db.session.query(
                    ActivityRecord.activity_date, func.sum(ActivityRecord.steps).label('total')
                ).filter(
                    ActivityRecord.user_id == user_id,
                    ActivityRecord.activity_date >= since.date()
                ).group_by(ActivityRecord.activity_date).all()
                
                if step_records:
                    totals = [r.total for r in step_records if r.total]
                    if totals:
                        avg_steps = sum(totals) / len(totals)
                        if avg_steps > 0:
                            diff = abs(val - avg_steps) / avg_steps
                            if diff > 0.50 and abs(val - avg_steps) > 2000: # Ensure minimum absolute difference threshold so small step counts don't trigger (e.g. 500 vs 1000 = 100% diff)
                                result['requires_confirmation'] = True
                                result['warnings'].append(f"Step count ({int(val)}) is significantly different from your 7-day average ({int(avg_steps)}).")
            except Exception as e:
                logging.error(f"Anomaly check steps error: {e}")
