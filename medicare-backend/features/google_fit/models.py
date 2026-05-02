"""
features/google_fit/models.py
──────────────────────────────────────────
Log of every Google Fit sync operation.
Used for history, debugging, and showing user what was imported.
"""

from sqlalchemy import (
    Column, Integer, String, DateTime, Text, Float, ForeignKey,
)
from sqlalchemy.sql import func
from core.database import Base


class GoogleFitSync(Base):
    """Log of every Google Fit sync operation."""
    __tablename__ = "google_fit_syncs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sync_type = Column(String(20), nullable=False)        # "manual" | "auto" | "initial"
    status = Column(String(20), nullable=False)            # "success" | "failed" | "partial" | "running"
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    date_range_from = Column(DateTime(timezone=True), nullable=True)
    date_range_to = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    # Counts of what was synced
    vitals_synced = Column(Integer, default=0)
    activities_synced = Column(Integer, default=0)
    sleep_records = Column(Integer, default=0)
    weight_records = Column(Integer, default=0)
    total_steps = Column(Integer, default=0)
    avg_heart_rate = Column(Float, nullable=True)

    # Summary JSON
    sync_summary = Column(Text, nullable=True)  # JSON string: { steps, hr, sleep, etc. }
