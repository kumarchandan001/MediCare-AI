import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update

from features.auth.models import (
    User,
    OTPVerification,
    PasswordResetToken,
    LoginAttempt,
    RefreshToken,
)
from features.auth.schemas import SignupRequest
from core.security import hash_password, verify_password
from core.config import settings

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────
OTP_EXPIRE_MINUTES = settings.OTP_EXPIRE_MINUTES
OTP_MAX_ATTEMPTS = settings.OTP_MAX_ATTEMPTS
OTP_RATE_LIMIT = settings.OTP_RATE_LIMIT
OTP_RATE_WINDOW = settings.OTP_RATE_WINDOW
BRUTE_FORCE_MAX = 5
BRUTE_FORCE_WINDOW = 10
RESEND_COOLDOWN_SECS = 60
RESET_TOKEN_EXPIRE = 30


# ═══════════════════════════════════════════
# OTP HELPERS
# ═══════════════════════════════════════════


def _generate_otp() -> str:
    """Cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def _hash_otp(otp: str) -> str:
    """Hash OTP with bcrypt."""
    return bcrypt.hashpw(
        otp.encode("utf-8"), bcrypt.gensalt(rounds=10)
    ).decode("utf-8")


def _verify_otp_hash(otp: str, hashed: str) -> bool:
    """Verify OTP against bcrypt hash."""
    try:
        return bcrypt.checkpw(otp.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _hash_token(token: str) -> str:
    """Hash reset token with SHA256."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ═══════════════════════════════════════════
# USER SERVICE
# ═══════════════════════════════════════════


async def get_user_by_email(
    db: AsyncSession, email: str
) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.email == email.lower().strip())
    )
    return result.scalar_one_or_none()


