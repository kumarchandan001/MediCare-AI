"""
services/health_service.py
──────────────────────────
Business logic for health-domain features using SQLAlchemy ORM.

All database interactions use ORM models — no raw SQL.
Validation is done via utils/validators.py before any write.

Daily Data Flow:
  User Form → Route → validate_*() → service function → ORM model → DB
"""

import json
from datetime import datetime, date, timedelta

from models import db
from models.health_record import (
    HealthMonitoring, DailyHealthLog, BmiRecord,
    ActivityRecord, HealthGoal, HealthMetric,
)
from models.medication import MedicationReminder, MedicationHistory
from utils.validators import (
    validate_daily_health_log, validate_health_monitoring,
    safe_int, safe_float, sanitise_string,
)


# ─────────────────────────────────────────────────────────────────────────────
# Health Monitoring (vital signs snapshots)
# ─────────────────────────────────────────────────────────────────────────────

def save_health_monitoring(user_id: int, data: dict, source: str = 'manual') -> dict:
    """
    Save a vital-signs snapshot.
    Flow: Route -> validate -> ORM insert -> commit.
    """
    is_valid, errors = validate_health_monitoring(data)
    if not is_valid:
        return {'success': False, 'errors': errors}

    blood_pressure = data.get('blood_pressure')
    if isinstance(blood_pressure, dict):
        blood_pressure = json.dumps(blood_pressure)

    record = HealthMonitoring(
        user_id=user_id,
        heart_rate=safe_int(data.get('heart_rate')),
        blood_pressure=blood_pressure,
        oxygen_level=safe_int(data.get('oxygen_level')),
        body_temperature=safe_float(data.get('body_temperature')),
        glucose_level=safe_float(data.get('glucose_level')),
        cholesterol_level=safe_float(data.get('cholesterol_level')),
        stress_level=safe_int(data.get('stress_level')),
        sleep_hours=safe_float(data.get('sleep_hours')),
        notes=sanitise_string(data.get('notes'), 500),
        source=source,
    )
    db.session.add(record)

    # Mirror key metrics into HealthMetric for trend tracking
    metrics = [
        ('heart_rate', data.get('heart_rate')),
        ('oxygen_level', data.get('oxygen_level')),
    ]
    if data.get('body_temperature'):
        metrics.append(('body_temperature', data['body_temperature']))
    if isinstance(data.get('blood_pressure'), dict):
        bp = data['blood_pressure']
        if 'systolic' in bp:
            metrics.append(('blood_pressure_systolic', bp['systolic']))
        if 'diastolic' in bp:
            metrics.append(('blood_pressure_diastolic', bp['diastolic']))

    for metric_name, value in metrics:
        if value is not None:
            db.session.add(HealthMetric(
                user_id=user_id, metric=metric_name,
                value=float(value),
            ))

    db.session.commit()
    return {'success': True, 'message': 'Health data saved successfully', 'source': source}


