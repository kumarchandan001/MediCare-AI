"""Admin models — audit logging and app-wide settings."""

from sqlalchemy import (
    Column, Integer, String,
    Boolean, DateTime, Text,
    ForeignKey,
)
from sqlalchemy.sql import func
from core.database import Base


class AdminAuditLog(Base):
    """
    Tracks every admin action for security.
    Written on every admin state-changing operation.
    """
    __tablename__ = "admin_audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    admin_id    = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    admin_email = Column(String(255), nullable=False)
    action      = Column(String(100), nullable=False, index=True)
    target_type = Column(String(50), nullable=True)
    target_id   = Column(Integer, nullable=True)
    details     = Column(Text, nullable=True)
    ip_address  = Column(String(50), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class AppSettings(Base):
    """
    Key-value store for app-wide settings.
    Admin can change these without code deploy.
    """
    __tablename__ = "app_settings"

    id          = Column(Integer, primary_key=True, index=True)
    key         = Column(String(100), unique=True, nullable=False, index=True)
    value       = Column(Text, nullable=False)
    value_type  = Column(String(20), default="string")
    description = Column(String(255), nullable=True)
    is_public   = Column(Boolean, default=False)
    updated_by  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── Default settings to seed on startup ──
DEFAULT_SETTINGS = {
    "maintenance_mode": {
        "value":       "false",
        "type":        "boolean",
        "description": "Put app in maintenance mode",
        "is_public":   True,
    },
    "allow_new_registrations": {
        "value":       "true",
        "type":        "boolean",
        "description": "Allow new user signups",
        "is_public":   False,
    },
    "max_predictions_per_day": {
        "value":       "20",
        "type":        "integer",
        "description": "Max AI predictions per user per day",
        "is_public":   False,
    },
    "ai_assistant_enabled": {
        "value":       "true",
        "type":        "boolean",
        "description": "Enable/disable AI chat globally",
        "is_public":   True,
    },
    "who_adjustment_enabled": {
        "value":       "true",
        "type":        "boolean",
        "description": "Enable WHO country adjustment",
        "is_public":   False,
    },
    "app_announcement": {
        "value":       "",
        "type":        "string",
        "description": "Shown as banner to all users",
        "is_public":   True,
    },
}
