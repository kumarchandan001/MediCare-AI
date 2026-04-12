"""
routes/api/v1/health.py
───────────────────────
V1 API endpoints for health monitoring, vitals, daily logs, BMI,
activity, medications, goals, risk score, and trends.

All business logic is delegated to existing service/utility layers.
"""

import traceback
from flask import request, session

from routes.api.v1 import api_v1
from utils.api_response import success, created, error, validation_error, server_error, unauthorized
from utils.api_validators import validate_api_request, require_json
from utils.auth import login_required


def _uid():
    return session['user_id']


# ═════════════════════════════════════════════════════════════════════════════
#  Dashboard Summary
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/summary', methods=['GET'])
@login_required
def v1_health_summary():
    """Aggregate health metrics for dashboard cards and charts."""
    try:
        from services.health_service import get_dashboard_summary
        summary = get_dashboard_summary(_uid())
        
        # ── Personalization Engine Injection ──
        try:
            from services.personalization_service import get_personalization_insights
            summary['personalization_insights'] = get_personalization_insights(_uid())
        except Exception as e:
            print(f"[personalization] Failed: {e}")
            summary['personalization_insights'] = []
            
        return success(summary)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load health summary", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Health History
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/history', methods=['GET'])
@login_required
def v1_health_history():
    """Return health monitoring records for the requested time window."""
    try:
        from services.health_service import get_health_history
        range_param = request.args.get('range', 'week')
        result = get_health_history(_uid(), range_param)
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load health history", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Vitals (Health Monitoring)
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/vitals', methods=['POST'])
@login_required
def v1_save_vitals():
    """Save a vital-signs snapshot."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data:
            return error("No data received")

        # ── Smart Validation Engine Injection ──
        from services.validation_engine import ValidationEngine
        force = data.get('force_confirm', False)
        validation_res = ValidationEngine.evaluate(_uid(), data, force_confirm=force)
        
        if not validation_res['is_valid']:
            return validation_error("Biological limits check failed", fields=validation_res['errors'])
            
        if validation_res['requires_confirmation']:
            # Halt returning 406 Not Acceptable to trigger Warning Modal
            return error("Unusual values detected", code=406, details={
                "warnings": validation_res['warnings'],
                "suggestions": validation_res['suggestions']
            })

        from services.health_service import save_health_monitoring
        result = save_health_monitoring(_uid(), data)

        if not result.get('success'):
            return validation_error("Validation failed", fields=result.get('errors'))

        # Auto-trigger smart alerts
        try:
            from services.alert_service import generate_alerts, persist_alerts
            from services.personalization_service import invalidate_user_cache
            
            alerts = generate_alerts(_uid(), days=7)
            persist_alerts(_uid(), alerts)
            result['alerts_generated'] = len(alerts)
            
            # Invalidate personalization cache to refresh insights
            invalidate_user_cache(_uid())
        except Exception:
            result['alerts_generated'] = 0

        return created(result, message="Vitals saved successfully")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to save vitals", exc=e)


@api_v1.route('/health/vitals/latest', methods=['GET'])
@login_required
def v1_latest_vitals():
    """Get today's health summary including latest vitals and BMI."""
    try:
        from services.health_service import get_today_summary
        result = get_today_summary(_uid())
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load latest vitals", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  BMI
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/bmi', methods=['GET'])
@login_required
def v1_get_bmi():
    """Return BMI history for the user."""
    try:
        from models.health_record import BmiRecord
        records = BmiRecord.query.filter_by(
            user_id=_uid()
        ).order_by(BmiRecord.recorded_at.desc()).limit(20).all()

        bmi_list = [r.to_dict() for r in records]
        latest = bmi_list[0] if bmi_list else None
        return success({
            'records': bmi_list,
            'latest': latest,
            'count': len(bmi_list),
        })
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load BMI data", exc=e)


