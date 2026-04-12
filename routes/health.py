"""
routes/health.py
────────────────
All health-feature routes:
  - Page views (health monitor, advice, activity, medication, BMI, etc.)
  - API endpoints for health monitoring, goals, activity, medications,
    BMI, user profile, emergency contacts, and chatbot interactions.

All business / DB logic is delegated to services/health_service.py.
"""

import traceback
from flask import Blueprint, render_template, request, jsonify, session

from services.health_service import (
    save_health_monitoring,
    get_health_history,
    get_health_goals,
    add_health_goal,
    update_health_goal,
    get_activities,
    add_activity,
    get_medications,
    record_medication_history,
    record_bmi,
    record_chatbot_interaction,
    get_disease_predictions,
    save_disease_prediction,
)
from services.user_service import (
    get_user_profile,
    update_user_profile,
    add_emergency_contact,
    delete_emergency_contact,
)

health_bp = Blueprint('health', __name__)


@health_bp.before_request
def require_login_and_onboarding():
    """Enforce login + onboarding for all health routes."""
    if 'user_id' not in session:
        if request.is_json or request.path.startswith('/api/'):
            return jsonify({'success': False, 'error': 'Unauthorized', 'status': 401}), 401
        from flask import redirect, url_for
        return redirect(url_for('auth.login'))

    # For page routes (not API), also check onboarding completion
    if not request.path.startswith('/api/'):
        from models.user import User
        from models import db
        user = db.session.get(User, session['user_id'])
        if user and not user.profile_completed:
            from flask import redirect, url_for
            return redirect(url_for('onboarding.onboarding_page'))

def _get_user_id() -> int:
    return session['user_id']


# ─────────────────────────────────────────────────────────────────────────────
# Page views
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/health_monitor')
def health_monitor():
    _get_user_id()
    return render_template('health_monitor.html')

@health_bp.route('/health_advice')
def health_advice():
    return render_template('health_advice.html')

@health_bp.route('/disease_prediction')
def disease_prediction():
    return render_template('disease_prediction.html')

@health_bp.route('/bmi')
def bmi():
    return render_template('bmi_calculator.html')

@health_bp.route('/medication_reminder')
def medication_reminder():
    return render_template('medication_reminder.html')

@health_bp.route('/emergency')
def emergency():
    return render_template('emergency.html')

@health_bp.route('/tips')
def tips():
    return render_template('tips_section.html')

@health_bp.route('/activity')
def activity():
    return render_template('activity_tracking.html')

@health_bp.route('/medical_prescription')
def medical_prescription():
    return render_template('medical_prescription.html')

@health_bp.route('/record_management')
def record_management():
    return render_template('record_management.html')

@health_bp.route('/health')
def health_page():
    from datetime import date as _date
    from models.health_record import DailyHealthLog
    user_id = _get_user_id()
    today_log = DailyHealthLog.query.filter_by(
        user_id=user_id, log_date=_date.today()
    ).first()
    return render_template('health.html', today_log=today_log)

@health_bp.route('/ai-assistant')
def ai_assistant():
    return render_template('ai_assistant.html')

@health_bp.route('/reports')
def reports():
    return render_template('reports.html')

@health_bp.route('/nearby-doctors')
def nearby_doctors():
    return render_template('nearby_doctors.html')

@health_bp.route('/profile')
def profile():
    return render_template('profile.html')


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Summary APIs
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/health-summary', methods=['GET'])
def api_health_summary():
    """Aggregate health metrics for the dashboard cards and charts."""
    try:
        user_id = _get_user_id()
        from services.health_service import get_dashboard_summary
        summary = get_dashboard_summary(user_id)
        
        # ── Personalization Engine Injection ──
        try:
            from services.personalization_service import get_personalization_insights
            summary['personalization_insights'] = get_personalization_insights(user_id)
        except Exception as e:
            print(f"[personalization] Failed: {e}")
            summary['personalization_insights'] = []
            
        return jsonify(summary)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'has_data': False,
            'sleep': None, 'steps': None, 'water': None, 'bmi': None,
            'bmi_category': None, 'heart_rate': None,
            'sleep_trend': 'flat', 'steps_trend': 'flat', 'water_trend': 'flat',
            'sleep_history': [], 'steps_history': [],
            'error': 'Unable to load health data',
        }), 500


