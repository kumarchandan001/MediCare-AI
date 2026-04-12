"""
services/otp_service.py
────────────────────────
Core OTP business logic for MediCare AI.

Handles:
  - OTP generation (cryptographic)
  - OTP hashing (bcrypt)
  - OTP verification with attempt tracking
  - Rate limiting (per email)
  - Brute force protection
  - Password reset tokens
  - Account lockout management
  - Resend cooldown

Uses SQLAlchemy ORM for all DB operations — consistent with the rest
of the codebase (no raw psycopg2).
"""

import os
import secrets
import hashlib
import logging
from datetime import datetime, timedelta

import bcrypt

from models import db
from models.auth_otp import (
    OtpVerification, OtpRateLimit,
    PasswordResetToken, LoginAttempt,
)
from models.user import User

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

def _cfg(key: str, default):
    """Read an env var, casting to the same type as *default*."""
    val = os.getenv(key, str(default))
    try:
        return type(default)(val)
    except Exception:
        return default

OTP_EXPIRY_MINUTES     = _cfg("OTP_EXPIRY_MINUTES",   10)
OTP_MAX_ATTEMPTS       = _cfg("OTP_MAX_ATTEMPTS",      5)
OTP_RATE_LIMIT         = _cfg("OTP_RATE_LIMIT",        3)
OTP_RATE_WINDOW        = _cfg("OTP_RATE_WINDOW",      15)    # minutes
RESET_TOKEN_EXPIRY     = _cfg("RESET_TOKEN_EXPIRY",   30)    # minutes
BRUTE_FORCE_MAX        = _cfg("BRUTE_FORCE_MAX",       5)
BRUTE_FORCE_WINDOW     = _cfg("BRUTE_FORCE_WINDOW",   10)    # minutes
RESEND_COOLDOWN_SECONDS = 60


# ═══════════════════════════════════════════════════════════════════════════════
# OTP GENERATION & HASHING
# ═══════════════════════════════════════════════════════════════════════════════

