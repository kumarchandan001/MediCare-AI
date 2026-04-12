"""
init_db.py
──────────
Creates all database tables using SQLAlchemy models.
For PostgreSQL, prefer Flask-Migrate (flask db upgrade).

Run manually: python init_db.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app import app
from models import db

if __name__ == '__main__':
    with app.app_context():
        print(f"Database: {app.config['SQLALCHEMY_DATABASE_URI'].split('@')[-1]}")
        print("Creating all database tables via SQLAlchemy ORM...")
        db.create_all()
        print("[OK] Database initialization complete.")
        print("\n[TIP] For production, use Flask-Migrate:")
        print("   flask db init")
        print("   flask db migrate -m 'Initial schema'")
        print("   flask db upgrade")
