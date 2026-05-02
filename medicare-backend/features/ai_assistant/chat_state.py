"""
chat_state.py
─────────────────────────────────────────────
Persistent conversation state manager.

Each user has ONE active ChatSession row in SQLite.
State tracks:
  - symptoms collected so far
  - country code
  - lifestyle flags (smoker, drinker, inactive)
  - health data (bp, sleep, age, weight)
  - last_intent  → what the bot was last doing
  - turn_count   → total turns in session
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import Base

logger = logging.getLogger(__name__)


# ── SQLAlchemy Model ──────────────────────────────────────────────────────────

class ChatSession(Base):
    """Stores one persistent chat context row per user."""
    __tablename__ = "chat_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, nullable=False, unique=True, index=True)
    state_json = Column(Text, nullable=False, default="{}")
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


# ── Default state factory ─────────────────────────────────────────────────────

def _default_state(user_id: int) -> dict:
    return {
        "user_id":    user_id,
        "symptoms":   [],
        "country":    None,
        "profile": {
            "smoker":   None,
            "drinker":  None,
            "inactive": None,
        },
        "health_data": {
            "bp":     None,
            "sleep":  None,
            "age":    None,
            "weight": None,
        },
        "last_intent": None,   # "predict" | "advice" | "followup" | "general"
        "turn_count":  0,
        "last_prediction": None,
    }


# ── Public API ─────────────────────────────────────────────────────────────────

async def load_state(db: AsyncSession, user_id: int) -> dict:
    """
    Load state for user_id.
    Returns default state dict if no session exists yet.
    """
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return _default_state(user_id)
    try:
        state = json.loads(row.state_json)
        # Ensure all keys exist (handle old rows missing new fields)
        default = _default_state(user_id)
        for k, v in default.items():
            if k not in state:
                state[k] = v
        return state
    except json.JSONDecodeError:
        logger.warning(f"Corrupt state for user {user_id}, resetting.")
        return _default_state(user_id)


async def save_state(db: AsyncSession, user_id: int, state: dict) -> None:
    """Upsert the full state dict for user_id."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = ChatSession(user_id=user_id, state_json=json.dumps(state))
        db.add(row)
    else:
        row.state_json = json.dumps(state)
        row.updated_at = datetime.now(timezone.utc)
    await db.commit()


async def update_state(
    db: AsyncSession,
    user_id: int,
    updates: dict,
) -> dict:
    """
    Load → merge updates → save → return updated state.
    Supports nested updates for 'profile' and 'health_data' sub-dicts.
    """
    state = await load_state(db, user_id)

    for key, value in updates.items():
        if key in ("profile", "health_data") and isinstance(value, dict):
            # Merge nested sub-dicts, don't overwrite entire block
            state[key] = {**state.get(key, {}), **value}
        elif key == "symptoms" and isinstance(value, list):
            # Deduplicate and cap at 20
            existing = state.get("symptoms", [])
            merged = list(dict.fromkeys(existing + value))  # preserve order
            state["symptoms"] = merged[:20]
        else:
            state[key] = value

    await save_state(db, user_id, state)
    return state


async def reset_state(db: AsyncSession, user_id: int) -> dict:
    """Reset user state to defaults (e.g., user says 'start over')."""
    fresh = _default_state(user_id)
    await save_state(db, user_id, fresh)
    return fresh
