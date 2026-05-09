"""
health_intelligence/history/health_history_manager.py
───────────────────────────────────────────────
Core interface for querying persistent longitudinal
health data from SQLAlchemy.

This is the **memory layer** of the health intelligence
system — every other module (baselines, trends, scoring,
prevention) queries data through this manager.

Features:
  - Recency-aware data retrieval
  - Time-window filtering
  - Data freshness scoring
  - Continuity / gap detection
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.models import (
    HealthBaselineLog,
    HealthScoreLog,
    PreventiveAlertLog,
    HealthEventLog,
    SymptomLogEntry,
    WearableSnapshot,
)

log = logging.getLogger(__name__)


# ── Data freshness helper ────────────────────────────────────

def compute_freshness(
    recorded_at: Optional[datetime],
    half_life_days: float = 7.0,
) -> float:
    """
    Compute a freshness score ∈ [0, 1] using exponential decay.

    freshness = exp(-age_days * ln(2) / half_life_days)

    - Data recorded just now → ~1.0
    - Data from half_life_days ago → ~0.5
    - Very old data → approaches 0.0
    """
    if recorded_at is None:
        return 0.0

    import math
    now = datetime.utcnow()
    if recorded_at.tzinfo:
        from datetime import timezone
        now = now.replace(tzinfo=timezone.utc)

    age_seconds = max((now - recorded_at).total_seconds(), 0)
    age_days = age_seconds / 86400.0
    decay_rate = math.log(2) / half_life_days
    return math.exp(-decay_rate * age_days)


def compute_continuity_score(
    timestamps: list[datetime],
    expected_interval_hours: float = 24.0,
    window_days: int = 14,
) -> float:
    """
    Compute a continuity score ∈ [0, 1] reflecting how
    consistently data was recorded over the window.

    1.0 = perfectly consistent daily data
    0.0 = no data at all
    """
    if len(timestamps) < 2:
        return min(len(timestamps) * 0.1, 0.1)

    expected_entries = (window_days * 24) / expected_interval_hours
    actual_entries = len(timestamps)
    coverage = min(actual_entries / max(expected_entries, 1), 1.0)

    # Penalize large gaps
    sorted_ts = sorted(timestamps)
    gaps = []
    for i in range(1, len(sorted_ts)):
        gap_hours = (sorted_ts[i] - sorted_ts[i - 1]).total_seconds() / 3600
        if gap_hours > expected_interval_hours * 2:
            gaps.append(gap_hours)

    gap_penalty = 1.0
    if gaps:
        avg_gap = sum(gaps) / len(gaps)
        gap_penalty = max(0.3, 1.0 - (avg_gap / (window_days * 24)))

    return round(coverage * gap_penalty, 3)


class HealthHistoryManager:
    """
    Central data access layer for longitudinal health data.
    All queries go through SQLAlchemy async sessions.
    """

    # ── Wearable history ─────────────────────────────────────

    async def get_wearable_history(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 14,
        limit: int = 500,
    ) -> list[WearableSnapshot]:
        """Retrieve wearable snapshots for the last N days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(WearableSnapshot)
            .where(
                WearableSnapshot.user_id == user_id,
                WearableSnapshot.recorded_at >= cutoff,
            )
            .order_by(desc(WearableSnapshot.recorded_at))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def save_wearable_snapshot(
        self,
        db: AsyncSession,
        user_id: int,
        heart_rate_bpm: Optional[float] = None,
        spo2_percent: Optional[float] = None,
        steps: Optional[int] = None,
        calories_burned: Optional[float] = None,
        sleep_hours: Optional[float] = None,
        active_minutes: Optional[int] = None,
        distance_km: Optional[float] = None,
        stress_level: Optional[float] = None,
        source: str = "unknown",
        recorded_at: Optional[datetime] = None,
    ) -> WearableSnapshot:
        """Persist a single wearable snapshot."""
        snap = WearableSnapshot(
            user_id=user_id,
            heart_rate_bpm=heart_rate_bpm,
            spo2_percent=spo2_percent,
            steps=steps,
            calories_burned=calories_burned,
            sleep_hours=sleep_hours,
            active_minutes=active_minutes,
            distance_km=distance_km,
            stress_level=stress_level,
            source=source,
            recorded_at=recorded_at or datetime.utcnow(),
        )
        db.add(snap)
        await db.flush()
        return snap

    # ── Symptom history ──────────────────────────────────────

    async def get_symptom_history(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
        limit: int = 500,
    ) -> list[SymptomLogEntry]:
        """Retrieve symptom logs for the last N days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(SymptomLogEntry)
            .where(
                SymptomLogEntry.user_id == user_id,
                SymptomLogEntry.recorded_at >= cutoff,
            )
            .order_by(desc(SymptomLogEntry.recorded_at))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def save_symptom_log(
        self,
        db: AsyncSession,
        user_id: int,
        symptom_name: str,
        severity_weight: int = 3,
        source: str = "user_input",
        recorded_at: Optional[datetime] = None,
    ) -> SymptomLogEntry:
        """Persist a single symptom log entry."""
        entry = SymptomLogEntry(
            user_id=user_id,
            symptom_name=symptom_name,
            severity_weight=severity_weight,
            source=source,
            recorded_at=recorded_at or datetime.utcnow(),
        )
        db.add(entry)
        await db.flush()
        return entry

    # ── Baseline history ─────────────────────────────────────

    async def get_latest_baseline(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[HealthBaselineLog]:
        """Get the most recent baseline for a user."""
        stmt = (
            select(HealthBaselineLog)
            .where(HealthBaselineLog.user_id == user_id)
            .order_by(desc(HealthBaselineLog.recorded_at))
            .limit(1)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def save_baseline(
        self,
        db: AsyncSession,
        baseline: HealthBaselineLog,
    ) -> HealthBaselineLog:
        """Persist a baseline snapshot."""
        db.add(baseline)
        await db.flush()
        return baseline

    # ── Score history ────────────────────────────────────────

    async def get_score_history(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
        limit: int = 100,
    ) -> list[HealthScoreLog]:
        """Get health score history for trend analysis."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(HealthScoreLog)
            .where(
                HealthScoreLog.user_id == user_id,
                HealthScoreLog.recorded_at >= cutoff,
            )
            .order_by(desc(HealthScoreLog.recorded_at))
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def save_score(
        self,
        db: AsyncSession,
        score: HealthScoreLog,
    ) -> HealthScoreLog:
        """Persist a health score entry."""
        db.add(score)
        await db.flush()
        return score

    # ── Preventive alerts ────────────────────────────────────

    async def get_preventive_alerts(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
        only_unacknowledged: bool = False,
    ) -> list[PreventiveAlertLog]:
        """Get preventive alerts for a user."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(PreventiveAlertLog)
            .where(
                PreventiveAlertLog.user_id == user_id,
                PreventiveAlertLog.recorded_at >= cutoff,
            )
        )
        if only_unacknowledged:
            stmt = stmt.where(PreventiveAlertLog.is_acknowledged == False)
        stmt = stmt.order_by(desc(PreventiveAlertLog.recorded_at)).limit(50)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def save_preventive_alert(
        self,
        db: AsyncSession,
        alert: PreventiveAlertLog,
    ) -> PreventiveAlertLog:
        """Persist a preventive alert."""
        db.add(alert)
        await db.flush()
        return alert

    # ── Health events ────────────────────────────────────────

    async def get_health_events(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 90,
    ) -> list[HealthEventLog]:
        """Get health event timeline."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(HealthEventLog)
            .where(
                HealthEventLog.user_id == user_id,
                HealthEventLog.started_at >= cutoff,
            )
            .order_by(desc(HealthEventLog.started_at))
            .limit(100)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def save_health_event(
        self,
        db: AsyncSession,
        event: HealthEventLog,
    ) -> HealthEventLog:
        """Persist a health event."""
        db.add(event)
        await db.flush()
        return event

    # ── Aggregation helpers ──────────────────────────────────

    async def get_wearable_field_series(
        self,
        db: AsyncSession,
        user_id: int,
        field: str,
        days: int = 14,
    ) -> list[tuple[datetime, float]]:
        """
        Extract a time-series of a single wearable field.
        Returns list of (timestamp, value) tuples.
        """
        col = getattr(WearableSnapshot, field, None)
        if col is None:
            return []

        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(WearableSnapshot.recorded_at, col)
            .where(
                WearableSnapshot.user_id == user_id,
                WearableSnapshot.recorded_at >= cutoff,
                col.isnot(None),
            )
            .order_by(WearableSnapshot.recorded_at)
        )
        result = await db.execute(stmt)
        return [(row[0], float(row[1])) for row in result.all()]

    async def count_symptom_occurrences(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
    ) -> dict[str, int]:
        """Count occurrences of each symptom in the window."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        stmt = (
            select(
                SymptomLogEntry.symptom_name,
                func.count(SymptomLogEntry.id).label("count"),
            )
            .where(
                SymptomLogEntry.user_id == user_id,
                SymptomLogEntry.recorded_at >= cutoff,
            )
            .group_by(SymptomLogEntry.symptom_name)
            .order_by(desc("count"))
        )
        result = await db.execute(stmt)
        return {row[0]: row[1] for row in result.all()}
