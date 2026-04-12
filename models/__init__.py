"""
models/__init__.py
──────────────────
SQLAlchemy db instance + model imports.

Usage in app.py:
    from models import db
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///...'
    db.init_app(app)
    with app.app_context():
        db.create_all()
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# ── Import all models so db.create_all() discovers them ──────────────────────
from models.user import User, EmergencyContact, GoogleFitToken  # noqa: E402, F401
from models.health_profile import HealthProfile                  # noqa: E402, F401
from models.health_record import (                               # noqa: E402, F401
    HealthMonitoring, DailyHealthLog, BmiRecord,
    ActivityRecord, HealthGoal, HealthMetric,
)
from models.medication import (                                  # noqa: E402, F401
    MedicationReminder, MedicationHistory, MedicalRecord,
)

# Alert and chat models may use raw SQL table references -- import if they
# define db.Model subclasses.  Safe to skip if they don't.
try:
    from models.alert import Alert                               # noqa: E402, F401
except (ImportError, Exception):
    pass

try:
    from models.chat_history import ChatMessage, RiskPrediction  # noqa: E402, F401
except (ImportError, Exception):
    pass

# OTP authentication models
from models.auth_otp import (                                    # noqa: E402, F401
    OtpVerification, OtpRateLimit,
    PasswordResetToken, LoginAttempt,
)
