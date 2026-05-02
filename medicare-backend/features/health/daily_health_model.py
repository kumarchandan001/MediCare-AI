"""
daily_health_model.py
─────────────────────────────────────────────
Per-day health data model.

Design:
  • One row per user per day (enforced by UniqueConstraint).
  • If the user updates on the same day → existing row is updated.
  • If it's a new day → a fresh row is inserted.
  • Historical rows are never deleted — true time-series storage.
"""

from sqlalchemy import (
    Column, Integer, Float, Date, DateTime,
    ForeignKey, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class DailyHealthRecord(Base):
    """Stores one health snapshot per user per calendar day."""

    __tablename__ = "daily_health_records"
    __table_args__ = (
        # PostgreSQL enforces: no two rows can share (user_id, date)
        UniqueConstraint("user_id", "date", name="uq_user_date"),
    )

    # ── Primary key ─────────────────────────────
    id = Column(Integer, primary_key=True, index=True)

    # ── Foreign key → users.id ──────────────────
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Date key (YYYY-MM-DD) ───────────────────
    date = Column(Date, nullable=False, index=True)

    # ── Health metrics (all optional for partial updates) ──
    steps = Column(Integer, nullable=True)              # daily step count
    sleep_hours = Column(Float, nullable=True)          # 0.0 – 24.0
    bp_systolic = Column(Integer, nullable=True)        # 60 – 250 mmHg
    bp_diastolic = Column(Integer, nullable=True)       # 40 – 150 mmHg
    heart_rate = Column(Integer, nullable=True)         # 30 – 220 bpm
    weight = Column(Float, nullable=True)               # 10 – 500 kg
    oxygen_level = Column(Float, nullable=True)         # 50 – 100 %
    stress_level = Column(Integer, nullable=True)       # 1 – 10
    body_temperature = Column(Float, nullable=True)     # 90 – 110 °F
    notes = Column(Text, nullable=True)

    # ── Timestamps ──────────────────────────────
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationship ────────────────────────────
    user = relationship("User", backref="daily_health_records")

    def __repr__(self) -> str:
        return f"<DailyHealthRecord user={self.user_id} date={self.date}>"
