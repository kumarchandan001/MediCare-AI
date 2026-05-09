"""
health_intelligence/insights/resilience_growth_tracker.py
───────────────────────────────────────────────
Tracks and generates insights on resilience capacity
evolution over time.

Monitors:
  - Resilience capacity trends (weekly)
  - Stress-recovery ratio evolution
  - Recovery speed improvements
  - Capacity ceiling shifts
  - Growth milestones
"""

import logging
import math
from collections import defaultdict
from datetime import datetime

log = logging.getLogger(__name__)


class ResilienceGrowthTracker:
    """
    Tracks resilience capacity growth over weeks
    and generates developmental insights.
    """

    def __init__(self):
        # user_id → list of weekly snapshots
        self._weekly: dict[int, list[dict]] = defaultdict(list)
        self._max_weeks = 52

    def record_weekly(
        self,
        user_id: int,
        resilience_score: float,
        recovery_speed: float,
        stress_tolerance: float,
        recovery_consistency: float,
    ) -> None:
        """Record a weekly resilience snapshot."""
        snapshot = {
            "week": len(self._weekly[user_id]) + 1,
            "resilience_score": round(resilience_score, 2),
            "recovery_speed": round(recovery_speed, 3),
            "stress_tolerance": round(stress_tolerance, 2),
            "recovery_consistency": round(recovery_consistency, 3),
            "composite": round(
                resilience_score * 0.4
                + recovery_speed * 30
                + stress_tolerance * 0.3
                + recovery_consistency * 30,
                2,
            ),
            "timestamp": datetime.utcnow().isoformat(),
        }
        self._weekly[user_id].append(snapshot)
        if len(self._weekly[user_id]) > self._max_weeks:
            self._weekly[user_id] = self._weekly[user_id][-self._max_weeks:]

    def analyse_growth(self, user_id: int) -> dict:
        """Comprehensive resilience growth analysis."""
        data = self._weekly.get(user_id, [])

        if len(data) < 3:
            return {
                "status": "insufficient_data",
                "weeks_tracked": len(data),
                "message": "Need at least 3 weeks of data for growth analysis.",
            }

        # Overall trend
        composites = [d["composite"] for d in data]
        trend = self._compute_trend(composites)

        # Growth rate (per week)
        first_composite = composites[0]
        last_composite = composites[-1]
        growth_pct = (
            (last_composite - first_composite) / max(abs(first_composite), 1) * 100
        )

        # Milestones
        milestones = self._detect_milestones(data)

        # Current phase
        phase = self._determine_phase(data)

        # Insights
        insights = self._generate_insights(data, trend, growth_pct)

        return {
            "user_id": user_id,
            "weeks_tracked": len(data),
            "current_composite": round(last_composite, 2),
            "growth_percentage": round(growth_pct, 1),
            "trend_direction": trend,
            "current_phase": phase,
            "milestones": milestones,
            "insights": insights,
            "weekly_data": data[-12:],  # Last 12 weeks
            "analysed_at": datetime.utcnow().isoformat(),
        }

    def _detect_milestones(self, data: list[dict]) -> list[dict]:
        """Detect resilience growth milestones."""
        milestones: list[dict] = []
        composites = [d["composite"] for d in data]

        # First crossing thresholds
        thresholds = [40, 50, 60, 70, 80]
        for threshold in thresholds:
            for i, val in enumerate(composites):
                if val >= threshold and all(v < threshold for v in composites[:i]):
                    milestones.append({
                        "milestone": f"resilience_above_{threshold}",
                        "week": i + 1,
                        "description": f"Resilience composite first reached {threshold}",
                    })
                    break

        # Sustained improvement (4+ weeks of growth)
        growth_streak = 0
        max_streak = 0
        for i in range(1, len(composites)):
            if composites[i] > composites[i - 1]:
                growth_streak += 1
                max_streak = max(max_streak, growth_streak)
            else:
                growth_streak = 0

        if max_streak >= 4:
            milestones.append({
                "milestone": "sustained_growth",
                "weeks": max_streak,
                "description": f"{max_streak}-week sustained resilience growth streak",
            })

        return milestones

    @staticmethod
    def _determine_phase(data: list[dict]) -> dict:
        """Determine current resilience development phase."""
        if len(data) < 3:
            return {"phase": "baseline", "description": "Building initial baseline"}

        recent = [d["composite"] for d in data[-4:]]
        avg = sum(recent) / len(recent)
        trend = recent[-1] - recent[0]

        if avg < 40:
            return {
                "phase": "foundation",
                "description": "Building resilience foundations",
            }
        elif avg < 55 and trend > 0:
            return {
                "phase": "developing",
                "description": "Active resilience development",
            }
        elif avg >= 55 and trend >= -1:
            return {
                "phase": "strengthening",
                "description": "Resilience is strengthening and stabilising",
            }
        elif trend < -2:
            return {
                "phase": "recovering",
                "description": "Resilience recovering from recent setback",
            }
        else:
            return {
                "phase": "maintaining",
                "description": "Maintaining current resilience level",
            }

    @staticmethod
    def _generate_insights(
        data: list[dict],
        trend: str,
        growth_pct: float,
    ) -> list[str]:
        """Generate human-readable resilience insights."""
        insights: list[str] = []

        if trend == "improving":
            insights.append(
                f"Your resilience has grown {abs(growth_pct):.1f}% — "
                "the habits you've built are making a difference."
            )
        elif trend == "declining":
            insights.append(
                "Recent resilience levels have dipped. "
                "Focus on recovery consistency and sleep quality."
            )
        else:
            insights.append(
                "Resilience is stable. Consider gently challenging "
                "your routine to encourage further growth."
            )

        # Recovery speed insight
        recent_speed = [d["recovery_speed"] for d in data[-4:]]
        if len(recent_speed) >= 2 and recent_speed[-1] > recent_speed[0]:
            insights.append(
                "Your recovery speed is improving — your body "
                "is getting better at bouncing back from stress."
            )

        return insights

    @staticmethod
    def _compute_trend(values: list[float]) -> str:
        if len(values) < 3:
            return "insufficient_data"
        recent = values[-4:]
        slope = (recent[-1] - recent[0]) / max(len(recent) - 1, 1)
        if slope > 0.5:
            return "improving"
        elif slope < -0.5:
            return "declining"
        return "stable"
