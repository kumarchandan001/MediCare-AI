"""
health_intelligence/trends/progression_engine.py
───────────────────────────────────────────────
Progression Engine — tracks deterioration or improvement
trajectories over configurable windows.

Detects:
  - Multi-metric deterioration patterns
  - Recovery trajectories
  - Plateau phases
  - Relapse patterns (improve → worsen again)

Exposes:
  - Progression trajectory (improving / stable / declining / relapsing)
  - Trend confidence per trajectory
  - Overall health momentum
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.trends.trend_analyzer import (
    TrendAnalyzer,
    TREND_DECLINING,
    TREND_IMPROVING,
    TREND_STABLE,
)
from health_intelligence.history.health_history_manager import HealthHistoryManager

log = logging.getLogger(__name__)


class ProgressionEngine:
    """
    Tracks multi-window health trajectories to detect
    deterioration, recovery, plateau, and relapse patterns.
    """

    def __init__(self):
        self._trend_analyzer = TrendAnalyzer()
        self._history = HealthHistoryManager()

    async def get_progression(
        self,
        db: AsyncSession,
        user_id: int,
        metric: str,
    ) -> dict:
        """
        Analyze a single metric across multiple time windows
        to determine the progression trajectory.

        Windows: 7 days (recent), 14 days (medium), 30 days (long)

        Trajectory patterns:
          - "improving": declining in long window, improving in recent
          - "declining": worsening across windows
          - "stable": stable across windows
          - "relapsing": was improving, now declining again
          - "recovering": was declining, now improving
          - "plateau": was changing, now stable
        """
        # Analyze across three windows
        short = await self._trend_analyzer.analyze_metric_trend(
            db, user_id, metric=metric, days=7,
        )
        medium = await self._trend_analyzer.analyze_metric_trend(
            db, user_id, metric=metric, days=14,
        )
        long_term = await self._trend_analyzer.analyze_metric_trend(
            db, user_id, metric=metric, days=30,
        )

        short_dir = short.get("direction", "insufficient_data")
        medium_dir = medium.get("direction", "insufficient_data")
        long_dir = long_term.get("direction", "insufficient_data")

        # Determine trajectory
        trajectory = self._classify_trajectory(
            short_dir, medium_dir, long_dir,
        )

        # Momentum score (-100 to +100)
        momentum = self._compute_momentum(short, medium, long_term)

        # Average confidence across windows
        confidences = [
            t.get("trend_confidence", 0)
            for t in [short, medium, long_term]
            if t.get("direction") != "insufficient_data"
        ]
        avg_confidence = (
            sum(confidences) / len(confidences)
            if confidences else 0.0
        )

        display = metric.replace("_", " ").title()

        return {
            "metric": metric,
            "display_name": display,
            "trajectory": trajectory,
            "momentum": round(momentum, 1),
            "trajectory_confidence": round(avg_confidence, 3),
            "windows": {
                "7d": {
                    "direction": short_dir,
                    "change_pct": short.get("change_pct", 0),
                    "confidence": short.get("trend_confidence", 0),
                },
                "14d": {
                    "direction": medium_dir,
                    "change_pct": medium.get("change_pct", 0),
                    "confidence": medium.get("trend_confidence", 0),
                },
                "30d": {
                    "direction": long_dir,
                    "change_pct": long_term.get("change_pct", 0),
                    "confidence": long_term.get("trend_confidence", 0),
                },
            },
            "message": self._trajectory_message(
                display, trajectory, momentum,
            ),
        }

    async def get_all_progressions(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Get progression trajectories for all key metrics.
        """
        metrics = [
            "heart_rate_bpm", "spo2_percent", "sleep_hours",
            "steps", "stress_level", "active_minutes",
        ]

        progressions: list[dict] = []
        for m in metrics:
            prog = await self.get_progression(db, user_id, m)
            if prog["trajectory"] != "insufficient_data":
                progressions.append(prog)

        # Overall health momentum
        momentums = [p["momentum"] for p in progressions]
        overall_momentum = (
            sum(momentums) / len(momentums)
            if momentums else 0.0
        )

        declining = [
            p for p in progressions
            if p["trajectory"] in ("declining", "relapsing")
        ]

        return {
            "progressions": progressions,
            "overall_momentum": round(overall_momentum, 1),
            "declining_metrics": len(declining),
            "total_tracked": len(progressions),
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    # ── Trajectory classification ────────────────────────────

    @staticmethod
    def _classify_trajectory(
        short: str,
        medium: str,
        long_term: str,
    ) -> str:
        """Classify the multi-window trajectory."""
        dirs = [short, medium, long_term]

        # Insufficient data
        valid = [d for d in dirs if d != "insufficient_data"]
        if len(valid) < 2:
            return "insufficient_data"

        # All same direction
        if all(d == TREND_DECLINING for d in valid):
            return "declining"
        if all(d == TREND_IMPROVING for d in valid):
            return "improving"
        if all(d == TREND_STABLE for d in valid):
            return "stable"

        # Relapsing: was improving long-term but declining recently
        if long_term == TREND_IMPROVING and short == TREND_DECLINING:
            return "relapsing"

        # Recovering: was declining long-term but improving recently
        if long_term == TREND_DECLINING and short == TREND_IMPROVING:
            return "recovering"

        # Plateau: was changing but now stable
        if short == TREND_STABLE and long_term != TREND_STABLE:
            return "plateau"

        # Default to recent direction
        if short != "insufficient_data":
            return short

        return "mixed"

    @staticmethod
    def _compute_momentum(
        short: dict,
        medium: dict,
        long_term: dict,
    ) -> float:
        """
        Compute health momentum ∈ [-100, +100].

        Positive = improving, Negative = declining.
        Recent changes are weighted more heavily.
        """
        def direction_sign(d: str) -> float:
            if d == TREND_IMPROVING:
                return 1.0
            elif d == TREND_DECLINING:
                return -1.0
            return 0.0

        short_change = abs(short.get("change_pct", 0))
        medium_change = abs(medium.get("change_pct", 0))
        long_change = abs(long_term.get("change_pct", 0))

        short_sign = direction_sign(short.get("direction", "stable"))
        medium_sign = direction_sign(medium.get("direction", "stable"))
        long_sign = direction_sign(long_term.get("direction", "stable"))

        # Weighted momentum (recent matters more)
        momentum = (
            short_sign * min(short_change, 50) * 0.5
            + medium_sign * min(medium_change, 50) * 0.3
            + long_sign * min(long_change, 50) * 0.2
        )

        return max(-100, min(100, momentum))

    @staticmethod
    def _trajectory_message(
        display: str,
        trajectory: str,
        momentum: float,
    ) -> str:
        """Generate a human-readable trajectory message."""
        messages = {
            "improving": (
                f"{display} shows a consistent improvement trend."
            ),
            "declining": (
                f"{display} has been declining across all time windows. "
                "Consider addressing this."
            ),
            "stable": f"{display} has been stable.",
            "recovering": (
                f"{display} was declining but is now showing signs "
                "of recovery."
            ),
            "relapsing": (
                f"{display} was improving but has started declining "
                "again recently."
            ),
            "plateau": (
                f"{display} has plateaued after a period of change."
            ),
            "insufficient_data": (
                f"Not enough data to determine {display} progression."
            ),
        }
        return messages.get(trajectory, f"{display}: {trajectory}")
