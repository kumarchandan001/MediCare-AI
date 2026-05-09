"""
health_intelligence/history/wearable_timeline.py
───────────────────────────────────────────────
Manages time-series wearable data aggregation and
retrieval for trend analysis and baseline computation.

Features:
  - Daily/weekly aggregation of wearable metrics
  - Recency-weighted metric extraction
  - Data gap detection
  - Time-series preparation for trend analysis
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
    compute_freshness,
    compute_continuity_score,
)
from health_intelligence.models import WearableSnapshot

log = logging.getLogger(__name__)


class WearableTimeline:
    """
    Aggregates and summarizes wearable data over time
    for baseline computation, trend analysis, and
    anomaly detection.
    """

    # Numeric fields available on WearableSnapshot
    METRIC_FIELDS = [
        "heart_rate_bpm", "spo2_percent", "steps",
        "calories_burned", "sleep_hours", "active_minutes",
        "distance_km", "stress_level",
    ]

    def __init__(self):
        self._history = HealthHistoryManager()

    async def get_daily_aggregates(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 14,
    ) -> list[dict]:
        """
        Aggregate wearable data by day. For each day, compute
        the mean of each metric across all snapshots.

        Returns a list of dicts sorted chronologically:
          [
            {
              "date": "2026-05-08",
              "heart_rate_bpm": 72.5,
              "sleep_hours": 7.2,
              ...
              "snapshot_count": 3,
            },
            ...
          ]
        """
        snapshots = await self._history.get_wearable_history(
            db, user_id, days=days,
        )
        if not snapshots:
            return []

        # Group by date
        by_date: dict[str, list[WearableSnapshot]] = defaultdict(list)
        for snap in snapshots:
            date_key = snap.recorded_at.strftime("%Y-%m-%d")
            by_date[date_key].append(snap)

        results: list[dict] = []
        for date_str in sorted(by_date.keys()):
            day_snaps = by_date[date_str]
            agg: dict = {"date": date_str, "snapshot_count": len(day_snaps)}

            for field in self.METRIC_FIELDS:
                values = [
                    getattr(s, field) for s in day_snaps
                    if getattr(s, field, None) is not None
                ]
                if values:
                    agg[field] = round(sum(values) / len(values), 2)
                else:
                    agg[field] = None

            results.append(agg)

        return results

    async def get_metric_series(
        self,
        db: AsyncSession,
        user_id: int,
        metric: str,
        days: int = 14,
    ) -> list[dict]:
        """
        Extract a single metric time-series with freshness scores.

        Returns:
          [
            {"timestamp": "...", "value": 72.0, "freshness": 0.95},
            ...
          ]
        """
        series = await self._history.get_wearable_field_series(
            db, user_id, field=metric, days=days,
        )
        return [
            {
                "timestamp": ts.isoformat(),
                "value": val,
                "freshness": round(
                    compute_freshness(ts, half_life_days=7.0), 3
                ),
            }
            for ts, val in series
        ]

    async def get_data_quality_report(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 14,
    ) -> dict:
        """
        Assess the quality and continuity of wearable data.

        Returns:
          {
            "total_snapshots": 42,
            "days_covered": 12,
            "continuity_score": 0.85,
            "avg_snapshots_per_day": 3.5,
            "missing_days": ["2026-05-03", ...],
            "freshest_data": "2026-05-08T14:30:00",
            "overall_freshness": 0.92,
          }
        """
        snapshots = await self._history.get_wearable_history(
            db, user_id, days=days,
        )
        if not snapshots:
            return {
                "total_snapshots": 0,
                "days_covered": 0,
                "continuity_score": 0.0,
                "avg_snapshots_per_day": 0.0,
                "missing_days": [],
                "freshest_data": None,
                "overall_freshness": 0.0,
            }

        timestamps = [s.recorded_at for s in snapshots]
        continuity = compute_continuity_score(
            timestamps, expected_interval_hours=24.0, window_days=days,
        )

        # Find covered and missing days
        date_set = {s.recorded_at.strftime("%Y-%m-%d") for s in snapshots}
        all_dates = set()
        for d in range(days):
            dt = datetime.utcnow() - timedelta(days=d)
            all_dates.add(dt.strftime("%Y-%m-%d"))
        missing = sorted(all_dates - date_set)

        freshest = max(timestamps)

        return {
            "total_snapshots": len(snapshots),
            "days_covered": len(date_set),
            "continuity_score": continuity,
            "avg_snapshots_per_day": round(
                len(snapshots) / max(len(date_set), 1), 1
            ),
            "missing_days": missing,
            "freshest_data": freshest.isoformat(),
            "overall_freshness": round(
                compute_freshness(freshest, half_life_days=7.0), 3
            ),
        }

    async def get_weighted_averages(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 14,
        half_life_days: float = 7.0,
    ) -> dict[str, Optional[float]]:
        """
        Compute recency-weighted averages for all wearable
        metrics. Newer data contributes more to the average.

        Uses exponential decay weighting.
        """
        snapshots = await self._history.get_wearable_history(
            db, user_id, days=days,
        )
        if not snapshots:
            return {f: None for f in self.METRIC_FIELDS}

        averages: dict[str, Optional[float]] = {}
        for field in self.METRIC_FIELDS:
            weighted_sum = 0.0
            weight_total = 0.0

            for snap in snapshots:
                val = getattr(snap, field, None)
                if val is not None:
                    w = compute_freshness(
                        snap.recorded_at, half_life_days,
                    )
                    weighted_sum += float(val) * w
                    weight_total += w

            if weight_total > 0:
                averages[field] = round(weighted_sum / weight_total, 2)
            else:
                averages[field] = None

        return averages
