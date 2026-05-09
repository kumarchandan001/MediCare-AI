"""
health_intelligence/prevention/fatigue_detector.py
───────────────────────────────────────────────
Chronic Fatigue Accumulation Detector — identifies
progressive fatigue patterns before they become debilitating.

Signals:
  - Declining sleep quality over multiple days
  - Increasing stress without recovery
  - Dropping activity levels
  - Repeated fatigue-related symptoms
  - Poor recovery velocity
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import HealthHistoryManager
from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.history.symptom_timeline import SymptomTimeline

log = logging.getLogger(__name__)

FATIGUE_SYMPTOMS = {
    "fatigue", "lethargy", "weakness_in_limbs", "muscle_weakness",
    "lack_of_concentration", "restlessness", "malaise",
    "mood_swings", "depression", "headache",
}


class FatigueDetector:
    """
    Detects chronic fatigue accumulation patterns from
    wearable data and symptom history.
    """

    def __init__(self):
        self._history = HealthHistoryManager()
        self._wearable_tl = WearableTimeline()
        self._symptom_tl = SymptomTimeline()

    async def assess_fatigue(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Comprehensive fatigue assessment.

        Returns:
          {
            "fatigue_score": 62,
            "fatigue_level": "moderate",
            "signals": [...],
            "recommendations": [...],
          }
        """
        signals: list[dict] = []

        # 1. Sleep signal
        sleep_signal = await self._check_sleep_fatigue(db, user_id)
        if sleep_signal:
            signals.append(sleep_signal)

        # 2. Activity decline signal
        activity_signal = await self._check_activity_decline(db, user_id)
        if activity_signal:
            signals.append(activity_signal)

        # 3. Stress accumulation signal
        stress_signal = await self._check_stress_accumulation(db, user_id)
        if stress_signal:
            signals.append(stress_signal)

        # 4. Fatigue symptoms signal
        symptom_signal = await self._check_fatigue_symptoms(db, user_id)
        if symptom_signal:
            signals.append(symptom_signal)

        # Composite fatigue score
        if not signals:
            return {
                "fatigue_score": 15,
                "fatigue_level": "low",
                "signals": [],
                "recommendations": [
                    "No fatigue indicators detected. Keep it up!"
                ],
            }

        signal_scores = [s["severity_score"] for s in signals]
        fatigue_score = sum(signal_scores) / len(signal_scores)

        if fatigue_score >= 70:
            level = "high"
        elif fatigue_score >= 45:
            level = "moderate"
        else:
            level = "low"

        recommendations = self._generate_recommendations(signals, level)

        return {
            "fatigue_score": round(fatigue_score, 1),
            "fatigue_level": level,
            "signals": signals,
            "recommendations": recommendations,
            "assessed_at": datetime.utcnow().isoformat(),
        }

    # ── Signal checks ────────────────────────────────────────

    async def _check_sleep_fatigue(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        """Check for sleep-driven fatigue."""
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=7,
        )

        sleep_values = [
            d["sleep_hours"] for d in daily
            if d.get("sleep_hours") is not None
        ]

        if len(sleep_values) < 3:
            return None

        avg_sleep = sum(sleep_values) / len(sleep_values)
        poor_nights = sum(1 for s in sleep_values if s < 6.0)

        if avg_sleep < 6.0 or poor_nights >= 3:
            severity = min(90, 40 + poor_nights * 10 + (6.5 - avg_sleep) * 15)
            return {
                "signal": "sleep_deficit",
                "severity_score": round(severity, 1),
                "message": (
                    f"Average sleep of {avg_sleep:.1f} hrs with "
                    f"{poor_nights} poor night(s) this week "
                    "contributes to fatigue accumulation."
                ),
            }

        return None

    async def _check_activity_decline(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        """Check for declining physical activity."""
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=14,
        )

        step_values = [
            d["steps"] for d in daily
            if d.get("steps") is not None
        ]

        if len(step_values) < 5:
            return None

        mid = len(step_values) // 2
        first_half = sum(step_values[:mid]) / mid
        second_half = sum(step_values[mid:]) / (len(step_values) - mid)

        if second_half < first_half * 0.75:
            decline_pct = ((first_half - second_half) / first_half) * 100
            severity = min(80, 30 + decline_pct)
            return {
                "signal": "activity_decline",
                "severity_score": round(severity, 1),
                "message": (
                    f"Activity dropped {decline_pct:.0f}% recently "
                    f"(from {first_half:.0f} to {second_half:.0f} avg steps). "
                    "Reduced activity can accelerate fatigue."
                ),
            }

        return None

    async def _check_stress_accumulation(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        """Check for sustained high stress."""
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=7,
        )

        stress_values = [
            d["stress_level"] for d in daily
            if d.get("stress_level") is not None
        ]

        if len(stress_values) < 3:
            return None

        avg_stress = sum(stress_values) / len(stress_values)
        high_days = sum(1 for s in stress_values if s > 60)

        if avg_stress > 55 or high_days >= 3:
            severity = min(85, 30 + avg_stress * 0.5 + high_days * 5)
            return {
                "signal": "stress_accumulation",
                "severity_score": round(severity, 1),
                "message": (
                    f"Elevated stress (avg {avg_stress:.0f}/100) with "
                    f"{high_days} high-stress day(s) this week. "
                    "Sustained stress contributes to chronic fatigue."
                ),
            }

        return None

    async def _check_fatigue_symptoms(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        """Check for fatigue-related symptom reports."""
        symptom_freqs = await self._symptom_tl.get_weighted_symptom_frequencies(
            db, user_id, days=14,
        )

        fatigue_hits = [
            s for s in symptom_freqs
            if s["symptom"] in FATIGUE_SYMPTOMS
        ]

        if not fatigue_hits:
            return None

        total_count = sum(s["raw_count"] for s in fatigue_hits)
        if total_count >= 3:
            severity = min(80, 35 + total_count * 8)
            names = [s["display_name"] for s in fatigue_hits[:3]]
            return {
                "signal": "fatigue_symptoms",
                "severity_score": round(severity, 1),
                "message": (
                    f"Fatigue-related symptoms reported {total_count} "
                    f"time(s) in 2 weeks: {', '.join(names)}. "
                    "This suggests progressive fatigue."
                ),
            }

        return None

    # ── Recommendations ──────────────────────────────────────

    @staticmethod
    def _generate_recommendations(
        signals: list[dict],
        level: str,
    ) -> list[str]:
        recs: list[str] = []
        signal_types = {s["signal"] for s in signals}

        if "sleep_deficit" in signal_types:
            recs.append(
                "Prioritize sleep — aim for 7–8 hours consistently. "
                "Avoid screens 1 hour before bed."
            )

        if "activity_decline" in signal_types:
            recs.append(
                "Increase light activity — even a 20-minute walk "
                "can reduce fatigue and improve energy."
            )

        if "stress_accumulation" in signal_types:
            recs.append(
                "Incorporate stress management: deep breathing, "
                "short breaks, or meditation."
            )

        if "fatigue_symptoms" in signal_types:
            recs.append(
                "Repeated fatigue symptoms may indicate an underlying "
                "issue. Consider consulting a healthcare professional."
            )

        if level == "high":
            recs.append(
                "⚠️ Multiple fatigue signals detected. Rest and "
                "recovery should be your top priority this week."
            )

        return recs
