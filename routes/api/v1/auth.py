"""
routes/api/v1/auth.py
─────────────────────
V1 API endpoints for session introspection.

Provides lightweight auth-related endpoints for API consumers.
Login/signup remain on the existing HTML-based auth blueprint.
"""

import traceback
from flask import session

from routes.api.v1 import api_v1
from utils.api_response import success, unauthorized, server_error


# ═════════════════════════════════════════════════════════════════════════════
#  Session Info
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/auth/me', methods=['GET'])
def v1_auth_me():
    """Return the current session user's info, or 401 if not authenticated."""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return unauthorized("Not authenticated")

        from models.user import User
        from models import db
        user = db.session.get(User, user_id)

        if not user:
            session.clear()
            return unauthorized("Session expired")

        return success({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_admin': user.is_admin,
            'profile_completed': user.profile_completed,
        })
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to check session", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Logout
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/auth/logout', methods=['POST'])
def v1_auth_logout():
    """Clear the session and log out."""
    session.clear()
    return success({'logged_out': True}, message="Logged out successfully")
