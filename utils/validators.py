"""
utils/validators.py
───────────────────
Centralised data validation for all health assistant inputs.

Every validate_* function returns (is_valid: bool, errors: list[str]).
Routes call these BEFORE writing to the database.
"""

import re

# ── Constants ─────────────────────────────────────────────────────────────────
VALID_BLOOD_GROUPS = {'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'}
VALID_GENDERS      = {'Male', 'Female', 'Other', 'Prefer not to say'}
VALID_LIFESTYLES   = {'sedentary', 'lightly_active', 'moderate', 'active', 'very_active'}

EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')


# ═════════════════════════════════════════════════════════════════════════════
#  Auth validators
# ═════════════════════════════════════════════════════════════════════════════

def validate_signup(data: dict) -> tuple[bool, list]:
    """Validate signup form fields."""
    errors = []

    username = (data.get('username') or '').strip()
    email    = (data.get('email') or '').strip()
    password = data.get('password') or ''

    if not username:
        errors.append('Username is required')
    elif len(username) < 3:
        errors.append('Username must be at least 3 characters')
    elif len(username) > 80:
        errors.append('Username must be at most 80 characters')
    elif not re.match(r'^[a-zA-Z0-9_]+$', username):
        errors.append('Username can only contain letters, numbers, and underscores')

    if not email:
        errors.append('Email is required')
    elif not EMAIL_RE.match(email):
        errors.append('Please enter a valid email address')

    if not password:
        errors.append('Password is required')
    elif len(password) < 6:
        errors.append('Password must be at least 6 characters')
    elif len(password) > 128:
        errors.append('Password must be at most 128 characters')
    elif not re.search(r'[\d\W]', password):
        errors.append('Password must contain at least one number or special character')

    return (len(errors) == 0, errors)


def validate_login(data: dict) -> tuple[bool, list]:
    """Validate login form fields."""
    errors = []
    if not (data.get('username') or '').strip():
        errors.append('Username is required')
    if not data.get('password'):
        errors.append('Password is required')
    return (len(errors) == 0, errors)


# ═════════════════════════════════════════════════════════════════════════════
#  Onboarding / Health Profile validators
# ═════════════════════════════════════════════════════════════════════════════

def validate_health_profile(data: dict) -> tuple[bool, list]:
    """Validate health profile data from onboarding form."""
    errors = []

    # Age (optional but must be valid if provided)
    age = data.get('age')
    if age is not None and age != '':
        try:
            age_val = int(age)
            if age_val < 1 or age_val > 150:
                errors.append('Age must be between 1 and 150')
        except (ValueError, TypeError):
            errors.append('Age must be a valid number')

    # Gender
    gender = (data.get('gender') or '').strip()
    if gender and gender not in VALID_GENDERS:
        errors.append(f'Gender must be one of: {", ".join(sorted(VALID_GENDERS))}')

    # Height (cm)
    height = data.get('height')
    if height is not None and height != '':
        try:
            h = float(height)
            if h < 30 or h > 300:
                errors.append('Height must be between 30 and 300 cm')
        except (ValueError, TypeError):
            errors.append('Height must be a valid number')

    # Weight (kg)
    weight = data.get('weight')
    if weight is not None and weight != '':
        try:
            w = float(weight)
            if w < 5 or w > 500:
                errors.append('Weight must be between 5 and 500 kg')
        except (ValueError, TypeError):
            errors.append('Weight must be a valid number')

    # Blood group
    blood_group = (data.get('blood_group') or '').strip().upper()
    if blood_group and blood_group not in VALID_BLOOD_GROUPS:
        errors.append(f'Blood group must be one of: {", ".join(sorted(VALID_BLOOD_GROUPS))}')

    # Lifestyle
    lifestyle = (data.get('lifestyle') or '').strip().lower()
    if lifestyle and lifestyle not in VALID_LIFESTYLES:
        errors.append(f'Lifestyle must be one of: {", ".join(sorted(VALID_LIFESTYLES))}')

    # Conditions / allergies — text, max 500 chars
    for field in ('conditions', 'allergies'):
        val = data.get(field) or ''
        if len(val) > 500:
            errors.append(f'{field.title()} must be at most 500 characters')

    return (len(errors) == 0, errors)


def validate_emergency_contact(data: dict) -> tuple[bool, list]:
    """Validate a single emergency contact."""
    errors = []

    name = (data.get('name') or '').strip()
    if not name:
        errors.append('Contact name is required')
    elif len(name) > 120:
        errors.append('Contact name must be at most 120 characters')

    phone = (data.get('phone') or '').strip()
    if not phone:
        errors.append('Contact phone is required')
    elif not PHONE_RE.match(phone):
        errors.append('Please enter a valid phone number (7-20 digits)')

    relation = (data.get('relation') or data.get('relationship') or '').strip()
    if relation and len(relation) > 60:
        errors.append('Relationship must be at most 60 characters')

    return (len(errors) == 0, errors)


