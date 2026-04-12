"""
migrate_xai_columns.py
──────────────────────
Add XAI columns to disease_predictions table in PostgreSQL.
Run this once: python migrate_xai_columns.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db
from sqlalchemy import text


def migrate():
    with app.app_context():
        print("[migrate] Adding XAI columns to disease_predictions...")

        columns = [
            ("xai_summary", "TEXT"),
            ("evidence_strength", "VARCHAR(20)"),
            ("explanation_score", "FLOAT"),
            ("risk_factors_count", "INTEGER DEFAULT 0"),
            ("alternatives_count", "INTEGER DEFAULT 0"),
        ]

        for col_name, col_type in columns:
            try:
                db.session.execute(text(
                    f"ALTER TABLE disease_predictions "
                    f"ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                ))
                print(f"  [OK] Added column: {col_name} ({col_type})")
            except Exception as e:
                print(f"  [WARN] Column {col_name}: {e}")

        db.session.commit()
        print("[migrate] Done! XAI columns ready.")


if __name__ == '__main__':
    migrate()
