"""
health_intelligence/prevention/burnout_risk.py
───────────────────────────────────────────────
Burnout Risk Analyzer — detects the convergence of
chronic stress, poor sleep, and declining recovery
that precedes burnout.

Burnout formula:
  burnout_risk = f(stress_trend, sleep_debt, recovery_decline,
                   activity_drop, symptom_burden)

Output:
  - burnout_risk_score (0–100)
  - burnout_stage (none | early | developing | high)
  - contributing signals
  - actionable recommendations
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.history.health_history_manager import HealthHistoryManager
from health_intelligence.scoring.recovery_score import RecoveryScoreEngine
from health_intelligence.prevention.fatigue_detector import FatigueDetector

log = logging.getLogger(__name__)


class BurnoutRiskAnalyzer:
    """
    Analyzes burnout risk by combining stress patterns,
    sleep debt, recovery capacity, and fatigue signals.
    """

    def __init__(self):
        self._wearable_tl = WearableTimeline()
        self._history = HealthHistoryManager()
        self._recovery = RecoveryScoreEngine()
        self._fatigue = FatigueDetector()

    async def assess_burnout_risk(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> dict:
        """
        Comprehensive burnout risk assessment.

        Returns:
          {
            "burnout_risk_score": 58,
            "burnout_stage": "developing",
            "contributing_signals": [...],
            "recommendations": [...],
          }
        """
        signals: list[dict] = []

        # 1. Chronic stress signal
        stress_sig = await self._assess_stress_pattern(db, user_id)
        if stress_sig:
            signals.append(stress_sig)

        # 2. Sleep debt signal
        sleep_sig = await self._assess_sleep_debt(db, user_id)
        if sleep_sig:
            signals.append(sleep_sig)

        # 3. Recovery decline signal
        recovery_sig = await self._assess_recovery_decline(db, user_id)
        if recovery_sig:
            signals.append(recovery_sig)

        # 4. Activity withdrawal signal
        activity_sig = await self._assess_activity_withdrawal(db, user_id)
        if activity_sig:
            signals.append(activity_sig)

        # 5. Fatigue signal
        fatigue_data = await self._fatigue.assess_fatigue(db, user_id)
        fatigue_score = fatigue_data.get("fatigue_score", 0)
        if fatigue_score > 40:
            signals.append({
                "signal": "fatigue_accumulation",
                "weight": round(fatigue_score, 1),
                "message": (
                    f"Fatigue score: {fatigue_score:.0f}/100 — "
                    "chronic fatigue amplifies burnout risk."
                ),
            })

        # Composite burnout risk
        if not signals:
            return {
                "burnout_risk_score": 10,
                "burnout_stage": "none",
                "contributing_signals": [],
                "recommendations": [
                    "No burnout risk indicators detected. "
                    "Maintain your current healthy patterns."
                ],
                "assessed_at": datetime.utcnow().isoformat(),
            }

        weights = [s["weight"] for s in signals]
        burnout_score = sum(weights) / len(weights)

        # Amplify if multiple signals converge
        if len(signals) >= 3:
            burnout_score = min(100, burnout_score * 1.25)
        if len(signals) >= 4:
            burnout_score = min(100, burnout_score * 1.1)

        # Stage classification
        if burnout_score >= 70:
            stage = "high"
        elif burnout_score >= 45:
            stage = "developing"
        elif burnout_score >= 25:
            stage = "early"
        else:
            stage = "none"

        recommendations = self._generate_recommendations(
            signals, stage, burnout_score,
        )

        return {
            "burnout_risk_score": round(burnout_score, 1),
            "burnout_stage": stage,
            "contributing_signals": signals,
            "signal_count": len(signals),
            "recommendations": recommendations,
            "assessed_at": datetime.utcnow().isoformat(),
        }

    # ── Signal assessments ───────────────────────────────────

    async def _assess_stress_pattern(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=14,
        )
        stress_vals = [
            d["stress_level"] for d in daily
            if d.get("stress_level") is not None
        ]
        if len(stress_vals) < 5:
            return None

        avg = sum(stress_vals) / len(stress_vals)
        high_days = sum(1 for s in stress_vals if s > 65)
        high_ratio = high_days / len(stress_vals)

        if avg > 55 or high_ratio > 0.4:
            weight = min(90, 30 + avg * 0.5 + high_ratio * 40)
            return {
                "signal": "chronic_stress",
                "weight": round(weight, 1),
                "message": (
                    f"Sustained high stress (avg {avg:.0f}/100, "
                    f"{high_days}/{len(stress_vals)} high-stress days). "
                    "Chronic stress is the primary driver of burnout."
                ),
            }
        return None

    async def _assess_sleep_debt(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        recovery = await self._recovery.compute_recovery_score(
            db, user_id,
        )
        debt = recovery.get("sleep_debt_hours", 0)
        if debt and debt > 4:
            weight = min(85, 25 + debt * 5)
            return {
                "signal": "sleep_debt",
                "weight": round(weight, 1),
                "message": (
                    f"Sleep debt of {debt:.1f} hours accumulated. "
                    "Insufficient sleep impairs recovery and "
                    "accelerates burnout."
                ),
            }
        return None

    async def _assess_recovery_decline(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        recovery = await self._recovery.compute_recovery_score(
            db, user_id,
        )
        rec_score = recovery.get("recovery_score")
        velocity = recovery.get("recovery_velocity", 0.5)

        if rec_score is not None and rec_score < 50:
            weight = min(80, 100 - rec_score)
            return {
                "signal": "recovery_decline",
                "weight": round(weight, 1),
                "message": (
                    f"Recovery score is low ({rec_score:.0f}/100) "
                    f"with recovery velocity at {velocity:.2f}. "
                    "Poor recovery capacity is a hallmark of burnout."
                ),
            }
        return None

    async def _assess_activity_withdrawal(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=14,
        )
        step_vals = [
            d["steps"] for d in daily
            if d.get("steps") is not None
        ]
        if len(step_vals) < 5:
            return None

        mid = len(step_vals) // 2
        early_avg = sum(step_vals[:mid]) / mid
        recent_avg = sum(step_vals[mid:]) / (len(step_vals) - mid)

        if early_avg > 0 and recent_avg < early_avg * 0.7:
            decline = ((early_avg - recent_avg) / early_avg) * 100
            weight = min(75, 20 + decline * 0.8)
            return {
                "signal": "activity_withdrawal",
                "weight": round(weight, 1),
                "message": (
                    f"Physical activity dropped {decline:.0f}% recently. "
                    "Social and physical withdrawal often accompanies "
                    "developing burnout."
                ),
            }
        return None

    # ── Recommendations ──────────────────────────────────────

    @staticmethod
    def _generate_recommendations(
        signals: list[dict],
        stage: str,
        score: float,
    ) -> list[str]:
        recs: list[str] = []
        signal_types = {s["signal"] for s in signals}

        if stage == "high":
            recs.append(
                "⚠️ High burnout risk detected. Strongly consider "
                "taking a rest day and speaking with a healthcare "
                "professional or counselor."
            )

        if "chronic_stress" in signal_types:
            recs.append(
                "Schedule regular breaks throughout the day. "
                "Even 5 minutes of deep breathing can help."
            )

        if "sleep_debt" in signal_types:
            recs.append(
                "Make sleep a non-negotiable priority. "
                "Set a consistent bedtime and avoid caffeine after 2 PM."
            )

        if "recovery_decline" in signal_types:
            recs.append(
                "Your body is struggling to recover. Reduce intensity "
                "of commitments temporarily and increase rest time."
            )

        if "activity_withdrawal" in signal_types:
            recs.append(
                "Try to maintain gentle physical activity — "
                "a short walk outdoors can improve mood and energy."
            )

        if "fatigue_accumulation" in signal_types:
            recs.append(
                "Chronic fatigue is building. Identify and eliminate "
                "non-essential drains on your energy."
            )

        if stage == "developing":
            recs.append(
                "Early burnout indicators present. Address these "
                "patterns now to prevent progression."
            )

        return recs if recs else [
            "Continue monitoring your health patterns."
        ]
