"""
routes/onboarding.py
────────────────────
User onboarding flow — 5-step wizard that collects baseline health data
after first signup.

Routes:
  GET  /onboarding  → render 5-step onboarding form
  POST /onboarding  → save profile + contacts, mark complete, redirect
"""

from flask import (
    Blueprint, render_template, request,
    session, redirect, url_for, jsonify,
)
from services.user_service import (
    save_health_profile, save_emergency_contacts,
    complete_onboarding, check_profile_completed,
)

onboarding_bp = Blueprint('onboarding', __name__)


def _require_login():
    """Return user_id from session, or None if not logged in."""
    return session.get('user_id')


@onboarding_bp.route('/onboarding', methods=['GET'])
def onboarding_page():
    user_id = _require_login()
    if not user_id:
        return redirect(url_for('auth.login'))

    # Already completed? Go to dashboard
    if check_profile_completed(user_id):
        return redirect(url_for('home'))

    username = session.get('username', 'there')
    return render_template('onboarding.html', username=username)


@onboarding_bp.route('/onboarding', methods=['POST'])
def onboarding_submit():
    user_id = _require_login()
    if not user_id:
        return jsonify({'success': False, 'error': 'Not logged in'}), 401

    data = request.json or request.form.to_dict()

    if data.get('full_name'):
        from models.user import User
        from models import db
        user = db.session.get(User, user_id)
        if user:
            name_parts = data['full_name'].strip().split(' ', 1)
            user.first_name = name_parts[0]
            if len(name_parts) > 1:
                user.last_name = name_parts[1]
            db.session.commit()

    # ── 1. Save Health Profile ────────────────────────────────────────────
    profile_data = {
        'age':          data.get('age'),
        'gender':       data.get('gender'),
        'height':       data.get('height'),
        'weight':       data.get('weight'),
        'blood_group':  data.get('blood_group'),
        'conditions':   data.get('conditions'),
        'allergies':    data.get('allergies'),
        'medications':  data.get('medications'),
        'lifestyle':    data.get('lifestyle'),
        'sleep_hours':  data.get('sleep_hours'),
        'water_intake': data.get('water_intake'),
    }

    result = save_health_profile(user_id, profile_data)
    if not result['success']:
        return jsonify(result), 400

    # ── 2. Save Emergency Contacts ────────────────────────────────────────
    contacts = []

    # Support both array format and numbered fields
    if 'contacts' in data and isinstance(data['contacts'], list):
        contacts = data['contacts']
    else:
        # Extract from flat form: ec_name_1, ec_phone_1, ec_relation_1 ...
        for i in range(1, 4):  # up to 3 contacts
            name  = data.get(f'ec_name_{i}', '').strip()
            phone = data.get(f'ec_phone_{i}', '').strip()
            rel   = data.get(f'ec_relation_{i}', '').strip()
            if name or phone:
                contacts.append({
                    'name': name,
                    'phone': phone,
                    'relation': rel,
                })

    if contacts:
        contact_result = save_emergency_contacts(user_id, contacts)
        if not contact_result['success']:
            return jsonify(contact_result), 400

    # ── 3. Initialize baseline health log for today ───────────────────────
    try:
        from models.health_record import DailyHealthLog
        import datetime
        from utils.validators import safe_float
        
        today = datetime.date.today()
        log = DailyHealthLog.query.filter_by(user_id=user_id, log_date=today).first()
        if not log:
            log = DailyHealthLog(user_id=user_id, log_date=today)
            db.session.add(log)
            
        if data.get('sleep_hours'):
            log.sleep_hours = safe_float(data.get('sleep_hours'))
        if data.get('water_intake'):
            log.water_ml = int(safe_float(data.get('water_intake')) * 1000)
            
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error saving baseline log: {e}")

    # ── 3. Mark onboarding complete ───────────────────────────────────────
    complete_onboarding(user_id)

    # Return based on request type
    if request.is_json:
        return jsonify({'success': True, 'redirect': '/dashboard'})
    else:
        return redirect(url_for('home'))