# ═════════════════════════════════════════════════════════════════════════════
#  Daily Health Log validators
# ═════════════════════════════════════════════════════════════════════════════

def validate_daily_health_log(data: dict) -> tuple[bool, list]:
    """Validate daily health log input."""
    errors = []

    # Sleep hours (0–24)
    sleep = data.get('sleep_hours')
    if sleep is not None and sleep != '':
        try:
            s = float(sleep)
            if s < 0 or s > 24:
                errors.append('Sleep hours must be between 0 and 24')
        except (ValueError, TypeError):
            errors.append('Sleep hours must be a valid number')

    # Steps (0–100,000)
    steps = data.get('steps')
    if steps is not None and steps != '':
        try:
            st = int(steps)
            if st < 0 or st > 100000:
                errors.append('Steps must be between 0 and 100,000')
        except (ValueError, TypeError):
            errors.append('Steps must be a valid number')

    # Water intake (ml, 0–10,000)
    water = data.get('water_intake') or data.get('water_ml')
    if water is not None and water != '':
        try:
            w = int(water)
            if w < 0 or w > 10000:
                errors.append('Water intake must be between 0 and 10,000 ml')
        except (ValueError, TypeError):
            errors.append('Water intake must be a valid number')

    # Heart rate (30–250 bpm)
    hr = data.get('heart_rate')
    if hr is not None and hr != '':
        try:
            h = int(hr)
            if h < 30 or h > 250:
                errors.append('Heart rate must be between 30 and 250 bpm')
        except (ValueError, TypeError):
            errors.append('Heart rate must be a valid number')

    # Blood pressure
    bp_sys = data.get('bp_systolic') or data.get('systolic')
    bp_dia = data.get('bp_diastolic') or data.get('diastolic')

    if bp_sys is not None and bp_sys != '':
        try:
            sys_val = int(bp_sys)
            if sys_val < 60 or sys_val > 250:
                errors.append('Systolic BP must be between 60 and 250 mmHg')
        except (ValueError, TypeError):
            errors.append('Systolic BP must be a valid number')

    if bp_dia is not None and bp_dia != '':
        try:
            dia_val = int(bp_dia)
            if dia_val < 40 or dia_val > 150:
                errors.append('Diastolic BP must be between 40 and 150 mmHg')
        except (ValueError, TypeError):
            errors.append('Diastolic BP must be a valid number')

    return (len(errors) == 0, errors)


# ═════════════════════════════════════════════════════════════════════════════
#  Health Monitoring (vital signs) validators
# ═════════════════════════════════════════════════════════════════════════════

def validate_health_monitoring(data: dict) -> tuple[bool, list]:
    """Validate vital signs snapshot input."""
    errors = []

    # Heart rate
    hr = data.get('heart_rate')
    if hr is not None and hr != '':
        try:
            h = int(hr)
            if h < 30 or h > 250:
                errors.append('Heart rate must be between 30 and 250 bpm')
        except (ValueError, TypeError):
            errors.append('Heart rate must be a valid number')

    # Oxygen level (SpO2 %)
    o2 = data.get('oxygen_level')
    if o2 is not None and o2 != '':
        try:
            oval = int(o2)
            if oval < 50 or oval > 100:
                errors.append('Oxygen level must be between 50 and 100%')
        except (ValueError, TypeError):
            errors.append('Oxygen level must be a valid number')

    # Body temperature (°F: 90-110; °C: 32-43)
    temp = data.get('body_temperature')
    if temp is not None and temp != '':
        try:
            t = float(temp)
            if t < 30 or t > 115:
                errors.append('Body temperature must be between 30 and 115')
        except (ValueError, TypeError):
            errors.append('Body temperature must be a valid number')

    # Stress level (1-10)
    stress = data.get('stress_level')
    if stress is not None and stress != '':
        try:
            sv = int(stress)
            if sv < 1 or sv > 10:
                errors.append('Stress level must be between 1 and 10')
        except (ValueError, TypeError):
            errors.append('Stress level must be a valid number')

    # Glucose (mg/dL: 20-600)
    glucose = data.get('glucose_level')
    if glucose is not None and glucose != '':
        try:
            g = float(glucose)
            if g < 20 or g > 600:
                errors.append('Glucose level must be between 20 and 600 mg/dL')
        except (ValueError, TypeError):
            errors.append('Glucose level must be a valid number')

    return (len(errors) == 0, errors)


# ═════════════════════════════════════════════════════════════════════════════
#  Sanitiser helpers
# ═════════════════════════════════════════════════════════════════════════════

def sanitise_string(val, max_len: int = 200) -> str:
    """Strip whitespace and truncate to max_len."""
    if not val:
        return ''
    return str(val).strip()[:max_len]


def safe_int(val, default=None):
    """Convert to int safely."""
    if val is None or val == '':
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def safe_float(val, default=None):
    """Convert to float safely."""
    if val is None or val == '':
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default
