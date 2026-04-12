"""
scripts/create_admin.py
────────────────────────
Idempotent admin user creation script.
Reads credentials from env vars or uses defaults.
Safe to run multiple times — updates existing admin if found.

Usage:
  python scripts/create_admin.py
  # or via Flask CLI:
  flask create-admin
"""

import os
import sys

# Add project root to path so we can import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from models import db
from models.user import User
from werkzeug.security import generate_password_hash


def create_admin():
    """Create or update the admin user."""
    username = os.getenv("ADMIN_USERNAME", "sysadmin")
    email    = os.getenv("ADMIN_EMAIL", "admin@medicare-ai.com")
    password = os.getenv("ADMIN_PASSWORD", "Admin@2026")

    with app.app_context():
        user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()

        if user:
            user.is_admin = True
            user.email_verified = True
            user.profile_completed = True
            user.password_hash = generate_password_hash(password)
            db.session.commit()
            print(f"✅ Admin user '{user.username}' updated (is_admin=True, password reset)")
        else:
            user = User(
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                first_name="System",
                last_name="Admin",
                email_verified=True,
                profile_completed=True,
                is_admin=True,
            )
            db.session.add(user)
            db.session.commit()
            print(f"✅ Admin user '{username}' created successfully")

        print(f"   Username: {username}")
        print(f"   Email:    {email}")


if __name__ == "__main__":
    create_admin()
