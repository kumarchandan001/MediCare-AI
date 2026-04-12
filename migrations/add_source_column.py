"""
migrations/add_source_column.py
────────────────────────────────
Add 'source' column (manual / google_fit) to:
  - daily_health_logs
  - activity_tracking
  - health_monitoring

Backfills existing rows with source='manual'.
Updates the unique constraint on daily_health_logs.

Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS).
"""

import os
import sys

# ── Setup path ----------------------------------------------------------------
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))

from app import app
from models import db


MIGRATION_SQL = [
    # 1. Add source column to all three tables
    """
    ALTER TABLE daily_health_logs
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';
    """,
    """
    ALTER TABLE activity_tracking
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';
    """,
    """
    ALTER TABLE health_monitoring
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';
    """,

    # 2. Drop old unique constraint (if it exists) and add new one with source
    """
    ALTER TABLE daily_health_logs
    DROP CONSTRAINT IF EXISTS uq_daily_log_user_date;
    """,
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_daily_log_user_date_source'
        ) THEN
            ALTER TABLE daily_health_logs
            ADD CONSTRAINT uq_daily_log_user_date_source
            UNIQUE (user_id, log_date, source);
        END IF;
    END $$;
    """,
]


def run_migration():
    with app.app_context():
        print("[*] Running source column migration...")
        for i, sql in enumerate(MIGRATION_SQL, 1):
            try:
                db.session.execute(db.text(sql))
                db.session.commit()
                print(f"  [OK] Step {i}/{len(MIGRATION_SQL)}")
            except Exception as e:
                db.session.rollback()
                print(f"  [SKIP] Step {i}/{len(MIGRATION_SQL)}: {e}")

        # Verify columns exist
        for table in ('daily_health_logs', 'activity_tracking', 'health_monitoring'):
            result = db.session.execute(db.text(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = '{table}' AND column_name = 'source'
            """)).fetchone()
            status = "[OK]" if result else "[FAIL]"
            print(f"  {status} {table}.source column {'exists' if result else 'MISSING'}")

        # Verify unique constraint
        result = db.session.execute(db.text("""
            SELECT conname FROM pg_constraint
            WHERE conname = 'uq_daily_log_user_date_source'
        """)).fetchone()
        status = "[OK]" if result else "[FAIL]"
        print(f"  {status} uq_daily_log_user_date_source constraint {'exists' if result else 'MISSING'}")

        print("[OK] Migration complete!")


if __name__ == '__main__':
    run_migration()