async def get_user_by_id(
    db: AsyncSession, user_id: int
) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: SignupRequest) -> User:
    user = User(
        username=data.username.lower(),
        email=data.email.lower().strip(),
        password_hash=hash_password(data.password),
        email_verified=False,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_password(
    db: AsyncSession, user_id: int, new_password: str
) -> None:
    await db.execute(
        update(User)
        .where(User.id == user_id)
        .values(password_hash=hash_password(new_password))
    )
    await db.commit()


async def verify_user_email(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(User).where(User.id == user_id).values(email_verified=True)
    )
    await db.commit()


async def unlock_user(db: AsyncSession, email: str) -> None:
    await db.execute(
        update(User)
        .where(User.email == email.lower())
        .values(
            account_locked=False,
            locked_until=None,
            failed_login_count=0,
        )
    )
    await db.commit()


# ═══════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════


async def check_rate_limit(
    db: AsyncSession, email: str, purpose: str
) -> Tuple[bool, int, int]:
    """Returns (is_allowed, sends_used, wait_mins)"""
    window_start = datetime.now(timezone.utc) - timedelta(
        minutes=OTP_RATE_WINDOW
    )
    result = await db.execute(
        select(func.count()).where(
            and_(
                OTPVerification.email == email.lower(),
                OTPVerification.purpose == purpose,
                OTPVerification.created_at >= window_start,
            )
        )
    )
    count = result.scalar() or 0
    if count >= OTP_RATE_LIMIT:
        return False, count, OTP_RATE_WINDOW
    return True, count, 0


async def get_resend_cooldown(
    db: AsyncSession, email: str, purpose: str
) -> int:
    """Returns seconds remaining before resend allowed."""
    result = await db.execute(
        select(OTPVerification.created_at)
        .where(
            and_(
                OTPVerification.email == email.lower(),
                OTPVerification.purpose == purpose,
            )
        )
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
    )
    last_sent = result.scalar_one_or_none()
    if not last_sent:
        return 0
    if last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
    remaining = RESEND_COOLDOWN_SECS - elapsed
    return max(0, int(remaining))


# ═══════════════════════════════════════════
# OTP CREATION & VERIFICATION
# ═══════════════════════════════════════════


async def create_otp(
    db: AsyncSession,
    email: str,
    purpose: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Generate, hash, and store OTP. Returns (plain_otp, error_message)"""
    allowed, used, wait = await check_rate_limit(db, email, purpose)
    if not allowed:
        return None, (
            f"Too many OTP requests. Wait {wait} minutes before retrying."
        )

    # Invalidate existing OTPs for same email+purpose
    await db.execute(
        update(OTPVerification)
        .where(
            and_(
                OTPVerification.email == email.lower(),
                OTPVerification.purpose == purpose,
                OTPVerification.is_used == False,
            )
        )
        .values(is_used=True, used_at=func.now())
    )

    otp = _generate_otp()
    otp_record = OTPVerification(
        email=email.lower().strip(),
        user_id=user_id,
        otp_hash=_hash_otp(otp),
        purpose=purpose,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=OTP_EXPIRE_MINUTES),
    )
    db.add(otp_record)
    await db.commit()

    logger.info(f"OTP created: email={email} purpose={purpose}")
    return otp, None


async def verify_otp(
    db: AsyncSession, email: str, otp_input: str, purpose: str
) -> Tuple[bool, Optional[str]]:
    """Verify OTP. Returns (success, error_msg)"""
    result = await db.execute(
        select(OTPVerification)
        .where(
            and_(
                OTPVerification.email == email.lower(),
                OTPVerification.purpose == purpose,
                OTPVerification.is_used == False,
            )
        )
        .order_by(OTPVerification.created_at.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()

    if not record:
        return False, "No active OTP found. Please request a new one."

    # Check expiry
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        record.is_used = True
        record.used_at = datetime.now(timezone.utc)
        await db.commit()
        return False, "OTP has expired. Please request a new one."

    # Check attempts
    if record.attempts >= OTP_MAX_ATTEMPTS:
        record.is_used = True
        record.used_at = datetime.now(timezone.utc)
        await db.commit()
        return False, "Too many failed attempts. Please request a new OTP."

    # Verify OTP value
    if not _verify_otp_hash(otp_input, record.otp_hash):
        record.attempts += 1
        await db.commit()
        remaining = OTP_MAX_ATTEMPTS - record.attempts
        if remaining <= 0:
            record.is_used = True
            record.used_at = datetime.now(timezone.utc)
            await db.commit()
            return False, "Maximum attempts reached. Request a new OTP."
        return False, (
            f"Invalid OTP. {remaining} attempt"
            f"{'s' if remaining != 1 else ''} remaining."
        )

    # SUCCESS
    record.is_used = True
    record.used_at = datetime.now(timezone.utc)
    await db.commit()
    return True, None


# ═══════════════════════════════════════════
# BRUTE FORCE PROTECTION
# ═══════════════════════════════════════════


async def record_login_attempt(
    db: AsyncSession,
    email: str,
    success: bool,
    ip_address: Optional[str] = None,
) -> None:
    db.add(
        LoginAttempt(
            email=email.lower(),
            success=success,
            ip_address=ip_address,
        )
    )
    await db.commit()


async def check_brute_force(
    db: AsyncSession, email: str
) -> Tuple[bool, int]:
    """Returns (is_locked, minutes_remaining)"""
    user_result = await db.execute(
        select(User.account_locked, User.locked_until).where(
            User.email == email.lower()
        )
    )
    user_row = user_result.first()

    if user_row and user_row.account_locked:
        locked_until = user_row.locked_until
        if locked_until:
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if now < locked_until:
                remaining = max(
                    1, int((locked_until - now).total_seconds() / 60)
                )
                return True, remaining
            else:
                await unlock_user(db, email)

    # Count recent failures
    window_start = datetime.now(timezone.utc) - timedelta(
        minutes=BRUTE_FORCE_WINDOW
    )
    result = await db.execute(
        select(func.count()).where(
            and_(
                LoginAttempt.email == email.lower(),
                LoginAttempt.success == False,
                LoginAttempt.attempted_at >= window_start,
            )
        )
    )
    fail_count = result.scalar() or 0

    if fail_count >= BRUTE_FORCE_MAX:
        lock_until = datetime.now(timezone.utc) + timedelta(
            minutes=BRUTE_FORCE_WINDOW
        )
        await db.execute(
            update(User)
            .where(User.email == email.lower())
            .values(
                account_locked=True,
                locked_until=lock_until,
                failed_login_count=fail_count,
            )
        )
        await db.commit()
        return True, BRUTE_FORCE_WINDOW

    return False, 0


# ═══════════════════════════════════════════
# REFRESH TOKENS
# ═══════════════════════════════════════════


async def store_refresh_token(
    db: AsyncSession,
    user_id: int,
    refresh_token: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    token_hash = _hash_token(refresh_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
        )
    )
    await db.commit()


async def validate_refresh_token(
    db: AsyncSession, refresh_token: str
) -> Optional[int]:
    """Returns user_id if valid, None if not."""
    token_hash = _hash_token(refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > func.now(),
            )
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return None
    return record.user_id


async def revoke_refresh_token(
    db: AsyncSession, refresh_token: str
) -> None:
    token_hash = _hash_token(refresh_token)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .values(is_revoked=True)
    )
    await db.commit()


# ═══════════════════════════════════════════
# PASSWORD RESET TOKENS
# ═══════════════════════════════════════════


async def create_reset_token(
    db: AsyncSession,
    user_id: int,
    email: str,
    ip_address: Optional[str] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """Returns (plain_token, error_msg)"""
    # Invalidate existing tokens
    await db.execute(
        update(PasswordResetToken)
        .where(
            and_(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.is_used == False,
            )
        )
        .values(is_used=True)
    )

    plain_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(plain_token)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=RESET_TOKEN_EXPIRE
    )

    db.add(
        PasswordResetToken(
            user_id=user_id,
            email=email.lower(),
            token_hash=token_hash,
            ip_address=ip_address,
            expires_at=expires_at,
        )
    )
    await db.commit()
    return plain_token, None


async def verify_reset_token(
    db: AsyncSession, plain_token: str
) -> Tuple[Optional[PasswordResetToken], Optional[str]]:
    token_hash = _hash_token(plain_token)
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        return None, "Invalid reset link."
    if record.is_used:
        return None, "This reset link has already been used."

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        return None, "Reset link has expired. Request a new one."

    return record, None
