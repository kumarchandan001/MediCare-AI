"""
utils/auth.py
─────────────
Authentication decorators for protecting routes.

Decorators:
  @login_required       — requires session['user_id'] (for APIs + pages)
  @onboarding_required  — login + profile_completed check (for page routes)
"""

from functools import wraps
from flask import session, redirect, url_for, jsonify, request


def login_required(f):
    """Decorator to require user_id in session."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'success': False, 'error': 'Unauthorized', 'status': 401}), 401
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


def onboarding_required(f):
    """
    Decorator for page routes that require both login AND completed onboarding.
    - Not logged in → redirect to /login
    - Logged in but profile_completed=False → redirect to /onboarding
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))

        from models.user import User
        from models import db
        user = db.session.get(User, session['user_id'])
        if not user:
            session.clear()
            return redirect(url_for('auth.login'))

        if not user.profile_completed:
            return redirect(url_for('onboarding.onboarding_page'))

        return f(*args, **kwargs)
    return decorated_function


def admin_required(f):
    """
    Decorator for API or page routes that require admin privileges.
    - Not logged in -> 401 or redirect
    - Logged in but not admin -> 403 or redirect
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'success': False, 'error': 'Unauthorized', 'status': 401}), 401
            return redirect(url_for('auth.login'))

        from models.user import User
        from models import db
        user = db.session.get(User, session['user_id'])
        
        if not user or not user.is_admin:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'success': False, 'error': 'Forbidden: Admin access required', 'status': 403}), 403
            # Or render a 403 template if it's a page route
            return redirect(url_for('home'))

        return f(*args, **kwargs)
    return decorated_function