@api_v1.route('/health/bmi', methods=['POST'])
@login_required
def v1_post_bmi():
    """Record a new BMI entry."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data or 'height' not in data or 'weight' not in data:
            return validation_error("Missing required fields", fields=[
                {"field": "height", "message": "height is required"},
                {"field": "weight", "message": "weight is required"},
            ])
            
        # ── Smart Validation Engine Injection ──
        from services.validation_engine import ValidationEngine
        force = data.get('force_confirm', False)
        validation_res = ValidationEngine.evaluate(_uid(), data, force_confirm=force)
        
        if not validation_res['is_valid']:
            return validation_error("Biological limits check failed", fields=validation_res['errors'])
            
        if validation_res['requires_confirmation']:
            return error("Unusual values detected", code=406, details={
                "warnings": validation_res['warnings'],
                "suggestions": validation_res['suggestions']
            })

        from services.health_service import record_bmi
        result = record_bmi(_uid(), data)
        if not result.get('success'):
            return validation_error("BMI recording failed", fields=result.get('errors'))

        # Invalidate personalization cache
        try:
            from services.personalization_service import invalidate_user_cache
            invalidate_user_cache(_uid())
        except Exception:
            pass

        return created(result, message="BMI recorded successfully")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to record BMI", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Activity
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/activity', methods=['GET'])
@login_required
def v1_get_activities():
    """Return activity tracking records."""
    try:
        from services.health_service import get_activities
        result = get_activities(
            _uid(),
            start_date=request.args.get('start_date'),
            end_date=request.args.get('end_date'),
            activity_type=request.args.get('activity_type'),
        )
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load activities", exc=e)


@api_v1.route('/health/activity', methods=['POST'])
@login_required
def v1_post_activity():
    """Add a new activity record."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data or 'activity_type' not in data:
            return validation_error("Missing required field: activity_type")

        # ── Smart Validation Engine Injection ──
        from services.validation_engine import ValidationEngine
        force = data.get('force_confirm', False)
        validation_res = ValidationEngine.evaluate(_uid(), data, force_confirm=force)
        
        if not validation_res['is_valid']:
            return validation_error("Biological limits check failed", fields=validation_res['errors'])
            
        if validation_res['requires_confirmation']:
            return error("Unusual values detected", code=406, details={
                "warnings": validation_res['warnings'],
                "suggestions": validation_res['suggestions']
            })

        from services.health_service import add_activity
        result = add_activity(_uid(), data)
        if not result.get('success'):
            return validation_error("Activity validation failed", fields=result.get('errors'))

        # Invalidate personalization cache
        try:
            from services.personalization_service import invalidate_user_cache
            invalidate_user_cache(_uid())
        except Exception:
            pass

        return created(result, message="Activity recorded successfully")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to record activity", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Medications
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/medications', methods=['GET'])
@login_required
def v1_get_medications():
    """Return active medication reminders."""
    try:
        from services.health_service import get_medications
        result = get_medications(_uid())
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load medications", exc=e)


@api_v1.route('/health/medications', methods=['POST'])
@login_required
def v1_post_medication():
    """Add a new medication reminder."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data or not data.get('medication_name'):
            return validation_error("Missing required field: medication_name")

        from models import db
        from models.medication import MedicationReminder

        reminder = MedicationReminder(
            user_id=_uid(),
            medication_name=data['medication_name'],
            dosage=data.get('dosage', ''),
            frequency=data.get('frequency', 'daily'),
            reminder_time=data.get('reminder_time'),
            notes=data.get('notes', ''),
        )
        db.session.add(reminder)
        db.session.commit()

        return created(
            {'id': reminder.id, 'medication_name': reminder.medication_name},
            message="Medication reminder added"
        )
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to add medication", exc=e)


@api_v1.route('/health/medications/<int:med_id>', methods=['DELETE'])
@login_required
def v1_delete_medication(med_id):
    """Deactivate a medication reminder."""
    try:
        from models import db
        from models.medication import MedicationReminder

        med = MedicationReminder.query.filter_by(
            id=med_id, user_id=_uid()
        ).first()  
        if not med:
            return error("Medication not found", code=404, error_type="NOT_FOUND")

        med.is_active = False
        db.session.commit()
        return success({'id': med_id, 'deactivated': True}, message="Medication deactivated")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to delete medication", exc=e)


@api_v1.route('/health/medications/<int:med_id>/taken', methods=['POST'])
@login_required
def v1_medication_taken(med_id):
    """Record that a medication was taken."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json or {}
        data['medication_id'] = med_id

        from services.health_service import record_medication_history
        result = record_medication_history(_uid(), data)
        return success(result, message="Medication history recorded")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to record medication history", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Risk Score & Trends
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/risk-score', methods=['GET'])
@login_required
def v1_risk_score():
    """Return the composite health risk score."""
    try:
        from utils.risk_engine import calculate_risk
        days = request.args.get('days', 7, type=int)
        result = calculate_risk(_uid(), days=days)
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return success({
            'score': 0, 'level': 'unknown',
            'reasons': ['Start logging health data for accurate risk scoring.'],
            'factors': {},
        })


