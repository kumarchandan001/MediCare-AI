"""
scripts/cleanup_otp.py
──────────────────────
Cron-compatible cleanup script for OTP authentication tables.

Run hourly to purge expired tokens and old records:
    python scripts/cleanup_otp.py

Or via cron:
    0 * * * * cd /app && python scripts/cleanup_otp.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))


def cleanup():
    """Purge expired OTPs, rate limits, used reset tokens, and old login attempts."""

    from app import app
    from models import db
    from models.auth_otp import (
        OtpVerification, OtpRateLimit,
        PasswordResetToken, LoginAttempt,
    )

    with app.app_context():
        now = datetime.utcnow()
        cutoff_24h = now - timedelta(hours=24)
        cutoff_30d = now - timedelta(days=30)

        # 1. Delete expired / used OTPs older than 24h
        deleted_otps = OtpVerification.query.filter(
            OtpVerification.created_at < cutoff_24h,
        ).delete()

        # 2. Delete old rate-limit records (>24h)
        deleted_rates = OtpRateLimit.query.filter(
            OtpRateLimit.sent_at < cutoff_24h,
        ).delete()

        # 3. Delete used / expired reset tokens (>24h)
        deleted_tokens = PasswordResetToken.query.filter(
            PasswordResetToken.created_at < cutoff_24h,
        ).delete()

        # 4. Delete old login attempts (>30 days)
        deleted_attempts = LoginAttempt.query.filter(
            LoginAttempt.attempted_at < cutoff_30d,
        ).delete()

        db.session.commit()

        print(
            f"[OTP Cleanup] {now.isoformat()}\n"
            f"  OTPs removed:     {deleted_otps}\n"
            f"  Rate records:     {deleted_rates}\n"
            f"  Reset tokens:     {deleted_tokens}\n"
            f"  Login attempts:   {deleted_attempts}"
        )


if __name__ == '__main__':
    cleanup()
