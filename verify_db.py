"""
verify_db.py
─────────────
PostgreSQL-compatible database verification script.
Uses SQLAlchemy (via Flask app context) instead of sqlite3.

Run with:  python verify_db.py
"""

import os
import sys
from datetime import datetime

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app import app

EXPECTED_TABLES = {
    'users':                  ['id', 'username', 'email', 'password_hash'],
    'health_monitoring':      ['id', 'user_id', 'heart_rate', 'oxygen_level'],
    'activity_tracking':      ['id', 'user_id', 'steps'],
    'bmi_history':            ['id', 'user_id', 'bmi', 'weight'],
    'medication_reminders':   ['id', 'user_id', 'medication_name'],
    'medication_history':     ['id', 'user_id', 'medication_name', 'status'],
    'disease_predictions':    ['id', 'user_id', 'predicted_disease'],
    'chatbot_interactions':   ['id', 'user_id', 'query', 'response'],
    'alerts':                 ['id', 'user_id', 'severity', 'title'],
    'emergency_contacts':     ['id', 'user_id', 'name'],
}

with app.app_context():
    from models import db
    from sqlalchemy import inspect, text

    inspector = inspect(db.engine)
    existing_tables = set(inspector.get_table_names())
    dialect = db.engine.dialect.name

    print(f"\n{'='*60}")
    print(f"  MediCare AI — Database Verification")
    print(f"  Engine  : {dialect.upper()}")
    print(f"  Time    : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # ── 1. Connection test ────────────────────────────────────────────────────
    try:
        db.session.execute(text('SELECT 1'))
        print("✅ Database connection: OK\n")
    except Exception as e:
        print(f"❌ Database connection FAILED: {e}")
        sys.exit(1)

    # ── 2. Table existence check ──────────────────────────────────────────────
    print("📋 Table Check:")
    all_tables_ok = True
    for tname in sorted(EXPECTED_TABLES.keys()):
        if tname in existing_tables:
            print(f"   ✅ {tname}")
        else:
            print(f"   ❌ MISSING: {tname}")
            all_tables_ok = False

    # ── 3. Column check ───────────────────────────────────────────────────────
    print("\n📐 Column Check:")
    for tname, cols in EXPECTED_TABLES.items():
        if tname not in existing_tables:
            continue
        existing_cols = {c['name'] for c in inspector.get_columns(tname)}
        missing_cols  = [c for c in cols if c not in existing_cols]
        if missing_cols:
            print(f"   ⚠️  {tname}: missing columns {missing_cols}")
        else:
            print(f"   ✅ {tname}: all expected columns present")

    # ── 4. Row counts ─────────────────────────────────────────────────────────
    print("\n📊 Row Counts:")
    for tname in sorted(EXPECTED_TABLES.keys()):
        if tname not in existing_tables:
            continue
        try:
            row = db.session.execute(text(f'SELECT COUNT(*) FROM {tname}')).fetchone()
            count = row[0] if row else 0
            print(f"   {tname:<30} {count:>6} rows")
        except Exception as e:
            print(f"   {tname:<30} ERROR: {e}")

    # ── Summary ───────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    if all_tables_ok:
        print("✅ All expected tables verified successfully.")
    else:
        print("⚠️  Some tables are missing. Run: flask db upgrade")
    print(f"{'='*60}\n")