@api_v1.route('/health/trends', methods=['GET'])
@login_required
def v1_trends():
    """Return health trend insights."""
    try:
        from utils.trend_analysis import analyze_trends
        days = request.args.get('days', 7, type=int)
        insights = analyze_trends(_uid(), days=days)
        return success({'insights': insights, 'days': days, 'count': len(insights)})
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to generate trends", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Daily Health Log
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/daily-log', methods=['GET'])
@login_required
def v1_get_daily_logs():
    """Return recent daily health logs."""
    try:
        from services.health_service import get_daily_health_logs
        days = request.args.get('days', 7, type=int)
        result = get_daily_health_logs(_uid(), days=days)
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load daily logs", exc=e)


@api_v1.route('/health/daily-log', methods=['POST'])
@login_required
def v1_post_daily_log():
    """Save or update today's daily health log."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data:
            return error("No data received")

        # ── Smart Validation Engine Injection ──
        from services.validation_engine import ValidationEngine
        force = data.get('force_confirm', False)
        validation_res = ValidationEngine.evaluate(_uid(), data, force_confirm=force)
        
        if not validation_res['is_valid']:
            return validation_error("Biological limits check failed", fields=validation_res['errors'])
            
        if validation_res['requires_confirmation']:
            return error("Unusual values detected", code=406, details={
                "warnings": validation_res['warnings'],
                "suggestions": validation_res['suggestions']
            })

        from services.health_service import save_daily_health_log, save_health_monitoring
        result = save_daily_health_log(_uid(), data)

        if not result.get('success'):
            return validation_error("Validation failed", fields=result.get('errors'))

        # Mirror vitals into HealthMonitoring for trend tracking
        try:
            save_health_monitoring(_uid(), {
                'heart_rate': data.get('heart_rate'),
                'blood_pressure': data.get('blood_pressure'),
                'oxygen_level': data.get('oxygen_level'),
                'body_temperature': data.get('body_temperature'),
                'stress_level': data.get('stress_level'),
                'sleep_hours': data.get('sleep_hours'),
                'water_intake': data.get('water_intake'),
                'notes': data.get('notes'),
            })
        except Exception:
            pass  # Don't fail daily log if vitals mirror fails

        # Sync steps into activity_tracking so the Activity section stays updated
        steps = data.get('steps')
        if steps and int(steps) > 0:
            try:
                from utils.db_helper import fetch_one, execute_sql
                from datetime import date as dt_date
                today = dt_date.today().isoformat()

                existing = fetch_one(
                    "SELECT id FROM activity_tracking "
                    "WHERE user_id = :uid AND activity_date = :d AND activity_type = 'Daily Log' AND source = 'manual'",
                    {'uid': _uid(), 'd': today}
                )
                if existing:
                    execute_sql(
                        "UPDATE activity_tracking SET steps = :s WHERE id = :id",
                        {'s': int(steps), 'id': existing['id']},
                        commit=True
                    )
                else:
                    execute_sql(
                        "INSERT INTO activity_tracking (user_id, activity_type, steps, activity_date, source, created_at) "
                        "VALUES (:uid, 'Daily Log', :s, :d, 'manual', NOW())",
                        {'uid': _uid(), 's': int(steps), 'd': today},
                        commit=True
                    )
            except Exception:
                pass  # Don't fail daily log if activity sync fails

        # Invalidate personalization cache
        try:
            from services.personalization_service import invalidate_user_cache
            invalidate_user_cache(_uid())
        except Exception:
            pass

        return created(result, message="Daily health log saved")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to save daily log", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Health Goals
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/health/goals', methods=['GET'])
@login_required
def v1_get_goals():
    """Return active health goals."""
    try:
        from services.health_service import get_health_goals
        result = get_health_goals(_uid())
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load goals", exc=e)


@api_v1.route('/health/goals', methods=['POST'])
@login_required
def v1_post_goal():
    """Create a new health goal."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data or 'goal_type' not in data or 'target_value' not in data:
            return validation_error("Missing required fields: goal_type, target_value")

        from services.health_service import add_health_goal
        result = add_health_goal(_uid(), data)
        if not result.get('success'):
            return validation_error("Goal creation failed", fields=result.get('errors'))

        return created(result, message="Health goal created")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to create goal", exc=e)


@api_v1.route('/health/goals/<int:goal_id>', methods=['PUT'])
@login_required
def v1_put_goal(goal_id):
    """Update an existing health goal."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data:
            return error("No data provided")

        from services.health_service import update_health_goal
        result = update_health_goal(_uid(), goal_id, data)
        status = result.pop('status', 200)

        if status == 404:
            return error("Goal not found", code=404, error_type="NOT_FOUND")

        return success(result, message="Goal updated")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to update goal", exc=e)
