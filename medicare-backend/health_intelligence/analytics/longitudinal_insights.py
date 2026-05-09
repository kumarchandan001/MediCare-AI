"""
health_intelligence/analytics/longitudinal_insights.py
───────────────────────────────────────────────
Longitudinal Insights Engine — generates high-level
personalized health summaries from all intelligence
modules.

Examples:
  "Your recovery trend improved this week."
  "Stress levels have stabilized."
  "Sleep consistency improved by 14%."
  "Repeated fatigue symptoms detected over 10 days."

Each insight includes a reliability score reflecting
how trustworthy the underlying data is.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.trends.trend_analyzer import TrendAnalyzer
from health_intelligence.trends.progression_engine import ProgressionEngine
from health_intelligence.scoring.health_score_engine import HealthScoreEngine
from health_intelligence.scoring.recovery_score import RecoveryScoreEngine
from health_intelligence.scoring.wellness_index import WellnessIndex
from health_intelligence.prevention.fatigue_detector import FatigueDetector
from health_intelligence.prevention.burnout_risk import BurnoutRiskAnalyzer
from health_intelligence.personalization.profile_learning import ProfileLearner
from health_intelligence.history.symptom_timeline import SymptomTimeline
from health_intelligence.history.health_history_manager import HealthHistoryManager

log = logging.getLogger(__name__)


class LongitudinalInsightsEngine:
    """
    Aggregates outputs from all intelligence modules into
    a unified, human-readable personalized health summary.
    """

    def __init__(self):
        self._trends = TrendAnalyzer()
        self._progression = ProgressionEngine()
        self._health_score = HealthScoreEngine()
        self._recovery = RecoveryScoreEngine()
        self._wellness = WellnessIndex()
        self._fatigue = FatigueDetector()
        self._burnout = BurnoutRiskAnalyzer()
        self._profile = ProfileLearner()
        self._symptom_tl = SymptomTimeline()
        self._history = HealthHistoryManager()

    async def generate_insights(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Generate a comprehensive personalized insight report.

        Returns:
          {
            "insights": [
              {"category": "...", "message": "...", "reliability": 0.8},
              ...
            ],
            "scores_snapshot": {...},
            "profile_confidence": {...},
          }
        """
        insights: list[dict] = []

        # ── Profile confidence ───────────────────────────────
        profile_conf = await self._profile.get_profile_confidence(
            db, user_id,
        )
        reliability = profile_conf.get("insight_reliability", 0.5)

        # ── Trend-based insights ─────────────────────────────
        trend_insights = await self._generate_trend_insights(
            db, user_id, reliability,
        )
        insights.extend(trend_insights)

        # ── Score-based insights ─────────────────────────────
        score_insights = await self._generate_score_insights(
            db, user_id, reliability,
        )
        insights.extend(score_insights)

        # ── Recovery insights ────────────────────────────────
        recovery_insights = await self._generate_recovery_insights(
            db, user_id, reliability,
        )
        insights.extend(recovery_insights)

        # ── Prevention insights ──────────────────────────────
        prevention_insights = await self._generate_prevention_insights(
            db, user_id, reliability,
        )
        insights.extend(prevention_insights)

        # ── Symptom insights ─────────────────────────────────
        symptom_insights = await self._generate_symptom_insights(
            db, user_id, reliability,
        )
        insights.extend(symptom_insights)

        # ── Data quality insights ────────────────────────────
        for rec in profile_conf.get("recommendations", []):
            insights.append({
                "category": "data_quality",
                "message": rec,
                "reliability": 1.0,
                "priority": "info",
            })

        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        insights.sort(
            key=lambda x: priority_order.get(x.get("priority", "low"), 3),
        )

        # Scores snapshot
        health = await self._health_score.compute_health_score(db, user_id)
        wellness = await self._wellness.compute_wellness_index(db, user_id)

        return {
            "insights": insights,
            "total_insights": len(insights),
            "scores_snapshot": {
                "health_score": health.get("health_score"),
                "wellness_index": wellness.get("wellness_index"),
                "score_confidence": health.get("score_confidence"),
            },
            "profile_confidence": {
                "baseline": profile_conf.get("baseline_confidence"),
                "trend": profile_conf.get("trend_confidence"),
                "insight_reliability": reliability,
            },
            "generated_at": datetime.utcnow().isoformat(),
        }

    # ── Trend insights ───────────────────────────────────────

    async def _generate_trend_insights(
        self,
        db: AsyncSession,
        user_id: int,
        reliability: float,
    ) -> list[dict]:
        insights: list[dict] = []
        all_trends = await self._trends.analyze_all_trends(
            db, user_id, days=14,
        )

        for trend in all_trends.get("trends", []):
            direction = trend.get("direction")
            display = trend.get("display_name", trend["metric"])
            change = trend.get("change_pct", 0)
            conf = trend.get("trend_confidence", 0.5)

            if direction == "improving" and abs(change) > 10:
                insights.append({
                    "category": "trend",
                    "message": (
                        f"{display} improved by {abs(change):.0f}% "
                        "over the past 2 weeks. Great progress!"
                    ),
                    "reliability": round(conf * reliability, 3),
                    "priority": "low",
                })
            elif direction == "declining" and abs(change) > 10:
                priority = "high" if abs(change) > 25 else "medium"
                insights.append({
                    "category": "trend",
                    "message": (
                        f"{display} declined by {abs(change):.0f}% "
                        "over the past 2 weeks. Consider taking action."
                    ),
                    "reliability": round(conf * reliability, 3),
                    "priority": priority,
                })

        det = all_trends.get("deterioration_score", 0)
        if det > 30:
            insights.append({
                "category": "trend",
                "message": (
                    "Multiple health metrics are declining together. "
                    "This pattern warrants attention."
                ),
                "reliability": round(reliability * 0.8, 3),
                "priority": "high",
            })

        return insights

    # ── Score insights ───────────────────────────────────────

    async def _generate_score_insights(
        self,
        db: AsyncSession,
        user_id: int,
        reliability: float,
    ) -> list[dict]:
        insights: list[dict] = []
        health = await self._health_score.compute_health_score(db, user_id)
        score = health.get("health_score")

        if score is not None:
            if score >= 80:
                insights.append({
                    "category": "score",
                    "message": (
                        f"Your health score is {score:.0f}/100 — "
                        "you're in great shape! Keep it up."
                    ),
                    "reliability": round(reliability, 3),
                    "priority": "low",
                })
            elif score < 50:
                insights.append({
                    "category": "score",
                    "message": (
                        f"Your health score is {score:.0f}/100. "
                        "Several areas need attention."
                    ),
                    "reliability": round(reliability, 3),
                    "priority": "high",
                })

            # Component-specific insights
            for comp_name, comp_data in health.get("components", {}).items():
                comp_score = comp_data.get("score")
                if comp_score is not None and comp_score < 50:
                    display = comp_name.replace("_", " ").title()
                    insights.append({
                        "category": "score",
                        "message": (
                            f"{display} score is low ({comp_score:.0f}/100): "
                            f"{comp_data.get('detail', '')}"
                        ),
                        "reliability": round(reliability, 3),
                        "priority": "medium",
                    })

        return insights

    # ── Recovery insights ────────────────────────────────────

    async def _generate_recovery_insights(
        self,
        db: AsyncSession,
        user_id: int,
        reliability: float,
    ) -> list[dict]:
        insights: list[dict] = []
        recovery = await self._recovery.compute_recovery_score(db, user_id)

        rec_score = recovery.get("recovery_score")
        if rec_score is not None:
            if rec_score >= 75:
                insights.append({
                    "category": "recovery",
                    "message": "Your recovery metrics are strong — your body is bouncing back well.",
                    "reliability": round(reliability * 0.9, 3),
                    "priority": "low",
                })
            elif rec_score < 45:
                insights.append({
                    "category": "recovery",
                    "message": (
                        f"Recovery score is {rec_score:.0f}/100. "
                        "Your body may need more rest time."
                    ),
                    "reliability": round(reliability * 0.9, 3),
                    "priority": "high",
                })

        debt = recovery.get("sleep_debt_hours", 0)
        if debt and debt > 5:
            insights.append({
                "category": "recovery",
                "message": (
                    f"You've accumulated {debt:.1f} hours of sleep debt. "
                    "Try to catch up with consistent 8-hour nights."
                ),
                "reliability": round(reliability, 3),
                "priority": "medium",
            })

        return insights

    # ── Prevention insights ──────────────────────────────────

    async def _generate_prevention_insights(
        self,
        db: AsyncSession,
        user_id: int,
        reliability: float,
    ) -> list[dict]:
        insights: list[dict] = []

        fatigue = await self._fatigue.assess_fatigue(db, user_id)
        if fatigue.get("fatigue_level") in ("moderate", "high"):
            insights.append({
                "category": "prevention",
                "message": (
                    f"Fatigue level: {fatigue['fatigue_level']}. "
                    f"Score: {fatigue.get('fatigue_score', 0):.0f}/100. "
                    "Consider adjusting your routine."
                ),
                "reliability": round(reliability * 0.85, 3),
                "priority": "high" if fatigue["fatigue_level"] == "high" else "medium",
            })

        burnout = await self._burnout.assess_burnout_risk(db, user_id)
        if burnout.get("burnout_stage") in ("developing", "high"):
            insights.append({
                "category": "prevention",
                "message": (
                    f"Burnout risk: {burnout['burnout_stage']}. "
                    f"Risk score: {burnout.get('burnout_risk_score', 0):.0f}/100. "
                    "Take preventive action now."
                ),
                "reliability": round(reliability * 0.8, 3),
                "priority": "critical" if burnout["burnout_stage"] == "high" else "high",
            })

        return insights

    # ── Symptom insights ─────────────────────────────────────

    async def _generate_symptom_insights(
        self,
        db: AsyncSession,
        user_id: int,
        reliability: float,
    ) -> list[dict]:
        insights: list[dict] = []
        freqs = await self._symptom_tl.get_weighted_symptom_frequencies(
            db, user_id, days=14,
        )

        recurring = [s for s in freqs if s["raw_count"] >= 3]
        if recurring:
            names = [s["display_name"] for s in recurring[:3]]
            insights.append({
                "category": "symptoms",
                "message": (
                    f"Recurring symptoms detected over 2 weeks: "
                    f"{', '.join(names)}. "
                    "Persistent symptoms may warrant a check-up."
                ),
                "reliability": round(reliability, 3),
                "priority": "medium",
            })

        return insights
