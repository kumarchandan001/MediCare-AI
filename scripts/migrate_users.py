"""
scripts/migrate_users.py
────────────────────────
One-time migration: mark all existing users as email_verified=True
so they can log in with the new OTP system without disruption.

Run once:
    python scripts/migrate_users.py

Safe to re-run — idempotent.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))


def migrate():
    from app import app
    from models import db
    from models.user import User

    with app.app_context():
        users = User.query.all()
        count = 0
        for user in users:
            changed = False

            # Auto-verify existing accounts
            if not user.email_verified:
                user.email_verified = True
                changed = True

            # Populate email if missing (required for OTP)
            if not user.email:
                user.email = f"{user.username}@legacy.medicare-ai.local"
                changed = True

            # Ensure account is unlocked
            if user.account_locked:
                user.account_locked = False
                user.locked_until = None
                changed = True

            # Reset failed counts
            if user.failed_login_count > 0:
                user.failed_login_count = 0
                changed = True

            if changed:
                count += 1

        db.session.commit()
        print(f"[MIGRATION] Updated {count}/{len(users)} users — email_verified=True")
        print("[MIGRATION] All existing users can now log in with the new OTP system.")


if __name__ == '__main__':
    migrate()
