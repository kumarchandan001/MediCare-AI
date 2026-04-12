"""
models/auth_otp.py
──────────────────
OTP authentication models for MediCare AI.

Tables:
  otp_verifications     — Stores bcrypt-hashed OTPs (signup, login, reset)
  otp_rate_limits       — Tracks OTP send frequency per email
  password_reset_tokens — SHA256-hashed reset tokens
  login_attempts        — Tracks login attempts for brute-force detection

All models follow the existing SQLAlchemy ORM pattern used throughout
the MediCare AI codebase.
"""

from datetime import datetime
from models import db


class OtpVerification(db.Model):
    """
    Stores hashed OTPs for email verification.

    purpose values: 'signup' | 'login' | 'reset_password'
    """
    __tablename__ = 'otp_verifications'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email      = db.Column(db.String(255), nullable=False, index=True)
    otp_hash   = db.Column(db.String(255), nullable=False)
    purpose    = db.Column(db.String(30),  nullable=False)
    attempts   = db.Column(db.Integer, default=0, nullable=False)
    is_used    = db.Column(db.Boolean, default=False, nullable=False)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at    = db.Column(db.DateTime)

    __table_args__ = (
        db.Index('idx_otp_email_purpose', 'email', 'purpose'),
        db.Index('idx_otp_expires', 'expires_at'),
    )

    def __repr__(self):
        return f'<OTP {self.email} purpose={self.purpose} used={self.is_used}>'


class OtpRateLimit(db.Model):
    """Tracks OTP send frequency per email for rate limiting."""
    __tablename__ = 'otp_rate_limits'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email      = db.Column(db.String(255), nullable=False)
    purpose    = db.Column(db.String(30),  nullable=False)
    sent_at    = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ip_address = db.Column(db.String(50))

    __table_args__ = (
        db.Index('idx_rate_email', 'email', 'sent_at'),
    )

    def __repr__(self):
        return f'<OtpRateLimit {self.email} at {self.sent_at}>'


class PasswordResetToken(db.Model):
    """
    Secure password reset tokens.

    The raw token is sent to the user; we store only the SHA256 hash
    so a DB leak never exposes usable tokens.
    """
    __tablename__ = 'password_reset_tokens'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id    = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False, index=True
    )
    email      = db.Column(db.String(255), nullable=False)
    token_hash = db.Column(db.String(255), nullable=False, unique=True)
    is_used    = db.Column(db.Boolean, default=False, nullable=False)
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at    = db.Column(db.DateTime)

    user = db.relationship('User', backref=db.backref(
        'reset_tokens', lazy='dynamic', cascade='all, delete-orphan'
    ))

    __table_args__ = (
        db.Index('idx_reset_token', 'token_hash'),
        db.Index('idx_reset_expires', 'expires_at'),
    )

    def __repr__(self):
        return f'<ResetToken user_id={self.user_id} used={self.is_used}>'


class LoginAttempt(db.Model):
    """Tracks login attempts for brute-force detection."""
    __tablename__ = 'login_attempts'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email        = db.Column(db.String(255), nullable=False)
    ip_address   = db.Column(db.String(50))
    success      = db.Column(db.Boolean, default=False, nullable=False)
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.Index('idx_attempts_email', 'email', 'attempted_at'),
    )

    def __repr__(self):
        return f'<LoginAttempt {self.email} success={self.success}>'
