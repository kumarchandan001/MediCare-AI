"""
services/user_service.py
────────────────────────
User-domain business logic using SQLAlchemy ORM.

All database interactions use the ORM models — no raw SQL.
Routes call these functions. No Flask-specific code here
(except db.session which Flask-SQLAlchemy manages).
"""

import hashlib
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from models import db
from models.user import User, EmergencyContact
from models.health_profile import HealthProfile
from utils.validators import (
    validate_signup, validate_health_profile,
    validate_emergency_contact, sanitise_string, safe_int, safe_float,
)


# ─────────────────────────────────────────────────────────────────────────────
# Password hashing
# ─────────────────────────────────────────────────────────────────────────────

def legacy_hash_password(password: str) -> str:
    """Legacy SHA-256 hash (used for migrating old users)."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def _hash_password(password: str) -> str:
    """Secure password hash using Werkzeug's default (pbkdf2:sha256)."""
    return generate_password_hash(password)


# ─────────────────────────────────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────────────────────────────────

def validate_login(username: str, password: str) -> dict:
    """
    Authenticate user by username + password.
    Returns {'success': True, 'user_id', 'username', 'profile_completed'}
            or {'success': False, 'error': str}
    """
    user = User.query.filter_by(username=username).first()
    if not user:
        return {'success': False, 'error': 'Invalid username or password'}

    # Password Verification with Migration Strategy
    password_matched = False
    needs_rehash = False

    if user.password_hash:
        if check_password_hash(user.password_hash, password):
            # Normal secure match
            password_matched = True
        elif user.password_hash == legacy_hash_password(password):
            # Legacy SHA-256 match -> Migration time!
            password_matched = True
            needs_rehash = True
    else:
        # No password set (demo user fallback - match anything to allow login)
        password_matched = True

    if not password_matched:
        return {'success': False, 'error': 'Invalid username or password'}

    # Transparently upgrade legacy passwords to secure hashing
    if needs_rehash:
        user.password_hash = _hash_password(password)

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    return {
        'success': True,
        'user_id': user.id,
        'username': user.username,
        'profile_completed': user.profile_completed,
        'is_admin': user.is_admin,
        'language': user.language,
    }


def register_user(username: str, email: str, password: str,
                   first_name: str = '', last_name: str = '') -> dict:
    """
    Create a new user account.
    Returns {'success': True, 'user_id'}
            or {'success': False, 'error': str}
    """
    # Check uniqueness
    existing = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing:
        return {'success': False, 'error': 'Username or email already exists'}

    user = User(
        username=sanitise_string(username, 80),
        email=sanitise_string(email, 120),
        password_hash=_hash_password(password),
        first_name=sanitise_string(first_name, 60),
        last_name=sanitise_string(last_name, 60),
        profile_completed=False,
    )
    db.session.add(user)
    db.session.commit()

    return {'success': True, 'user_id': user.id}


def get_or_create_demo_user() -> int:
    """Return demo user (id=1). Creates if missing."""
    user = db.session.get(User, 1)
    if not user:
        user = User(
            id=1,
            username='demo_user',
            email='demo@medicare.ai',
            password_hash=_hash_password('demo123'),
            first_name='Demo',
            last_name='User',
            profile_completed=True,
        )
        db.session.add(user)
        db.session.commit()
    return user.id


def check_profile_completed(user_id: int) -> bool:
    """Check if user has completed onboarding."""
    user = db.session.get(User, user_id)
    if not user:
        return False
    return user.profile_completed


# ─────────────────────────────────────────────────────────────────────────────
# Onboarding
# ─────────────────────────────────────────────────────────────────────────────

def save_health_profile(user_id: int, data: dict) -> dict:
    """
    Save or update health profile during onboarding.
    Uses validation from utils/validators.py.
    Returns {'success': True} or {'success': False, 'errors': list}
    """
    is_valid, errors = validate_health_profile(data)
    if not is_valid:
        return {'success': False, 'errors': errors}

    user = db.session.get(User, user_id)
    if not user:
        return {'success': False, 'errors': ['User not found']}

    # Upsert health profile
    profile = HealthProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = HealthProfile(user_id=user_id)
        db.session.add(profile)

    profile.age         = safe_int(data.get('age'))
    profile.gender      = sanitise_string(data.get('gender'), 20)
    profile.height      = safe_float(data.get('height'))
    profile.weight      = safe_float(data.get('weight'))
    profile.blood_group = sanitise_string(data.get('blood_group'), 5).upper() or None
    profile.conditions  = sanitise_string(data.get('conditions'), 500)
    profile.allergies   = sanitise_string(data.get('allergies'), 500)
    profile.lifestyle   = sanitise_string(data.get('lifestyle'), 20).lower() or None

    # Also update user baseline measurements for compatibility
    if profile.height:
        user.height = profile.height
    if profile.weight:
        user.weight = profile.weight
    if profile.gender:
        user.gender = profile.gender

    db.session.commit()
    return {'success': True}


