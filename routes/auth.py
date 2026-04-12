"""
routes/auth.py
──────────────
Authentication routes (login, signup, logout).
After login/signup, checks profile_completed → redirects to /onboarding if needed.
"""

from flask import Blueprint, render_template, request, session, redirect, url_for, jsonify
from services.user_service import validate_login, register_user, check_profile_completed
from utils.rate_limiter import check_rate_limit, record_failed_attempt, clear_attempts
from utils.validators import validate_signup

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET'])
def login():
    if session.get('user_id'):
        return redirect(url_for('home'))
    return render_template('login.html')


@auth_bp.route('/login', methods=['POST'])
def login_post():
    ip_addr = request.remote_addr or 'unknown'
    is_allowed, retry_after = check_rate_limit(ip_addr)
    
    if not is_allowed:
        return jsonify({'success': False, 'error': f'Too many login attempts. Please try again in {retry_after // 60} minutes.'}), 429

    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'success': False, 'error': 'Please fill in all fields'}), 400

    result = validate_login(username, password)
    if result['success']:
        clear_attempts(ip_addr)
        session['user_id'] = result['user_id']
        session['username'] = result['username']
        session['language'] = result.get('language', 'en')
        session.permanent = True

        # Check if onboarding is needed
        redirect_url = '/dashboard'
        if result.get('is_admin'):
            redirect_url = '/admin/dashboard'
        elif not result.get('profile_completed', True):
            redirect_url = '/onboarding'

        return jsonify({'success': True, 'redirect': redirect_url})
    else:
        record_failed_attempt(ip_addr)
        return jsonify({'success': False, 'error': result.get('error', 'Invalid credentials')}), 401


@auth_bp.route('/signup', methods=['GET'])
def signup():
    if session.get('user_id'):
        return redirect(url_for('home'))
    return render_template('signup.html')


@auth_bp.route('/signup', methods=['POST'])
def signup_post():
    data = request.json or {}
    username   = data.get('username', '').strip()
    email      = data.get('email', '').strip()
    password   = data.get('password', '')
    first_name = data.get('first_name', '').strip()
    last_name  = data.get('last_name', '').strip()

    # Validation using centralized validator
    is_valid, errors = validate_signup(data)
    if not is_valid:
        return jsonify({'success': False, 'error': errors[0]}), 400

    result = register_user(
        username=username, email=email, password=password,
        first_name=first_name, last_name=last_name
    )

    if result['success']:
        # Auto-login after signup
        session['user_id'] = result['user_id']
        session['username'] = username
        session.permanent = True
        # Redirect to onboarding
        return jsonify({'success': True, 'redirect': '/onboarding'})
    else:
        return jsonify({'success': False, 'error': result.get('error', 'Registration failed')}), 400


@auth_bp.route('/api/update_language', methods=['POST'])
def update_language():
    data = request.json or {}
    lang = data.get('lang')
    if lang not in ['en', 'ta', 'hi']:
        return jsonify({'success': False, 'error': 'Invalid language'}), 400
        
    user_id = session.get('user_id')
    if user_id:
        from models.user import User
        from models import db
        user = User.query.get(user_id)
        if user:
            user.language = lang
            db.session.commit()
            
    session['language'] = lang
    return jsonify({'success': True})


@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('landing'))
