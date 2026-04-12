"""
routes/api/v1/user.py
─────────────────────
V1 API endpoints for user profile and emergency contacts.

Delegates to: services/user_service.py
"""

import traceback
from flask import request, session

from routes.api.v1 import api_v1
from utils.api_response import success, created, error, validation_error, server_error
from utils.api_validators import require_json
from utils.auth import login_required


def _uid():
    return session['user_id']


# ═════════════════════════════════════════════════════════════════════════════
#  User Profile
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/user/profile', methods=['GET'])
@login_required
def v1_get_profile():
    """Return the current user's profile."""
    try:
        from services.user_service import get_user_profile
        result = get_user_profile(_uid())

        if result.get('success'):
            return success(result['profile'])

        status = result.pop('status', 404)
        return error(result.get('error', 'Profile not found'), code=status)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load profile", exc=e)


@api_v1.route('/user/profile', methods=['PUT'])
@login_required
def v1_update_profile():
    """Update the current user's profile."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data:
            return error("No data provided")

        from services.user_service import update_user_profile
        result = update_user_profile(_uid(), data)

        if result.get('success'):
            return success(result, message="Profile updated successfully")
        return validation_error(result.get('error', 'Update failed'))
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to update profile", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Emergency Contacts
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/user/contacts', methods=['GET'])
@login_required
def v1_get_contacts():
    """Return emergency contacts for the current user."""
    try:
        from services.user_service import get_user_profile
        result = get_user_profile(_uid())

        if result.get('success'):
            contacts = result['profile'].get('emergency_contacts', [])
            return success({'contacts': contacts, 'count': len(contacts)})
        return success({'contacts': [], 'count': 0})
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load contacts", exc=e)


@api_v1.route('/user/contacts', methods=['POST'])
@login_required
def v1_post_contact():
    """Add a new emergency contact."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data or 'name' not in data or 'phone' not in data:
            return validation_error("Missing required fields: name, phone")

        from services.user_service import add_emergency_contact
        result = add_emergency_contact(_uid(), data)

        if result.get('success'):
            return created(result, message="Emergency contact added")
        return validation_error(result.get('error', 'Failed to add contact'))
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to add contact", exc=e)


@api_v1.route('/user/contacts/<int:contact_id>', methods=['DELETE'])
@login_required
def v1_delete_contact(contact_id):
    """Delete an emergency contact."""
    try:
        from services.user_service import delete_emergency_contact
        result = delete_emergency_contact(_uid(), contact_id)
        status = result.pop('status', 200)

        if status == 404:
            return error("Contact not found", code=404, error_type="NOT_FOUND")

        return success(result, message="Contact deleted")
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to delete contact", exc=e)
