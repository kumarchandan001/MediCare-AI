"""
health_intelligence/history/symptom_timeline.py
───────────────────────────────────────────────
Manages the longitudinal symptom timeline — retrieves,
weighs, and summarizes a user's symptom history for
trend analysis and pattern mining.

Features:
  - Recency-weighted symptom aggregation
  - Frequency analysis (recurring symptoms)
  - Symptom progression detection
  - Co-occurrence mapping
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
    compute_freshness,
)
from health_intelligence.models import SymptomLogEntry

log = logging.getLogger(__name__)


class SymptomTimeline:
    """
    Analyzes a user's symptom history over time.
    """

    def __init__(self):
        self._history = HealthHistoryManager()

    async def get_weighted_symptom_frequencies(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
        freshness_half_life: float = 7.0,
    ) -> list[dict]:
        """
        Return symptoms ranked by recency-weighted frequency.

        Each entry:
          {
            "symptom": "headache",
            "raw_count": 5,
            "weighted_score": 3.8,
            "last_reported": "2026-05-08T...",
            "freshness": 0.92,
          }
        """
        entries = await self._history.get_symptom_history(
            db, user_id, days=days,
        )
        if not entries:
            return []

        # Aggregate per symptom
        symptom_data: dict[str, list[SymptomLogEntry]] = defaultdict(list)
        for entry in entries:
            symptom_data[entry.symptom_name].append(entry)

        results: list[dict] = []
        for symptom_name, logs in symptom_data.items():
            raw_count = len(logs)
            weighted_score = sum(
                compute_freshness(e.recorded_at, freshness_half_life)
                * (e.severity_weight / 7.0)
                for e in logs
            )
            last_reported = max(e.recorded_at for e in logs)
            freshness = compute_freshness(
                last_reported, freshness_half_life,
            )

            results.append({
                "symptom": symptom_name,
                "display_name": symptom_name.replace("_", " ").title(),
                "raw_count": raw_count,
                "weighted_score": round(weighted_score, 2),
                "last_reported": last_reported.isoformat(),
                "freshness": round(freshness, 3),
            })

        results.sort(key=lambda x: x["weighted_score"], reverse=True)
        return results

    async def get_symptom_progression(
        self,
        db: AsyncSession,
        user_id: int,
        symptom_name: str,
        days: int = 30,
    ) -> dict:
        """
        Track how a specific symptom's severity has changed
        over time — useful for detecting worsening patterns.

        Returns:
          {
            "symptom": "headache",
            "entries": [...],
            "trend": "worsening" | "improving" | "stable",
            "avg_severity_early": 2.5,
            "avg_severity_recent": 4.0,
          }
        """
        entries = await self._history.get_symptom_history(
            db, user_id, days=days,
        )
        filtered = [
            e for e in entries if e.symptom_name == symptom_name
        ]

        if len(filtered) < 2:
            return {
                "symptom": symptom_name,
                "entries": len(filtered),
                "trend": "insufficient_data",
            }

        # Sort chronologically
        filtered.sort(key=lambda e: e.recorded_at)

        # Split into early half and recent half
        mid = len(filtered) // 2
        early = filtered[:mid]
        recent = filtered[mid:]

        avg_early = sum(e.severity_weight for e in early) / len(early)
        avg_recent = sum(e.severity_weight for e in recent) / len(recent)

        delta = avg_recent - avg_early
        if delta > 0.5:
            trend = "worsening"
        elif delta < -0.5:
            trend = "improving"
        else:
            trend = "stable"

        return {
            "symptom": symptom_name,
            "display_name": symptom_name.replace("_", " ").title(),
            "entries": len(filtered),
            "trend": trend,
            "avg_severity_early": round(avg_early, 2),
            "avg_severity_recent": round(avg_recent, 2),
            "severity_delta": round(delta, 2),
            "first_reported": filtered[0].recorded_at.isoformat(),
            "last_reported": filtered[-1].recorded_at.isoformat(),
        }

    async def get_cooccurrence_map(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
        window_hours: float = 24.0,
    ) -> list[dict]:
        """
        Find symptoms that tend to co-occur within a time window.

        Returns pairs with co-occurrence counts — useful for
        behavioral_patterns analysis.
        """
        entries = await self._history.get_symptom_history(
            db, user_id, days=days,
        )
        if len(entries) < 2:
            return []

        entries.sort(key=lambda e: e.recorded_at)

        pair_counts: dict[tuple[str, str], int] = defaultdict(int)
        window = timedelta(hours=window_hours)

        for i, a in enumerate(entries):
            for j in range(i + 1, len(entries)):
                b = entries[j]
                if b.recorded_at - a.recorded_at > window:
                    break
                if a.symptom_name != b.symptom_name:
                    pair = tuple(sorted([a.symptom_name, b.symptom_name]))
                    pair_counts[pair] += 1

        results = [
            {
                "symptom_a": pair[0].replace("_", " ").title(),
                "symptom_b": pair[1].replace("_", " ").title(),
                "co_occurrences": count,
            }
            for pair, count in pair_counts.items()
            if count >= 2
        ]
        results.sort(key=lambda x: x["co_occurrences"], reverse=True)
        return results[:20]
