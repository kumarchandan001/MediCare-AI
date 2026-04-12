"""
create_db.py
─────────────
PostgreSQL-compatible schema initialiser.
Uses SQLAlchemy ORM (Flask-Migrate) instead of sqlite3.

Run with:  python create_db.py
   OR use: flask db upgrade  (preferred for production)
"""

import os
import sys

# Ensure project root on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app import app

def create_all_tables():
    with app.app_context():
        from models import db

        print("\n🏗️  Creating all tables via SQLAlchemy ORM...\n")
        try:
            db.create_all()
            print("✅ All tables created (or already exist).")
            print("\n💡 Tip: For production, prefer Flask-Migrate:")
            print("   flask db migrate -m 'Initial schema'")
            print("   flask db upgrade\n")
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            sys.exit(1)

if __name__ == '__main__':
    create_all_tables()