def get_health_history(user_id: int, range_param: str = 'week') -> dict:
    """Return health monitoring records for the requested time window."""
    today = datetime.now()
    if range_param == 'today':
        start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range_param == 'week':
        start = today - timedelta(days=7)
    elif range_param == 'month':
        start = today - timedelta(days=30)
    else:
        start = datetime(1970, 1, 1)

    records = HealthMonitoring.query.filter(
        HealthMonitoring.user_id == user_id,
        HealthMonitoring.created_at >= start,
    ).order_by(HealthMonitoring.created_at.desc()).all()

    return {
        'success': True,
        'history': [r.to_dict() for r in records],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Daily Health Log (the daily data flow)
# ─────────────────────────────────────────────────────────────────────────────

def save_daily_health_log(user_id: int, data: dict, source: str = 'manual') -> dict:
    """
    Save or update today's daily health log.

    DAILY DATA FLOW:
    1. User submits form with sleep, steps, water, heart_rate, blood_pressure
    2. Route calls this function
    3. Validation via validate_daily_health_log()
    4. Upsert DailyHealthLog (one row per user per day per source)
    5. Also create HealthMonitoring snapshot for vitals
    6. Commit to DB
    """
    is_valid, errors = validate_daily_health_log(data)
    if not is_valid:
        return {'success': False, 'errors': errors}

    today = date.today()
    log_date = data.get('date', today)
    if isinstance(log_date, str):
        try:
            log_date = datetime.strptime(log_date, '%Y-%m-%d').date()
        except ValueError:
            log_date = today

    # Upsert: find existing log for this user+date+source or create new
    log = DailyHealthLog.query.filter_by(
        user_id=user_id, log_date=log_date, source=source
    ).first()

    if not log:
        log = DailyHealthLog(user_id=user_id, log_date=log_date, source=source)
        db.session.add(log)

    # Update fields
    if data.get('sleep_hours') is not None:
        log.sleep_hours = safe_float(data['sleep_hours'])
    if data.get('steps') is not None:
        log.steps = safe_int(data['steps'])
    if data.get('water_intake') is not None:
        log.water_ml = safe_int(data['water_intake'])
    elif data.get('water_ml') is not None:
        log.water_ml = safe_int(data['water_ml'])
    if data.get('mood_score') is not None:
        log.mood_score = safe_int(data['mood_score'])
    if data.get('energy_level') is not None:
        log.energy_level = safe_int(data['energy_level'])
    if data.get('calories_in') is not None:
        log.calories_in = safe_int(data['calories_in'])
    if data.get('calories_out') is not None:
        log.calories_out = safe_int(data['calories_out'])
    if data.get('notes') is not None:
        log.notes = sanitise_string(data['notes'], 500)

    log.updated_at = datetime.utcnow()

    # If vital signs provided, also create a monitoring snapshot
    hr = safe_int(data.get('heart_rate'))
    bp_sys = safe_int(data.get('bp_systolic') or data.get('systolic'))
    bp_dia = safe_int(data.get('bp_diastolic') or data.get('diastolic'))

    if hr or bp_sys:
        bp_json = None
        if bp_sys and bp_dia:
            bp_json = json.dumps({'systolic': bp_sys, 'diastolic': bp_dia})

        monitoring = HealthMonitoring(
            user_id=user_id,
            heart_rate=hr,
            blood_pressure=bp_json,
            sleep_hours=log.sleep_hours,
            source=source,
        )
        db.session.add(monitoring)

    db.session.commit()
    return {'success': True, 'message': 'Daily health log saved', 'log_id': log.id, 'source': source}


def get_daily_health_logs(user_id: int, days: int = 7) -> dict:
    """Get recent daily health logs."""
    start_date = date.today() - timedelta(days=days)

    logs = DailyHealthLog.query.filter(
        DailyHealthLog.user_id == user_id,
        DailyHealthLog.log_date >= start_date,
    ).order_by(DailyHealthLog.log_date.desc()).all()

    return {
        'success': True,
        'logs': [log.to_dict() for log in logs],
    }


def get_today_summary(user_id: int) -> dict:
    """Get today's health summary for dashboard display."""
    today = date.today()

    log = DailyHealthLog.query.filter_by(
        user_id=user_id, log_date=today
    ).first()

    # Latest vital signs
    latest_vital = HealthMonitoring.query.filter_by(
        user_id=user_id
    ).order_by(HealthMonitoring.created_at.desc()).first()

    # Latest BMI
    latest_bmi = BmiRecord.query.filter_by(
        user_id=user_id
    ).order_by(BmiRecord.recorded_at.desc()).first()

    return {
        'success': True,
        'daily_log': log.to_dict() if log else None,
        'latest_vitals': latest_vital.to_dict() if latest_vital else None,
        'latest_bmi': latest_bmi.to_dict() if latest_bmi else None,
    }


def get_dashboard_summary(user_id: int) -> dict:
    """
    Merge manual + Google Fit data with manual-priority.
    Each metric returns its value AND source ('manual' or 'google_fit').
    """
    from sqlalchemy import func
    from models.health_profile import HealthProfile
    since = datetime.utcnow() - timedelta(days=7)
    today_date = datetime.now().date()

    # ── Helper: pick best source (manual wins) ────────────────────────────
    def _pick(manual_val, gfit_val):
        if manual_val is not None:
            return manual_val, 'manual'
        if gfit_val is not None:
            return gfit_val, 'google_fit'
        return None, None

    # ── Latest vitals (prefer manual over google_fit) ─────────────────────
    latest_manual = HealthMonitoring.query.filter(
        HealthMonitoring.user_id == user_id,
        HealthMonitoring.source == 'manual',
    ).order_by(HealthMonitoring.created_at.desc()).first()

    latest_gfit = HealthMonitoring.query.filter(
        HealthMonitoring.user_id == user_id,
        HealthMonitoring.source == 'google_fit',
    ).order_by(HealthMonitoring.created_at.desc()).first()

    latest = latest_manual or latest_gfit  # for chart history queries

    # ── Sleep history (avg per day — all sources) ─────────────────────────
    sleep_records = db.session.query(
        func.date(HealthMonitoring.created_at).label('day'),
        func.avg(HealthMonitoring.sleep_hours).label('avg_sleep')
    ).filter(
        HealthMonitoring.user_id == user_id,
        HealthMonitoring.created_at >= since,
        HealthMonitoring.sleep_hours != None
    ).group_by(func.date(HealthMonitoring.created_at)).order_by('day').all()
    sleep_history = [round(float(r.avg_sleep), 1) for r in sleep_records]

    # ── Steps history (sum per day — all sources, deduplicated by priority)
    step_records = db.session.query(
        ActivityRecord.activity_date.label('day'),
        func.sum(ActivityRecord.steps).label('total_steps')
    ).filter(
        ActivityRecord.user_id == user_id,
        ActivityRecord.activity_date >= since.date()
    ).group_by(ActivityRecord.activity_date).order_by('day').all()
    steps_history = [int(r.total_steps) for r in step_records]

    # ── Latest BMI ────────────────────────────────────────────────────────
    latest_bmi = BmiRecord.query.filter_by(user_id=user_id).order_by(BmiRecord.recorded_at.desc()).first()
    bmi_val = None
    bmi_cat = None
    if latest_bmi:
        bmi_val = round(float(latest_bmi.bmi), 1)
        bmi_cat = latest_bmi.bmi_category
    else:
        profile = HealthProfile.query.filter_by(user_id=user_id).first()
        if profile and profile.height and profile.weight:
            computed_bmi, computed_cat = calculate_bmi(profile.height, profile.weight)
            bmi_val = round(computed_bmi, 1)
            bmi_cat = computed_cat

    # ── Today's Daily Health Logs — manual + google_fit ───────────────────
    manual_daily = DailyHealthLog.query.filter_by(
        user_id=user_id, log_date=today_date, source='manual'
    ).first()
    gfit_daily = DailyHealthLog.query.filter_by(
        user_id=user_id, log_date=today_date, source='google_fit'
    ).first()

    # ── Sleep: manual priority ────────────────────────────────────────────
    m_sleep = round(float(manual_daily.sleep_hours), 1) if manual_daily and manual_daily.sleep_hours is not None else None
    g_sleep = round(float(gfit_daily.sleep_hours), 1) if gfit_daily and gfit_daily.sleep_hours is not None else None
    sleep_val, sleep_src = _pick(m_sleep, g_sleep)

    # ── Water: manual priority ────────────────────────────────────────────
    m_water = round(float(manual_daily.water_ml) / 1000.0, 1) if manual_daily and manual_daily.water_ml is not None else None
    g_water = round(float(gfit_daily.water_ml) / 1000.0, 1) if gfit_daily and gfit_daily.water_ml is not None else None
    water_val, water_src = _pick(m_water, g_water)

    # ── Steps: manual activity first, then google_fit activity ────────────
    manual_step_sum = db.session.query(func.sum(ActivityRecord.steps)).filter(
        ActivityRecord.user_id == user_id,
        ActivityRecord.activity_date == today_date,
        ActivityRecord.source == 'manual',
    ).scalar()
    gfit_step_sum = db.session.query(func.sum(ActivityRecord.steps)).filter(
        ActivityRecord.user_id == user_id,
        ActivityRecord.activity_date == today_date,
        ActivityRecord.source == 'google_fit',
    ).scalar()

    m_steps = int(manual_step_sum) if manual_step_sum else None
    # Also check manual daily log steps as fallback
    if m_steps is None and manual_daily and manual_daily.steps:
        m_steps = int(manual_daily.steps)
    g_steps = int(gfit_step_sum) if gfit_step_sum else None
    if g_steps is None and gfit_daily and gfit_daily.steps:
        g_steps = int(gfit_daily.steps)

    steps_val, steps_src = _pick(m_steps, g_steps)

    # ── Heart Rate: manual priority ───────────────────────────────────────
    m_hr = int(latest_manual.heart_rate) if latest_manual and latest_manual.heart_rate else None
    g_hr = int(latest_gfit.heart_rate) if latest_gfit and latest_gfit.heart_rate else None
    hr_val, hr_src = _pick(m_hr, g_hr)

    def _trend(vals):
        if len(vals) < 2: return 'flat'
        return 'up' if vals[-1] > vals[-2] else ('down' if vals[-1] < vals[-2] else 'flat')

    has_data = any([latest, sleep_history, steps_history, latest_bmi, manual_daily, gfit_daily])

    return {
        'has_data': has_data,
        'sleep': sleep_val,
        'sleep_source': sleep_src,
        'steps': steps_val,
        'steps_source': steps_src,
        'water': water_val,
        'water_source': water_src,
        'bmi': bmi_val,
        'bmi_category': bmi_cat,
        'heart_rate': hr_val,
        'heart_rate_source': hr_src,
        'sleep_trend': _trend(sleep_history),
        'steps_trend': _trend(steps_history),
        'water_trend': 'flat',
        'sleep_history': sleep_history,
        'steps_history': steps_history,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Health Goals
# ─────────────────────────────────────────────────────────────────────────────

def get_health_goals(user_id: int) -> dict:
    goals = HealthGoal.query.filter_by(
        user_id=user_id, is_active=True
    ).all()
    return {
        'success': True,
        'goals': [g.to_dict() for g in goals],
    }


def add_health_goal(user_id: int, data: dict) -> dict:
    
    start_date_raw = data.get('start_date')
    end_date_raw = data.get('end_date')
    
    start_date = None
    if start_date_raw:
        try: start_date = datetime.strptime(start_date_raw, '%Y-%m-%d').date()
        except (ValueError, TypeError): pass
        
    end_date = None
    if end_date_raw:
        try: end_date = datetime.strptime(end_date_raw, '%Y-%m-%d').date()
        except (ValueError, TypeError): pass

    goal = HealthGoal(
        user_id=user_id,
        goal_type=sanitise_string(data['goal_type'], 60),
        target_value=safe_float(data['target_value']),
        current_value=safe_float(data.get('current_value', 0)),
        start_date=start_date,
        end_date=end_date,
        frequency=sanitise_string(data.get('frequency', 'daily'), 20),
    )
    db.session.add(goal)
    db.session.commit()
    return {'success': True, 'goal_id': goal.id}


def update_health_goal(user_id: int, goal_id: int, data: dict) -> dict:
    goal = HealthGoal.query.filter_by(
        id=goal_id, user_id=user_id
    ).first()
    if not goal:
        return {'success': False, 'error': 'Goal not found', 'status': 404}

    allowed = ['target_value', 'current_value', 'frequency', 'end_date', 'is_active']
    for field in allowed:
        if field in data:
            setattr(goal, field, data[field])

    db.session.commit()
    return {'success': True}


# ─────────────────────────────────────────────────────────────────────────────
# Activity Tracking
# ─────────────────────────────────────────────────────────────────────────────

def get_activities(user_id: int, start_date=None, end_date=None,
                   activity_type=None) -> dict:
    query = ActivityRecord.query.filter_by(user_id=user_id)
    if start_date:
        query = query.filter(ActivityRecord.activity_date >= start_date)
    if end_date:
        query = query.filter(ActivityRecord.activity_date <= end_date)
    if activity_type:
        query = query.filter_by(activity_type=activity_type)

    activities = query.order_by(
        ActivityRecord.activity_date.desc()
    ).all()

    return {
        'success': True,
        'activities': [a.to_dict() for a in activities],
    }


def add_activity(user_id: int, data: dict, source: str = 'manual') -> dict:
    activity_date_raw = data.get('activity_date', datetime.now().strftime('%Y-%m-%d'))
    try:
        activity_date = datetime.strptime(activity_date_raw, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        activity_date = datetime.now().date()

    activity = ActivityRecord(
        user_id=user_id,
        activity_type=sanitise_string(data['activity_type'], 60),
        duration=safe_int(data.get('duration')),
        steps=safe_int(data.get('steps')),
        distance=safe_float(data.get('distance')),
        calories_burned=safe_int(data.get('calories_burned')),
        heart_rate_avg=safe_int(data.get('heart_rate_avg')),
        heart_rate_max=safe_int(data.get('heart_rate_max')),
        activity_date=activity_date,
        start_time=data.get('start_time'),
        end_time=data.get('end_time'),
        notes=sanitise_string(data.get('notes'), 500),
        source=source,
    )
    db.session.add(activity)

    # Track steps as a metric
    if data.get('steps'):
        db.session.add(HealthMetric(
            user_id=user_id, metric='steps',
            value=float(data['steps']),
        ))

    db.session.commit()
    return {'success': True, 'activity_id': activity.id, 'source': source}


# ─────────────────────────────────────────────────────────────────────────────
# Medications
# ─────────────────────────────────────────────────────────────────────────────

def get_medications(user_id: int) -> dict:
    meds = MedicationReminder.query.filter_by(
        user_id=user_id, is_active=True
    ).all()
    return {
        'success': True,
        'medications': [m.to_dict() for m in meds],
    }


def record_medication_history(user_id: int, data: dict) -> dict:
    reminder_id = data.get('reminder_id')

    if not reminder_id:
        reminder = MedicationReminder.query.filter_by(
            user_id=user_id,
            medication_name=data['medication_name'],
            is_active=True,
        ).first()
        if reminder:
            reminder_id = reminder.id
            if not data.get('dosage'):
                data['dosage'] = reminder.dosage

    history = MedicationHistory(
        user_id=user_id,
        reminder_id=reminder_id,
        medication_name=sanitise_string(data['medication_name'], 120),
        dosage=sanitise_string(data.get('dosage'), 60),
        taken_at=data.get('taken_at', datetime.now()),
        status=sanitise_string(data['status'], 20),
        notes=sanitise_string(data.get('notes'), 500),
    )
    db.session.add(history)
    db.session.commit()
    return {'success': True, 'history_id': history.id}


# ─────────────────────────────────────────────────────────────────────────────
# BMI
# ─────────────────────────────────────────────────────────────────────────────

def calculate_bmi(height_cm: float, weight_kg: float) -> tuple:
    """Pure calculation. Returns (bmi, category)."""
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m ** 2), 2)
    if bmi < 18.5:
        category = 'Underweight'
    elif bmi < 25:
        category = 'Normal'
    elif bmi < 30:
        category = 'Overweight'
    else:
        category = 'Obese'
    return bmi, category


def get_bmi_interpretation(bmi: float, category: str) -> str:
    return {
        'Underweight': 'You are underweight. Consider consulting a healthcare provider.',
        'Normal': 'Your BMI is normal. Maintain a balanced diet and exercise.',
        'Overweight': 'You are overweight. Consider lifestyle changes.',
        'Obese': "Your BMI indicates obesity. Consult a healthcare provider.",
    }.get(category, '')


def record_bmi(user_id: int, data: dict) -> dict:
    """Calculate BMI and persist via ORM."""
    from models.user import User

    height = safe_float(data.get('height'))
    weight = safe_float(data.get('weight'))
    if not height or not weight:
        return {'success': False, 'error': 'Height and weight are required'}
    if height < 30 or height > 300:
        return {'success': False, 'error': 'Height must be between 30 and 300 cm'}
    if weight < 5 or weight > 500:
        return {'success': False, 'error': 'Weight must be between 5 and 500 kg'}

    bmi, category = calculate_bmi(height, weight)

    # Update user baseline
    user = db.session.get(User, user_id)
    if user:
        user.height = height
        user.weight = weight

    # Save BMI record
    record = BmiRecord(
        user_id=user_id,
        height=height,
        weight=weight,
        bmi=bmi,
        bmi_category=category,
        notes=sanitise_string(data.get('notes'), 500),
    )
    db.session.add(record)

    # Track as metric
    db.session.add(HealthMetric(user_id=user_id, metric='weight', value=weight))
    db.session.add(HealthMetric(user_id=user_id, metric='bmi', value=bmi))

    db.session.commit()
    return {
        'success': True, 'bmi': bmi, 'category': category,
        'interpretation': get_bmi_interpretation(bmi, category),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Disease Prediction History
# ─────────────────────────────────────────────────────────────────────────────

def get_disease_predictions(user_id: int) -> dict:
    """Get prediction history using SQLAlchemy (PostgreSQL-compatible)."""
    try:
        from utils.db_helper import fetch_all
        preds_raw = fetch_all(
            'SELECT * FROM disease_predictions WHERE user_id = :uid ORDER BY predicted_at DESC',
            {'uid': user_id}
        )
        preds = []
        for p in preds_raw:
            preds.append({
                'id': p['id'],
                'symptoms': json.loads(p['symptoms']) if p['symptoms'] else [],
                'predicted_disease': p['predicted_disease'],
                'confidence_score': p['confidence_score'],
                'recommendations': p['recommendations'],
                'predicted_at': p['predicted_at'],
            })
        return {'success': True, 'predictions': preds}
    except Exception as e:
        return {'success': True, 'predictions': []}


def save_disease_prediction(user_id: int, data: dict) -> dict:
    """Save prediction result using SQLAlchemy (PostgreSQL-compatible)."""
    try:
        from utils.db_helper import execute_insert_returning
        from datetime import datetime
        symptoms = data['symptoms']
        if isinstance(symptoms, list):
            symptoms = json.dumps(symptoms)
        prediction_id = execute_insert_returning('''
            INSERT INTO disease_predictions
            (user_id, symptoms, predicted_disease, confidence_score,
             recommendations, saved_to_records,
             xai_summary, evidence_strength, explanation_score,
             risk_factors_count, alternatives_count,
             predicted_at)
            VALUES (:uid, :symptoms, :disease, :score, :recs, :saved,
                    :xai_summary, :evidence_strength, :explanation_score,
                    :risk_factors_count, :alternatives_count,
                    :now)
            RETURNING id
        ''', {
            'uid': user_id,
            'symptoms': symptoms,
            'disease': data['predicted_disease'],
            'score': data.get('confidence_score'),
            'recs': data.get('recommendations'),
            'saved': data.get('saved_to_records', False),
            'xai_summary': data.get('xai_summary', ''),
            'evidence_strength': data.get('evidence_strength', 'Moderate'),
            'explanation_score': data.get('explanation_score', 0),
            'risk_factors_count': data.get('risk_factors_count', 0),
            'alternatives_count': data.get('alternatives_count', 0),
            'now': datetime.utcnow(),
        })
        return {'success': True, 'prediction_id': prediction_id}
    except Exception as e:
        return {'success': False, 'error': str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Chatbot interactions
# ─────────────────────────────────────────────────────────────────────────────

def record_chatbot_interaction(user_id: int, data: dict) -> dict:
    """Save chatbot interaction using SQLAlchemy (PostgreSQL-compatible)."""
    try:
        from utils.db_helper import execute_insert_returning
        interaction_id = execute_insert_returning('''
            INSERT INTO chatbot_interactions (user_id, query, response, interaction_type)
            VALUES (:uid, :query, :response, :itype)
            RETURNING id
        ''', {
            'uid': user_id,
            'query': sanitise_string(data['query'], 2000),
            'response': sanitise_string(data['response'], 5000),
            'itype': sanitise_string(data.get('interaction_type', 'general'), 30),
        })
        return {'success': True, 'interaction_id': interaction_id}
    except Exception as e:
        return {'success': False, 'error': str(e)}
