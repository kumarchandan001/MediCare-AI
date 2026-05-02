"""
core/models.py
Centralized model registration for SQLAlchemy Base.metadata.create_all
Ensures all models are imported before DB initialization.
"""

# Auth Models
from features.auth.models import (
    User, OTPVerification, PasswordResetToken, LoginAttempt, RefreshToken,
    OAuthToken
)

# Health Models
from features.health.models import (
    HealthMonitoring, ActivityTracking, BMIHistory,
    MedicationReminder, Alert, DiseasePrediction, ChatMessage
)
from features.health.daily_health_model import DailyHealthRecord

# Emergency Models
from features.emergency.models import EmergencyContact

# Prediction Models
from features.prediction.models import PredictionRecord

# Google Fit Models
from features.google_fit.models import GoogleFitSync

# Make them available here
__all__ = [
    "User",
    "OTPVerification",
    "PasswordResetToken",
    "LoginAttempt",
    "RefreshToken",
    "OAuthToken",
    "HealthMonitoring",
    "ActivityTracking",
    "BMIHistory",
    "MedicationReminder",
    "Alert",
    "DiseasePrediction",
    "ChatMessage",
    "DailyHealthRecord",
    "EmergencyContact",
    "PredictionRecord",
    "GoogleFitSync",
]