def save_emergency_contacts(user_id: int, contacts: list) -> dict:
    """
    Save emergency contacts during onboarding.
    Accepts a list of contact dicts.
    Returns {'success': True, 'saved': int} or {'success': False, 'errors': list}
    """
    all_errors = []
    saved_count = 0

    for i, contact_data in enumerate(contacts):
        # Skip empty contacts
        name = (contact_data.get('name') or '').strip()
        phone = (contact_data.get('phone') or '').strip()
        if not name and not phone:
            continue

        is_valid, errors = validate_emergency_contact(contact_data)
        if not is_valid:
            all_errors.extend([f'Contact {i+1}: {e}' for e in errors])
            continue

        contact = EmergencyContact(
            user_id=user_id,
            name=sanitise_string(contact_data.get('name'), 120),
            relationship=sanitise_string(
                contact_data.get('relation') or contact_data.get('relationship'), 60
            ),
            phone=sanitise_string(contact_data.get('phone'), 30),
            email=sanitise_string(contact_data.get('email'), 120),
            is_primary=(i == 0),
        )
        db.session.add(contact)
        saved_count += 1

    if all_errors:
        db.session.rollback()
        return {'success': False, 'errors': all_errors}

    db.session.commit()
    return {'success': True, 'saved': saved_count}


def complete_onboarding(user_id: int) -> dict:
    """Mark user's onboarding as complete."""
    user = db.session.get(User, user_id)
    if not user:
        return {'success': False, 'error': 'User not found'}

    user.profile_completed = True
    db.session.commit()
    return {'success': True}


# ─────────────────────────────────────────────────────────────────────────────
# User profile (read / update)
# ─────────────────────────────────────────────────────────────────────────────

def get_user_profile(user_id: int) -> dict:
    """Fetch full user profile including health profile and emergency contacts."""
    user = db.session.get(User, user_id)
    if not user:
        return {'success': False, 'error': 'User not found', 'status': 404}

    profile_data = user.to_dict(include_contacts=True)

    # Add health profile
    hp = user.health_profile
    profile_data['health_profile'] = hp.to_dict() if hp else None
    profile_data['profile_completed'] = user.profile_completed

    return {'success': True, 'profile': profile_data}


def update_user_profile(user_id: int, data: dict) -> dict:
    """Update allowed user profile fields via ORM."""
    user = db.session.get(User, user_id)
    if not user:
        return {'success': False, 'error': 'User not found'}

    import json
    allowed = {
        'first_name', 'last_name', 'date_of_birth', 'gender',
        'height', 'weight', 'blood_type', 'emergency_contact',
        'emergency_phone', 'medical_conditions', 'allergies',
    }

    updated = False
    for field in allowed:
        if field in data:
            value = data[field]
            if field in ('medical_conditions', 'allergies') and isinstance(value, list):
                value = json.dumps(value)
            setattr(user, field, value)
            updated = True

    if not updated:
        return {'success': False, 'error': 'No valid fields to update'}

    db.session.commit()
    return {'success': True}


# ─────────────────────────────────────────────────────────────────────────────
# Emergency contacts (CRUD)
# ─────────────────────────────────────────────────────────────────────────────

def add_emergency_contact(user_id: int, data: dict) -> dict:
    """Add an emergency contact for a user."""
    is_valid, errors = validate_emergency_contact(data)
    if not is_valid:
        return {'success': False, 'errors': errors}

    if data.get('is_primary'):
        EmergencyContact.query.filter_by(
            user_id=user_id, is_primary=True
        ).update({'is_primary': False})

    contact = EmergencyContact(
        user_id=user_id,
        name=sanitise_string(data['name'], 120),
        relationship=sanitise_string(data.get('relationship'), 60),
        phone=sanitise_string(data['phone'], 30),
        email=sanitise_string(data.get('email'), 120),
        address=sanitise_string(data.get('address'), 500),
        is_primary=bool(data.get('is_primary')),
    )
    db.session.add(contact)
    db.session.commit()
    return {'success': True, 'contact_id': contact.id}


def delete_emergency_contact(user_id: int, contact_id: int) -> dict:
    """Delete an emergency contact, verifying ownership."""
    contact = EmergencyContact.query.filter_by(
        id=contact_id, user_id=user_id
    ).first()
    if not contact:
        return {'success': False, 'error': 'Contact not found', 'status': 404}

    db.session.delete(contact)
    db.session.commit()
    return {'success': True}


def get_or_create_demo_user() -> int:
    """
    Return the ID of the demo/guest user.
    Creates it on first call.
    """
    from werkzeug.security import generate_password_hash

    demo = User.query.filter_by(username='demo_user').first()
    if demo:
        return demo.id

    demo = User(
        username='demo_user',
        email='demo@medicare-ai.local',
        password_hash=generate_password_hash('DemoPass!2024'),
        email_verified=True,
        profile_completed=False,
    )
    db.session.add(demo)
    db.session.commit()
    return demo.id

