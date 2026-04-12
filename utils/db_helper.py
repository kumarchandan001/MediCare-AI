"""
utils/db_helper.py
──────────────────
Centralised database access layer for raw SQL queries.

Replaces ALL direct sqlite3.connect() calls across the codebase.
Uses SQLAlchemy's engine (from the Flask app) so it works with
both SQLite and PostgreSQL transparently.

Usage in services/routes:
    from utils.db_helper import get_db, fetch_one, fetch_all, execute_sql, table_exists

All queries use SQLAlchemy text() with :named_params (database-agnostic).
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text, inspect

logger = logging.getLogger(__name__)


def get_db():
    """
    Return the current SQLAlchemy db session.
    Must be called within a Flask application context.
    """
    from models import db
    return db.session


def execute_sql(sql: str, params: dict | None = None, commit: bool = False) -> Any:
    """
    Execute a raw SQL statement via SQLAlchemy.

    Parameters
    ----------
    sql : str
        SQL with :named_params  (e.g. "SELECT * FROM users WHERE id = :uid")
    params : dict | None
        Parameter dict          (e.g. {"uid": 1})
    commit : bool
        If True, commit after execution (for INSERT/UPDATE/DELETE).

    Returns
    -------
    SQLAlchemy CursorResult
    """
    from models import db
    try:
        result = db.session.execute(text(sql), params or {})
        if commit:
            db.session.commit()
        return result
    except Exception as e:
        db.session.rollback()
        logger.error(f"[db_helper] SQL error: {e}")
        raise


def fetch_one(sql: str, params: dict | None = None) -> dict | None:
    """
    Execute SELECT and return the first row as a dict, or None.

    Usage:
        row = fetch_one("SELECT * FROM users WHERE id = :uid", {"uid": 1})
        if row:
            print(row['username'])
    """
    result = execute_sql(sql, params)
    row = result.fetchone()
    if row is None:
        return None
    return dict(row._mapping)


def fetch_all(sql: str, params: dict | None = None) -> list[dict]:
    """
    Execute SELECT and return all rows as a list of dicts.

    Usage:
        rows = fetch_all("SELECT * FROM users WHERE is_admin = :flag", {"flag": True})
        for r in rows:
            print(r['username'])
    """
    result = execute_sql(sql, params)
    return [dict(row._mapping) for row in result.fetchall()]


def execute_insert_returning(sql: str, params: dict | None = None) -> int | None:
    """
    Execute an INSERT ... RETURNING id statement and return the inserted ID.

    Usage:
        new_id = execute_insert_returning(
            "INSERT INTO users (name) VALUES (:name) RETURNING id",
            {"name": "John"}
        )
    """
    from models import db
    try:
        result = db.session.execute(text(sql), params or {})
        db.session.commit()
        row = result.fetchone()
        return row[0] if row else None
    except Exception as e:
        db.session.rollback()
        logger.error(f"[db_helper] Insert error: {e}")
        raise


def table_exists(table_name: str) -> bool:
    """
    Check if a table exists in the database (PostgreSQL & SQLite compatible).
    Uses SQLAlchemy's inspector, which is database-agnostic.
    """
    from models import db
    try:
        inspector = inspect(db.engine)
        return table_name in inspector.get_table_names()
    except Exception as e:
        logger.error(f"[db_helper] table_exists error: {e}")
        return False


def get_db_size_mb() -> float:
    """
    Get database size in MB.
    Works with PostgreSQL (pg_database_size) and falls back for SQLite.
    """
    from models import db
    try:
        dialect = db.engine.dialect.name
        if dialect == 'postgresql':
            result = db.session.execute(
                text("SELECT pg_database_size(current_database()) / 1024.0 / 1024.0")
            )
            row = result.fetchone()
            return round(row[0], 2) if row else 0.0
        else:
            # SQLite fallback — file size
            import os
            db_url = str(db.engine.url)
            if '///' in db_url:
                db_path = db_url.split('///')[1]
                if os.path.exists(db_path):
                    return round(os.path.getsize(db_path) / 1024 / 1024, 2)
            return 0.0
    except Exception as e:
        logger.error(f"[db_helper] get_db_size error: {e}")
        return 0.0