@health_bp.route('/api/risk-score', methods=['GET'])
def api_risk_score():
    """Return the composite health risk score for the dashboard gauge."""
    try:
        user_id = _get_user_id()
        from utils.risk_engine import calculate_risk
        result = calculate_risk(user_id)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'score': 0, 'level': 'unknown',
            'reasons': ['Start logging health data for accurate risk scoring.'],
            'factors': {},
        })


@health_bp.route('/api/habit-tips', methods=['GET'])
def api_habit_tips():
    """Return personalised habit coaching tips for the dashboard."""
    try:
        user_id = _get_user_id()
        from services.habit_coach import generate_habit_tips
        result = generate_habit_tips(user_id)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'tips': [],
            'focus_area': None,
            'message': 'Log health data to receive personalised tips.',
        })


# ─────────────────────────────────────────────────────────────────────────────
# Chatbot API (AI Assistant)
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/chat', methods=['POST'])
def api_chat():
    """Context-aware AI chatbot endpoint."""
    try:
        user_id = _get_user_id()
        data = request.json
        if not data or not data.get('message', '').strip():
            return jsonify({'response': 'Please ask a question about your health.', 'context_used': False})

        from services.chatbot import generate_response
        result = generate_response(user_id, data['message'])

        if 'response' in result:
            return jsonify({
                'response': result['response'],
                'context_used': result.get('context_used', False),
                'source': result.get('source', 'unknown'),
            })
        else:
            return jsonify({
                'response': (
                    "I'm unable to connect to the AI service right now. "
                    "Please ensure your GEMINI_API_KEY is set in the .env file. "
                    "In the meantime, here's a general tip: Stay hydrated and "
                    "get 7-9 hours of sleep daily!"
                ),
                'context_used': False,
            })
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'response': (
                "I encountered an error processing your request. "
                "Please try again in a moment."
            ),
            'context_used': False,
            'error': str(e),
        }), 500


# ─────────────────────────────────────────────────────────────────────────────
# Health Monitoring API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/health-monitoring', methods=['POST'])
def save_health_data():
    try:
        user_id = _get_user_id()
        data    = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data received'}), 400
        if not all(k in data for k in ('heart_rate', 'blood_pressure', 'oxygen_level')):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = save_health_monitoring(user_id, data)

        # ── Auto-trigger smart alerts on new health data ──────────────────────
        try:
            from services.alert_service import generate_alerts, persist_alerts
            alerts = generate_alerts(user_id, days=7)
            saved  = persist_alerts(user_id, alerts)
            result['alerts_generated'] = len(alerts)
            result['alerts_persisted'] = saved
        except Exception as alert_err:
            # Don't fail the health save if alert generation fails
            print(f"[health route] Alert generation error: {alert_err}")
            result['alerts_generated'] = 0

        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Daily Health Log API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/daily-log', methods=['GET'])
