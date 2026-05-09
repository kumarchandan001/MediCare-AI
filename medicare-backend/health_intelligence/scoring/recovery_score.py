"""
health_intelligence/scoring/recovery_score.py
───────────────────────────────────────────────
Recovery Score Engine — tracks how well a user bounces
back from health stressors.

Tracks:
  - Recovery velocity (how fast metrics normalize)
  - Sleep debt recovery
  - Stress recovery patterns
  - Post-fatigue recovery
  - Resilience trends

Outputs:
  - Recovery score (0–100)
  - Recovery velocity
  - Sleep debt estimate
  - Resilience score
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
)
from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.personalization.baseline_engine import BaselineEngine

log = logging.getLogger(__name__)

# Optimal sleep target (hours)
OPTIMAL_SLEEP = 7.5


class RecoveryScoreEngine:
    """
    Computes recovery metrics that measure how well
    a user bounces back from health stressors.
    """

    def __init__(self):
        self._history = HealthHistoryManager()
        self._wearable_tl = WearableTimeline()
        self._baseline_engine = BaselineEngine()

    async def compute_recovery_score(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Compute a comprehensive recovery profile.

        Returns:
          {
            "recovery_score": 74,
            "recovery_velocity": 0.68,
            "sleep_debt_hours": 4.5,
            "stress_recovery": {...},
            "resilience_score": 71,
            "components": {...},
          }
        """
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=14,
        )
        baseline = await self._baseline_engine.get_current_baseline(
            db, user_id,
        )

        if len(daily) < 3:
            return {
                "recovery_score": None,
                "status": "insufficient_data",
                "message": "At least 3 days of data needed for recovery analysis.",
            }

        # Components
        sleep_debt = self._compute_sleep_debt(daily)
        sleep_recovery = self._score_sleep_recovery(daily)
        stress_recovery = self._score_stress_recovery(daily, baseline)
        hr_recovery = self._score_hr_recovery(daily, baseline)
        recovery_velocity = self._compute_recovery_velocity(daily, baseline)

        # Composite recovery score
        components = {
            "sleep_recovery": sleep_recovery,
            "stress_recovery": stress_recovery,
            "hr_recovery": hr_recovery,
        }

        valid_scores = [
            c["score"] for c in components.values()
            if c.get("score") is not None
        ]
        recovery_score = (
            sum(valid_scores) / len(valid_scores)
            if valid_scores else None
        )

        # Resilience = recovery_score weighted by consistency
        resilience = self._compute_resilience(
            recovery_score, recovery_velocity, len(daily),
        )

        return {
            "recovery_score": round(recovery_score, 1) if recovery_score else None,
            "recovery_velocity": round(recovery_velocity, 3),
            "sleep_debt_hours": round(sleep_debt, 1),
            "resilience_score": round(resilience, 1) if resilience else None,
            "components": components,
            "days_analyzed": len(daily),
            "computed_at": datetime.utcnow().isoformat(),
        }

    # ── Sleep debt ───────────────────────────────────────────

    @staticmethod
    def _compute_sleep_debt(daily: list[dict]) -> float:
        """
        Compute accumulated sleep debt over the analysis window.
        Sleep debt = sum of (optimal - actual) for each day where actual < optimal.
        """
        debt = 0.0
        for day in daily:
            sleep = day.get("sleep_hours")
            if sleep is not None and sleep < OPTIMAL_SLEEP:
                debt += OPTIMAL_SLEEP - sleep
        return debt

    @staticmethod
    def _score_sleep_recovery(daily: list[dict]) -> dict:
        """
        Score how well the user recovers sleep after poor nights.
        Looks for compensatory sleep patterns.
        """
        sleep_values = [
            d["sleep_hours"] for d in daily
            if d.get("sleep_hours") is not None
        ]

        if len(sleep_values) < 3:
            return {"score": None, "status": "insufficient_data"}

        # Find poor sleep nights and check if next night compensates
        recovery_attempts = 0
        successful_recoveries = 0

        for i in range(len(sleep_values) - 1):
            if sleep_values[i] < OPTIMAL_SLEEP - 1.5:
                recovery_attempts += 1
                if sleep_values[i + 1] >= OPTIMAL_SLEEP - 0.5:
                    successful_recoveries += 1

        if recovery_attempts == 0:
            # No poor sleep nights — good
            avg_sleep = sum(sleep_values) / len(sleep_values)
            score = min(95, 70 + avg_sleep * 3)
            return {
                "score": round(score, 1),
                "status": "good",
                "detail": "Consistent sleep pattern, no recovery needed",
            }

        recovery_rate = successful_recoveries / recovery_attempts
        score = 40 + recovery_rate * 55

        return {
            "score": round(score, 1),
            "status": "good" if score >= 65 else "needs_attention",
            "detail": (
                f"{successful_recoveries}/{recovery_attempts} "
                "poor sleep nights followed by recovery sleep"
            ),
            "recovery_rate": round(recovery_rate, 2),
        }

    @staticmethod
    def _score_stress_recovery(
        daily: list[dict],
        baseline: Optional[dict],
    ) -> dict:
        """
        Score how quickly stress levels return to baseline
        after high-stress periods.
        """
        stress_values = [
            d["stress_level"] for d in daily
            if d.get("stress_level") is not None
        ]

        if len(stress_values) < 3:
            return {"score": None, "status": "insufficient_data"}

        personal_stress = (
            baseline.get("avg_stress_level", 40)
            if baseline else 40
        )

        # Find high-stress episodes and check recovery
        high_stress_threshold = personal_stress + 20
        recovery_attempts = 0
        successful_recoveries = 0

        for i in range(len(stress_values) - 1):
            if stress_values[i] > high_stress_threshold:
                recovery_attempts += 1
                if stress_values[i + 1] <= personal_stress + 10:
                    successful_recoveries += 1

        if recovery_attempts == 0:
            avg_stress = sum(stress_values) / len(stress_values)
            score = min(95, 100 - avg_stress)
            return {
                "score": round(score, 1),
                "status": "good",
                "detail": "No high-stress episodes detected",
            }

        recovery_rate = successful_recoveries / recovery_attempts
        score = 35 + recovery_rate * 60

        return {
            "score": round(score, 1),
            "status": "good" if score >= 60 else "needs_attention",
            "detail": (
                f"Stress recovery rate: {recovery_rate:.0%} "
                f"({recovery_attempts} high-stress episode(s))"
            ),
        }

    @staticmethod
    def _score_hr_recovery(
        daily: list[dict],
        baseline: Optional[dict],
    ) -> dict:
        """
        Score how well heart rate returns to resting baseline
        after elevated periods.
        """
        hr_values = [
            d["heart_rate_bpm"] for d in daily
            if d.get("heart_rate_bpm") is not None
        ]

        if len(hr_values) < 3:
            return {"score": None, "status": "insufficient_data"}

        personal_hr = (
            baseline.get("resting_hr_bpm", 72)
            if baseline else 72
        )

        avg_hr = sum(hr_values) / len(hr_values)
        deviation = abs(avg_hr - personal_hr) / personal_hr

        # Lower deviation from baseline = better recovery
        score = max(30, 100 - deviation * 200)

        return {
            "score": round(min(score, 100), 1),
            "status": "good" if score >= 65 else "needs_attention",
            "detail": (
                f"Avg HR: {avg_hr:.0f} bpm "
                f"(baseline: {personal_hr:.0f} bpm)"
            ),
        }

    # ── Recovery velocity ────────────────────────────────────

    @staticmethod
    def _compute_recovery_velocity(
        daily: list[dict],
        baseline: Optional[dict],
    ) -> float:
        """
        Recovery velocity ∈ [0, 1]:
        How quickly metrics bounce back toward baseline
        after a perturbation.

        1.0 = immediate recovery, 0.0 = no recovery tendency.
        """
        if len(daily) < 4:
            return 0.5  # default

        # Check multiple metrics for recovery patterns
        velocities: list[float] = []

        for field, baseline_key in [
            ("heart_rate_bpm", "resting_hr_bpm"),
            ("sleep_hours", "avg_sleep_hours"),
            ("stress_level", "avg_stress_level"),
        ]:
            values = [d[field] for d in daily if d.get(field) is not None]
            if len(values) < 3:
                continue

            personal_val = (
                baseline.get(baseline_key) if baseline else None
            )
            if personal_val is None:
                personal_val = sum(values) / len(values)

            # Count how often a deviation is followed by a correction
            corrections = 0
            deviations = 0

            for i in range(len(values) - 1):
                dev = abs(values[i] - personal_val)
                if dev > personal_val * 0.1:  # > 10% deviation
                    deviations += 1
                    next_dev = abs(values[i + 1] - personal_val)
                    if next_dev < dev:
                        corrections += 1

            if deviations > 0:
                velocities.append(corrections / deviations)

        if not velocities:
            return 0.5

        return sum(velocities) / len(velocities)

    # ── Resilience ───────────────────────────────────────────

    @staticmethod
    def _compute_resilience(
        recovery_score: Optional[float],
        recovery_velocity: float,
        data_days: int,
    ) -> Optional[float]:
        """
        Resilience score = recovery ability weighted by
        consistency of tracking.
        """
        if recovery_score is None:
            return None

        # Data maturity factor
        maturity = min(data_days / 14.0, 1.0)

        resilience = (
            recovery_score * 0.6
            + recovery_velocity * 100 * 0.3
            + maturity * 10
        )
        return min(resilience, 100.0)