def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP (100000-999999)."""
    return str(secrets.randbelow(900000) + 100000)


def hash_otp(otp: str) -> str:
    """Hash an OTP with bcrypt (auto-salted)."""
    return bcrypt.hashpw(otp.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_otp_hash(otp: str, otp_hash: str) -> bool:
    """Verify a plain-text OTP against its bcrypt hash."""
    try:
        return bcrypt.checkpw(otp.encode("utf-8"), otp_hash.encode("utf-8"))
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════════════

def check_rate_limit(email: str, purpose: str, ip_address: str = None):
    """
    Check if email has exceeded OTP send limit.

    Returns (is_allowed, sends_used, wait_minutes).
    """
    window_start = datetime.utcnow() - timedelta(minutes=OTP_RATE_WINDOW)

    count = OtpRateLimit.query.filter(
        OtpRateLimit.email == email,
        OtpRateLimit.purpose == purpose,
        OtpRateLimit.sent_at >= window_start,
    ).count()

    if count >= OTP_RATE_LIMIT:
        oldest = OtpRateLimit.query.filter(
            OtpRateLimit.email == email,
            OtpRateLimit.purpose == purpose,
            OtpRateLimit.sent_at >= window_start,
        ).order_by(OtpRateLimit.sent_at.asc()).first()

        if oldest:
            wait_until = oldest.sent_at + timedelta(minutes=OTP_RATE_WINDOW)
            wait_secs  = max(0, (wait_until - datetime.utcnow()).total_seconds())
            wait_mins  = max(1, int(wait_secs / 60))
        else:
            wait_mins = OTP_RATE_WINDOW

        return False, count, wait_mins

    return True, count, 0


def record_otp_send(email: str, purpose: str, ip_address: str = None):
    """Record an OTP send for rate limiting."""
    entry = OtpRateLimit(email=email, purpose=purpose, ip_address=ip_address)
    db.session.add(entry)
    db.session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# OTP STORE & VERIFY
# ═══════════════════════════════════════════════════════════════════════════════

def create_otp(email: str, purpose: str,
               ip_address: str = None, user_agent: str = None):
    """
    Generate, hash, and store a new OTP.
    Invalidates any existing unused OTPs for the same email+purpose.

    Returns (plain_otp, error_message).  plain_otp is None on error.
    """
    # Rate limit check
    allowed, used, wait = check_rate_limit(email, purpose, ip_address)
    if not allowed:
        return None, (
            f"Too many OTP requests. Please wait {wait} minute"
            f"{'s' if wait != 1 else ''} before requesting again."
        )

    otp       = generate_otp()
    otp_hashed = hash_otp(otp)
    expires   = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    try:
        # Invalidate existing OTPs for this email+purpose
        OtpVerification.query.filter(
            OtpVerification.email == email,
            OtpVerification.purpose == purpose,
            OtpVerification.is_used == False,
            OtpVerification.expires_at > datetime.utcnow(),
        ).update({"is_used": True, "used_at": datetime.utcnow()})

        # Insert new OTP
        record = OtpVerification(
            email=email, otp_hash=otp_hashed, purpose=purpose,
            ip_address=ip_address, user_agent=user_agent,
            expires_at=expires,
        )
        db.session.add(record)
        db.session.commit()

        # Record for rate limiting
        record_otp_send(email, purpose, ip_address)

        logger.info("OTP created for %s purpose=%s", email, purpose)
        return otp, None

    except Exception as e:
        db.session.rollback()
        logger.error("create_otp error: %s", e)
        return None, "Failed to create OTP. Please try again."


def verify_otp(email: str, otp_input: str, purpose: str):
    """
    Verify an OTP for a given email+purpose.

    Returns (success: bool, error_message: str | None).
    """
    try:
        # Get latest valid OTP
        row = OtpVerification.query.filter(
            OtpVerification.email == email,
            OtpVerification.purpose == purpose,
            OtpVerification.is_used == False,
        ).order_by(OtpVerification.created_at.desc()).first()

        if not row:
            return False, "No active OTP found. Please request a new one."

        # Check expiry
        if datetime.utcnow() > row.expires_at:
            row.is_used = True
            row.used_at = datetime.utcnow()
            db.session.commit()
            return False, "OTP has expired. Please request a new one."

        # Check attempt count
        if row.attempts >= OTP_MAX_ATTEMPTS:
            row.is_used = True
            row.used_at = datetime.utcnow()
            db.session.commit()
            return False, (
                f"Too many failed attempts ({OTP_MAX_ATTEMPTS} max). "
                f"Please request a new OTP."
            )

        # Verify hash
        if not verify_otp_hash(otp_input, row.otp_hash):
            row.attempts += 1
            remaining = OTP_MAX_ATTEMPTS - row.attempts
            if remaining <= 0:
                row.is_used = True
                row.used_at = datetime.utcnow()
                db.session.commit()
                return False, "Maximum attempts reached. Please request a new OTP."
            db.session.commit()
            return False, (
                f"Invalid OTP. {remaining} attempt"
                f"{'s' if remaining != 1 else ''} remaining."
            )

        # ✅ SUCCESS — mark as used
        row.is_used = True
        row.used_at = datetime.utcnow()
        db.session.commit()

        logger.info("OTP verified for %s purpose=%s", email, purpose)
        return True, None

    except Exception as e:
        db.session.rollback()
        logger.error("verify_otp error: %s", e)
        return False, "Verification failed. Please try again."


# ═══════════════════════════════════════════════════════════════════════════════
# BRUTE FORCE PROTECTION
# ═══════════════════════════════════════════════════════════════════════════════

def record_login_attempt(email: str, success: bool, ip_address: str = None):
    """Record a login attempt for brute-force tracking."""
    attempt = LoginAttempt(email=email, ip_address=ip_address, success=success)
    db.session.add(attempt)
    db.session.commit()


def check_brute_force(email: str):
    """
    Check if an account is brute-force locked.

    Returns (is_locked: bool, minutes_remaining: int).
    """
    # Check if account is manually locked
    user = User.query.filter_by(email=email).first()
    if user:
        if user.account_locked and user.locked_until:
            if datetime.utcnow() < user.locked_until:
                remaining = max(0, int(
                    (user.locked_until - datetime.utcnow()).total_seconds() / 60
                ))
                return True, max(1, remaining)
            else:
                # Lock expired — unlock
                user.account_locked = False
                user.locked_until = None
                user.failed_login_count = 0
                db.session.commit()

    # Count recent failures
    window_start = datetime.utcnow() - timedelta(minutes=BRUTE_FORCE_WINDOW)
    fail_count = LoginAttempt.query.filter(
        LoginAttempt.email == email,
        LoginAttempt.success == False,
        LoginAttempt.attempted_at >= window_start,
    ).count()

    if fail_count >= BRUTE_FORCE_MAX:
        lock_until = datetime.utcnow() + timedelta(minutes=BRUTE_FORCE_WINDOW)
        if user:
            user.account_locked = True
            user.locked_until = lock_until
            user.failed_login_count = fail_count
            db.session.commit()
        return True, BRUTE_FORCE_WINDOW

    return False, 0


def unlock_account(email: str):
    """Unlock account after successful authentication."""
    user = User.query.filter_by(email=email).first()
    if user:
        user.account_locked = False
        user.locked_until = None
        user.failed_login_count = 0
        db.session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# PASSWORD RESET TOKENS
# ═══════════════════════════════════════════════════════════════════════════════

def create_reset_token(user_id: int, email: str, ip_address: str = None):
    """
    Create a secure password reset token.

    Returns (plain_token, error_message).
    """
    try:
        plain_token = secrets.token_urlsafe(32)
        token_hash  = hashlib.sha256(plain_token.encode("utf-8")).hexdigest()
        expires_at  = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRY)

        # Invalidate existing tokens
        PasswordResetToken.query.filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.is_used == False,
        ).update({"is_used": True})

        token = PasswordResetToken(
            user_id=user_id, email=email, token_hash=token_hash,
            ip_address=ip_address, expires_at=expires_at,
        )
        db.session.add(token)
        db.session.commit()

        logger.info("Reset token created for user %d", user_id)
        return plain_token, None

    except Exception as e:
        db.session.rollback()
        logger.error("create_reset_token error: %s", e)
        return None, "Failed to create reset token."


def verify_reset_token(plain_token: str):
    """
    Verify a password reset token.

    Returns (token_dict, error_message).
    token_dict has id, user_id, email.
    """
    token_hash = hashlib.sha256(plain_token.encode("utf-8")).hexdigest()

    row = PasswordResetToken.query.filter_by(token_hash=token_hash).first()

    if not row:
        return None, "Invalid reset link."

    if row.is_used:
        return None, "This reset link has already been used."

    if datetime.utcnow() > row.expires_at:
        return None, "This reset link has expired. Please request a new one."

    return {"id": row.id, "user_id": row.user_id, "email": row.email}, None


def consume_reset_token(token_id: int):
    """Mark a reset token as used (single-use)."""
    token = db.session.get(PasswordResetToken, token_id)
    if token:
        token.is_used = True
        token.used_at = datetime.utcnow()
        db.session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# RESEND COOLDOWN
# ═══════════════════════════════════════════════════════════════════════════════

def get_resend_cooldown(email: str, purpose: str) -> int:
    """
    Seconds remaining before user can request another OTP.
    Returns 0 if they can resend immediately.
    """
    latest = OtpRateLimit.query.filter(
        OtpRateLimit.email == email,
        OtpRateLimit.purpose == purpose,
    ).order_by(OtpRateLimit.sent_at.desc()).first()

    if not latest:
        return 0

    elapsed   = (datetime.utcnow() - latest.sent_at).total_seconds()
    remaining = RESEND_COOLDOWN_SECONDS - elapsed
    return max(0, int(remaining))