def get_today_log():
    """Return today's daily health log for the current user."""
    try:
        from services.health_service import get_today_summary
        result = get_today_summary(_get_user_id())
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/daily-log', methods=['POST'])
def save_daily_log():
    """Save or update today's daily health log. One entry per user per day."""
    try:
        from services.health_service import save_daily_health_log
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data received'}), 400

        user_id = _get_user_id()
        result = save_daily_health_log(user_id, data)

        # Also mirror vitals into HealthMonitoring for trend tracking
        if result.get('success'):
            try:
                save_health_monitoring(user_id, {
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

        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/health-history', methods=['GET'])
def get_health_history_route():
    try:
        user_id     = _get_user_id()
        range_param = request.args.get('range', 'week')
        result      = get_health_history(user_id, range_param)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Health Goals API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/health-goals', methods=['GET'])
def get_goals():
    try:
        result = get_health_goals(_get_user_id())
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/health-goals', methods=['POST'])
def post_goal():
    try:
        data = request.json
        if not data or 'goal_type' not in data or 'target_value' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = add_health_goal(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/health-goals/<int:goal_id>', methods=['PUT'])
def put_goal(goal_id):
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        result = update_health_goal(_get_user_id(), goal_id, data)
        status = result.pop('status', 200)
        return jsonify(result), status
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Activity Tracking API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/activity', methods=['GET'])
def get_activity_list():
    try:
        result = get_activities(
            _get_user_id(),
            start_date    = request.args.get('start_date'),
            end_date      = request.args.get('end_date'),
            activity_type = request.args.get('activity_type'),
        )
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/activity', methods=['POST'])
def post_activity():
    try:
        data = request.json
        if not data or 'activity_type' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = add_activity(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Medications API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/medications', methods=['GET'])
def get_meds():
    try:
        result = get_medications(_get_user_id())
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/medications', methods=['POST'])
def post_medication():
    """Add a new medication reminder."""
    try:
        user_id = _get_user_id()
        data = request.json
        if not data or 'medication_name' not in data:
            return jsonify({'success': False, 'error': 'Missing medication_name'}), 400
        from services.health_service import add_medication
        result = add_medication(user_id, data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/medications/history', methods=['POST'])
def post_medication_history():
    try:
        data = request.json
        if not data or 'medication_name' not in data or 'status' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = record_medication_history(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# BMI API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/bmi', methods=['GET'])
def get_bmi():
    """Return the latest BMI record for the user."""
    try:
        user_id = _get_user_id()
        from services.health_service import get_latest_bmi
        result = get_latest_bmi(user_id)
        if result['success']:
            return jsonify(result)
        return jsonify({'success': True, 'bmi': None, 'category': None})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': True, 'bmi': None, 'category': None})


@health_bp.route('/api/bmi', methods=['POST'])
def post_bmi():
    try:
        data = request.json
        if not data or 'height' not in data or 'weight' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = record_bmi(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Chatbot API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/chatbot', methods=['POST'])
def post_chatbot():
    try:
        data = request.json
        if not data or 'query' not in data or 'response' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = record_chatbot_interaction(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# User Profile API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/user-profile', methods=['GET'])
def get_profile():
    try:
        result = get_user_profile(_get_user_id())
        if result.get('success'):
            return jsonify(result['profile'])
        status = result.pop('status', 200)
        return jsonify(result), status
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/user-profile', methods=['PUT', 'POST'])
def put_profile():
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        result = update_user_profile(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Emergency Contacts API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/emergency-contacts', methods=['GET'])
def get_emergency_contacts():
    try:
        result = get_user_profile(_get_user_id())
        if result.get('success'):
            contacts = result['profile'].get('emergency_contacts', [])
            return jsonify({'contacts': contacts})
        return jsonify({'contacts': []})
    except Exception as e:
        traceback.print_exc()
        return jsonify({'contacts': []})





@health_bp.route('/api/emergency-contacts', methods=['POST'])
def post_emergency_contact():
    try:
        data = request.json
        if not data or 'name' not in data or 'phone' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = add_emergency_contact(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/emergency-contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    try:
        result = delete_emergency_contact(_get_user_id(), contact_id)
        status = result.pop('status', 200)
        return jsonify(result), status
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# Disease Predictions API
# ─────────────────────────────────────────────────────────────────────────────

@health_bp.route('/api/disease-predictions', methods=['GET'])
def get_disease_predictions_api():
    try:
        result = get_disease_predictions(_get_user_id())
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@health_bp.route('/api/disease-predictions', methods=['POST'])
def post_disease_prediction_api():
    try:
        data = request.json
        if not data or 'predicted_disease' not in data:
            return jsonify({'success': False, 'error': 'Missing prediction data'}), 400
        result = save_disease_prediction(_get_user_id(), data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
