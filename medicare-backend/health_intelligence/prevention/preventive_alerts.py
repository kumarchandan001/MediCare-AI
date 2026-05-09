"""
health_intelligence/prevention/preventive_alerts.py
───────────────────────────────────────────────
Preventive Intelligence Alert Generator — detects early
health deterioration BEFORE severe symptoms occur.

Generates actionable alerts like:
  "Burnout risk increasing."
  "Low recovery trend identified."
  "Stress + poor sleep may increase illness susceptibility."

Alert types:
  - trend_degradation
  - sleep_debt
  - anomaly_persistent
  - low_recovery
  - combined_risk
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.health_history_manager import HealthHistoryManager
from health_intelligence.trends.trend_analyzer import TrendAnalyzer
from health_intelligence.trends.anomaly_detector import AnomalyDetector
from health_intelligence.scoring.recovery_score import RecoveryScoreEngine
from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.models import PreventiveAlertLog

log = logging.getLogger(__name__)


class PreventiveAlertEngine:
    """
    Generates actionable preventive health alerts by
    combining trend analysis, anomaly detection, and
    recovery assessment.
    """

    def __init__(self):
        self._history = HealthHistoryManager()
        self._trend = TrendAnalyzer()
        self._anomaly = AnomalyDetector()
        self._recovery = RecoveryScoreEngine()
        self._wearable_tl = WearableTimeline()

    async def generate_alerts(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        """
        Run all preventive checks and generate alerts.

        Returns a list of alert dicts, each with:
          - alert_type, severity, title, message,
            contributing_factors, confidence
        """
        alerts: list[dict] = []

        # 1. Trend degradation alerts
        alerts.extend(
            await self._check_trend_degradation(db, user_id)
        )

        # 2. Sleep debt alerts
        alerts.extend(
            await self._check_sleep_debt(db, user_id)
        )

        # 3. Low recovery alerts
        alerts.extend(
            await self._check_low_recovery(db, user_id)
        )

        # 4. Combined risk alerts
        alerts.extend(
            await self._check_combined_risks(db, user_id)
        )

        # Persist new alerts
        for alert_data in alerts:
            alert_log = PreventiveAlertLog(
                user_id=user_id,
                alert_type=alert_data["alert_type"],
                severity=alert_data["severity"],
                title=alert_data["title"],
                message=alert_data["message"],
                contributing_factors=alert_data.get("contributing_factors"),
                confidence=alert_data.get("confidence", 0.5),
            )
            await self._history.save_preventive_alert(db, alert_log)

        return alerts

    async def get_active_alerts(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        """
        Get recent unacknowledged preventive alerts.
        """
        alert_logs = await self._history.get_preventive_alerts(
            db, user_id, days=7, only_unacknowledged=True,
        )
        return [
            {
                "id": a.id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "title": a.title,
                "message": a.message,
                "contributing_factors": a.contributing_factors,
                "confidence": a.confidence,
                "recorded_at": a.recorded_at.isoformat() if a.recorded_at else None,
            }
            for a in alert_logs
        ]

    # ── Trend degradation ────────────────────────────────────

    async def _check_trend_degradation(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        alerts: list[dict] = []
        all_trends = await self._trend.analyze_all_trends(
            db, user_id, days=14,
        )

        for trend in all_trends.get("significant_changes", []):
            if trend["direction"] == "declining":
                display = trend.get("display_name", trend["metric"])
                change = abs(trend.get("change_pct", 0))
                conf = trend.get("trend_confidence", 0.5)

                severity = "high" if change > 25 else "moderate"

                alerts.append({
                    "alert_type": "trend_degradation",
                    "severity": severity,
                    "title": f"{display} Declining",
                    "message": (
                        f"{display} has declined by {change:.0f}% "
                        f"over the past 14 days. Consider addressing "
                        "this trend before it worsens."
                    ),
                    "contributing_factors": [
                        f"{display} change: -{change:.0f}%",
                    ],
                    "confidence": round(conf, 3),
                })

        # Overall deterioration
        det_score = all_trends.get("deterioration_score", 0)
        if det_score > 40:
            alerts.append({
                "alert_type": "trend_degradation",
                "severity": "high",
                "title": "Multiple Health Metrics Declining",
                "message": (
                    "Several health metrics are declining simultaneously. "
                    "This pattern may indicate accumulating health stress."
                ),
                "contributing_factors": [
                    f"Deterioration score: {det_score:.0f}/100",
                    f"{len(all_trends.get('significant_changes', []))} metrics changing",
                ],
                "confidence": 0.7,
            })

        return alerts

    # ── Sleep debt ───────────────────────────────────────────

    async def _check_sleep_debt(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        alerts: list[dict] = []
        recovery = await self._recovery.compute_recovery_score(
            db, user_id,
        )

        sleep_debt = recovery.get("sleep_debt_hours", 0)
        if sleep_debt and sleep_debt > 5:
            severity = "high" if sleep_debt > 10 else "moderate"
            alerts.append({
                "alert_type": "sleep_debt",
                "severity": severity,
                "title": "Sleep Debt Accumulating",
                "message": (
                    f"You have accumulated {sleep_debt:.1f} hours of "
                    "sleep debt over the past 2 weeks. Chronic sleep "
                    "deficit increases fatigue and health risk."
                ),
                "contributing_factors": [
                    f"Sleep debt: {sleep_debt:.1f} hours",
                ],
                "confidence": 0.8,
            })

        return alerts

    # ── Low recovery ─────────────────────────────────────────

    async def _check_low_recovery(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        alerts: list[dict] = []
        recovery = await self._recovery.compute_recovery_score(
            db, user_id,
        )

        rec_score = recovery.get("recovery_score")
        if rec_score is not None and rec_score < 50:
            alerts.append({
                "alert_type": "low_recovery",
                "severity": "moderate",
                "title": "Low Recovery Detected",
                "message": (
                    "Your recovery metrics suggest your body is "
                    "struggling to bounce back from daily stressors. "
                    "Prioritize rest and recovery."
                ),
                "contributing_factors": [
                    f"Recovery score: {rec_score:.0f}/100",
                    f"Recovery velocity: {recovery.get('recovery_velocity', 0):.2f}",
                ],
                "confidence": 0.65,
            })

        resilience = recovery.get("resilience_score")
        if resilience is not None and resilience < 45:
            alerts.append({
                "alert_type": "low_recovery",
                "severity": "moderate",
                "title": "Low Resilience Trend",
                "message": (
                    "Your resilience score indicates reduced ability "
                    "to recover from health perturbations. Consider "
                    "improving sleep and reducing stress."
                ),
                "contributing_factors": [
                    f"Resilience score: {resilience:.0f}/100",
                ],
                "confidence": 0.6,
            })

        return alerts

    # ── Combined risk ────────────────────────────────────────

    async def _check_combined_risks(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[dict]:
        alerts: list[dict] = []
        weighted = await self._wearable_tl.get_weighted_averages(
            db, user_id, days=7,
        )

        stress = weighted.get("stress_level")
        sleep = weighted.get("sleep_hours")

        # High stress + poor sleep → illness susceptibility
        if stress is not None and sleep is not None:
            if stress > 65 and sleep < 6:
                alerts.append({
                    "alert_type": "combined_risk",
                    "severity": "high",
                    "title": "Stress + Poor Sleep Warning",
                    "message": (
                        "High stress combined with insufficient sleep "
                        "significantly increases illness susceptibility. "
                        "This combination is a leading predictor of "
                        "health decline."
                    ),
                    "contributing_factors": [
                        f"Avg stress: {stress:.0f}/100",
                        f"Avg sleep: {sleep:.1f} hrs",
                    ],
                    "confidence": 0.75,
                })

        # Low activity + high stress → deconditioning risk
        steps = weighted.get("steps")
        if steps is not None and stress is not None:
            if steps < 3000 and stress > 60:
                alerts.append({
                    "alert_type": "combined_risk",
                    "severity": "moderate",
                    "title": "Inactivity + Stress Risk",
                    "message": (
                        "Low physical activity combined with elevated "
                        "stress may accelerate health decline. Even light "
                        "walking can help manage stress."
                    ),
                    "contributing_factors": [
                        f"Avg steps: {steps:.0f}",
                        f"Avg stress: {stress:.0f}/100",
                    ],
                    "confidence": 0.65,
                })

        return alerts
