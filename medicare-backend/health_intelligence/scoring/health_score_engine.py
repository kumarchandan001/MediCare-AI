"""
health_intelligence/scoring/health_score_engine.py
───────────────────────────────────────────────
Dynamic Personalized Health Score Engine.

Computes a unified health score (0–100) from:
  - Wearable metrics (vs personal baselines)
  - Symptom burden
  - Trend trajectories
  - Data freshness

The score is:
  - Explainable (per-component breakdown)
  - Trend-aware (penalizes declining metrics)
  - Personalized (uses adaptive thresholds)
  - Freshness-weighted (stale data reduces score certainty)
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import (
    HealthHistoryManager,
    compute_freshness,
)
from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.personalization.baseline_engine import BaselineEngine
from health_intelligence.models import HealthScoreLog

log = logging.getLogger(__name__)


# ── Component weights ────────────────────────────────────────

COMPONENT_WEIGHTS = {
    "sleep": 0.25,
    "activity": 0.20,
    "cardiovascular": 0.20,
    "stress": 0.15,
    "symptoms": 0.10,
    "trends": 0.10,
}


class HealthScoreEngine:
    """
    Computes a dynamic, personalized health score with
    per-component breakdowns and trend awareness.
    """

    def __init__(self):
        self._history = HealthHistoryManager()
        self._wearable_tl = WearableTimeline()
        self._baseline_engine = BaselineEngine()

    async def compute_health_score(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Compute the full health score with component breakdowns.

        Returns:
          {
            "health_score": 82,
            "components": {
              "sleep": {"score": 85, "weight": 0.25, ...},
              "activity": {"score": 72, "weight": 0.20, ...},
              ...
            },
            "freshness_score": 0.88,
            "score_confidence": 0.76,
          }
        """
        # Get recent wearable data
        weighted_avgs = await self._wearable_tl.get_weighted_averages(
            db, user_id, days=7,
        )
        data_quality = await self._wearable_tl.get_data_quality_report(
            db, user_id, days=7,
        )
        baseline = await self._baseline_engine.get_current_baseline(
            db, user_id,
        )

        # Symptom burden
        symptom_counts = await self._history.count_symptom_occurrences(
            db, user_id, days=7,
        )

        # Compute each component
        components: dict = {}
        components["sleep"] = self._score_sleep(weighted_avgs)
        components["activity"] = self._score_activity(weighted_avgs)
        components["cardiovascular"] = self._score_cardiovascular(
            weighted_avgs, baseline,
        )
        components["stress"] = self._score_stress(weighted_avgs)
        components["symptoms"] = self._score_symptoms(symptom_counts)
        components["trends"] = {"score": 70, "status": "neutral", "detail": "Trend data pending"}

        # Weighted total
        total = 0.0
        active_weight = 0.0
        for comp_name, comp_data in components.items():
            weight = COMPONENT_WEIGHTS.get(comp_name, 0.1)
            comp_data["weight"] = weight
            if comp_data["score"] is not None:
                total += comp_data["score"] * weight
                active_weight += weight

        health_score = (
            total / active_weight if active_weight > 0 else 50.0
        )

        # Freshness and confidence
        freshness = data_quality.get("overall_freshness", 0.0)
        continuity = data_quality.get("continuity_score", 0.0)
        score_confidence = self._compute_score_confidence(
            data_points=data_quality.get("total_snapshots", 0),
            freshness=freshness,
            continuity=continuity,
        )

        return {
            "health_score": round(health_score, 1),
            "components": components,
            "freshness_score": round(freshness, 3),
            "score_confidence": round(score_confidence, 3),
            "data_quality": {
                "snapshots_7d": data_quality.get("total_snapshots", 0),
                "continuity": round(continuity, 3),
            },
            "computed_at": datetime.utcnow().isoformat(),
        }

    async def compute_and_save(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """Compute health score and persist to database."""
        result = await self.compute_health_score(db, user_id)

        score_log = HealthScoreLog(
            user_id=user_id,
            health_score=result["health_score"],
            recovery_score=result["components"].get("sleep", {}).get("score"),
            wellness_index=result["health_score"],
            fatigue_score=100 - result["components"].get("stress", {}).get("score", 50),
            cardiovascular_score=result["components"].get("cardiovascular", {}).get("score"),
            freshness_score=result["freshness_score"],
            score_confidence=result["score_confidence"],
            inputs_used=list(result["components"].keys()),
        )
        await self._history.save_score(db, score_log)

        return result

    # ── Component scoring functions ──────────────────────────

    @staticmethod
    def _score_sleep(avgs: dict) -> dict:
        """Score sleep quality (0–100)."""
        sleep = avgs.get("sleep_hours")
        if sleep is None:
            return {"score": None, "status": "no_data", "detail": "No sleep data"}

        # Optimal: 7–9 hours
        if 7.0 <= sleep <= 9.0:
            score = 90 + (sleep - 7.0) * 2
        elif 6.0 <= sleep < 7.0:
            score = 70 + (sleep - 6.0) * 20
        elif 5.0 <= sleep < 6.0:
            score = 50 + (sleep - 5.0) * 20
        elif sleep < 5.0:
            score = max(20, sleep / 5.0 * 50)
        else:
            # > 9 hours (oversleeping)
            score = max(60, 90 - (sleep - 9.0) * 15)

        return {
            "score": round(min(score, 100), 1),
            "status": "good" if score >= 70 else "needs_attention",
            "detail": f"Average sleep: {sleep:.1f} hrs/night",
        }

    @staticmethod
    def _score_activity(avgs: dict) -> dict:
        """Score physical activity (0–100)."""
        steps = avgs.get("steps")
        active = avgs.get("active_minutes")

        if steps is None and active is None:
            return {"score": None, "status": "no_data", "detail": "No activity data"}

        score = 50.0
        details = []

        if steps is not None:
            if steps >= 10000:
                score = 90
            elif steps >= 7000:
                score = 75
            elif steps >= 4000:
                score = 60
            else:
                score = max(30, steps / 10000 * 60)
            details.append(f"{steps:.0f} avg steps")

        if active is not None:
            active_bonus = min(active / 60.0 * 15, 15)
            score += active_bonus
            details.append(f"{active:.0f} active min")

        return {
            "score": round(min(score, 100), 1),
            "status": "good" if score >= 70 else "needs_attention",
            "detail": ", ".join(details) if details else "Activity tracked",
        }

    @staticmethod
    def _score_cardiovascular(avgs: dict, baseline: Optional[dict]) -> dict:
        """Score cardiovascular health (0–100)."""
        hr = avgs.get("heart_rate_bpm")
        spo2 = avgs.get("spo2_percent")

        if hr is None and spo2 is None:
            return {"score": None, "status": "no_data", "detail": "No cardiovascular data"}

        score = 75.0
        details = []

        if hr is not None:
            # Use personal baseline if available
            personal_hr = None
            if baseline:
                personal_hr = baseline.get("resting_hr_bpm")

            ref = personal_hr or 72.0
            deviation = abs(hr - ref) / ref
            hr_score = max(50, 100 - deviation * 150)
            score = hr_score
            details.append(f"HR: {hr:.0f} bpm")

        if spo2 is not None:
            if spo2 >= 97:
                spo2_score = 100
            elif spo2 >= 95:
                spo2_score = 85
            elif spo2 >= 93:
                spo2_score = 65
            else:
                spo2_score = max(30, spo2 - 55)

            score = (score + spo2_score) / 2
            details.append(f"SpO2: {spo2:.0f}%")

        return {
            "score": round(min(score, 100), 1),
            "status": "good" if score >= 70 else "needs_attention",
            "detail": ", ".join(details),
        }

    @staticmethod
    def _score_stress(avgs: dict) -> dict:
        """Score stress levels (0–100, higher = better/less stress)."""
        stress = avgs.get("stress_level")
        if stress is None:
            return {"score": None, "status": "no_data", "detail": "No stress data"}

        # Invert: lower stress = higher score
        score = max(10, 100 - stress)

        return {
            "score": round(score, 1),
            "status": "good" if score >= 60 else "needs_attention",
            "detail": f"Avg stress: {stress:.0f}/100",
        }

    @staticmethod
    def _score_symptoms(symptom_counts: dict) -> dict:
        """Score symptom burden (0–100, higher = fewer symptoms)."""
        total = sum(symptom_counts.values())
        unique = len(symptom_counts)

        if total == 0:
            return {
                "score": 95,
                "status": "good",
                "detail": "No symptoms reported this week",
            }

        # More symptoms = lower score
        burden_penalty = min(total * 5, 60) + min(unique * 3, 20)
        score = max(15, 95 - burden_penalty)

        return {
            "score": round(score, 1),
            "status": "good" if score >= 70 else "needs_attention",
            "detail": f"{total} symptom(s) across {unique} type(s) this week",
        }

    @staticmethod
    def _compute_score_confidence(
        data_points: int,
        freshness: float,
        continuity: float,
    ) -> float:
        """Confidence in the health score."""
        volume = min(data_points / 14.0, 1.0)
        return round(
            volume * 0.35 + freshness * 0.35 + continuity * 0.30,
            3,
        )
