"""
health_intelligence/history/event_timeline.py
───────────────────────────────────────────────
Health Event Timeline — tracks significant life/health
events for future event-health correlation analysis.

Event types:
  - illness
  - medication_change
  - travel
  - exam_stress
  - sleep_disruption
  - recovery_period
  - lifestyle_change
  - other
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
)
from health_intelligence.models import HealthEventLog

log = logging.getLogger(__name__)

VALID_EVENT_TYPES = {
    "illness", "medication_change", "travel", "exam_stress",
    "sleep_disruption", "recovery_period", "lifestyle_change", "other",
}


class EventTimeline:
    """
    Manages health event logging and retrieval for
    future event-health correlation analysis.
    """

    def __init__(self):
        self._history = HealthHistoryManager()

    async def log_event(
        self,
        db: AsyncSession,
        user_id: int,
        event_type: str,
        title: str,
        description: Optional[str] = None,
        severity: Optional[str] = None,
        metadata: Optional[dict] = None,
        started_at: Optional[datetime] = None,
        ended_at: Optional[datetime] = None,
    ) -> HealthEventLog:
        """
        Record a new health/life event to the timeline.
        """
        if event_type not in VALID_EVENT_TYPES:
            log.warning(
                "Unknown event type '%s', defaulting to 'other'",
                event_type,
            )
            event_type = "other"

        event = HealthEventLog(
            user_id=user_id,
            event_type=event_type,
            title=title,
            description=description,
            severity=severity,
            metadata_json=metadata,
            started_at=started_at or datetime.utcnow(),
            ended_at=ended_at,
        )
        return await self._history.save_health_event(db, event)

    async def get_timeline(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 90,
        event_type: Optional[str] = None,
    ) -> list[dict]:
        """
        Get a formatted event timeline.
        Optionally filter by event type.
        """
        events = await self._history.get_health_events(
            db, user_id, days=days,
        )

        if event_type:
            events = [e for e in events if e.event_type == event_type]

        return [
            {
                "id": e.id,
                "event_type": e.event_type,
                "title": e.title,
                "description": e.description,
                "severity": e.severity,
                "metadata": e.metadata_json,
                "started_at": e.started_at.isoformat() if e.started_at else None,
                "ended_at": e.ended_at.isoformat() if e.ended_at else None,
                "is_ongoing": e.ended_at is None,
                "recorded_at": e.recorded_at.isoformat() if e.recorded_at else None,
            }
            for e in events
        ]

    async def get_active_events(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        """Get events that are currently ongoing (no end date)."""
        events = await self._history.get_health_events(
            db, user_id, days=365,
        )
        active = [e for e in events if e.ended_at is None]
        return [
            {
                "id": e.id,
                "event_type": e.event_type,
                "title": e.title,
                "severity": e.severity,
                "started_at": e.started_at.isoformat() if e.started_at else None,
                "duration_days": (
                    (datetime.utcnow() - e.started_at.replace(tzinfo=None)).days
                    if e.started_at else 0
                ),
            }
            for e in active
        ]

    async def close_event(
        self,
        db: AsyncSession,
        event_id: int,
        ended_at: Optional[datetime] = None,
    ) -> bool:
        """Mark an event as ended."""
        from sqlalchemy import select, update
        stmt = (
            update(HealthEventLog)
            .where(HealthEventLog.id == event_id)
            .values(ended_at=ended_at or datetime.utcnow())
        )
        result = await db.execute(stmt)
        await db.flush()
        return result.rowcount > 0

    async def get_event_summary(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 90,
    ) -> dict:
        """
        Summarize event activity over the window.
        Useful for longitudinal insights.
        """
        events = await self._history.get_health_events(
            db, user_id, days=days,
        )
        type_counts: dict[str, int] = {}
        for e in events:
            type_counts[e.event_type] = type_counts.get(e.event_type, 0) + 1

        return {
            "total_events": len(events),
            "event_type_counts": type_counts,
            "active_events": sum(1 for e in events if e.ended_at is None),
            "window_days": days,
        }
