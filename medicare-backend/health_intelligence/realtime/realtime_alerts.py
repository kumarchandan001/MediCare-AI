"""
health_intelligence/realtime/realtime_alerts.py
───────────────────────────────────────────────
Real-time alert engine with alert fatigue prevention.

Features:
  - Severity escalation chains
  - Cooldown logic (no repeat alerts within window)
  - Alert deduplication
  - Adaptive suppression (suppress low-severity during calm)
  - Context-aware prioritization
  - Confidence-scored alerts
  - Explainable contributing signals
"""

import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

log = logging.getLogger(__name__)

# Cooldown windows per severity (seconds)
COOLDOWN_SECONDS = {
    "critical": 120,      # 2 min
    "high": 300,          # 5 min
    "moderate": 600,      # 10 min
    "low": 1800,          # 30 min
    "info": 3600,         # 1 hour
}

# Maximum active alerts per user before suppression
MAX_ACTIVE_ALERTS = 10


@dataclass
class RealtimeAlert:
    """A single real-time health alert."""
    alert_id: str
    user_id: int
    alert_type: str
    severity: str
    title: str
    message: str
    contributing_signals: dict[str, Any]
    contextual_reasoning: str
    threshold_explanation: str
    confidence: float
    created_at: float = field(default_factory=time.time)
    acknowledged: bool = False
    suppressed: bool = False
    escalated_from: Optional[str] = None


class RealtimeAlertEngine:
    """
    Generates real-time adaptive alerts with fatigue
    prevention and explainable reasoning.
    """

    def __init__(self):
        # user_id → alert_type → last alert timestamp
        self._cooldowns: dict[int, dict[str, float]] = defaultdict(dict)
        # user_id → list of active alerts
        self._active: dict[int, list[RealtimeAlert]] = defaultdict(list)
        # user_id → alert_type → escalation count
        self._escalation: dict[int, dict[str, int]] = defaultdict(
            lambda: defaultdict(int),
        )
        self._alert_counter = 0

    # ── Alert generation ─────────────────────────────────────

    def generate_alert(
        self,
        user_id: int,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        contributing_signals: Optional[dict] = None,
        contextual_reasoning: str = "",
        threshold_explanation: str = "",
        confidence: float = 0.5,
    ) -> Optional[RealtimeAlert]:
        """
        Generate an alert if it passes fatigue prevention checks.
        Returns None if the alert is suppressed.
        """
        # 1. Cooldown check
        if self._is_on_cooldown(user_id, alert_type, severity):
            log.debug(
                "Alert suppressed (cooldown): %s for user %d",
                alert_type, user_id,
            )
            return None

        # 2. Deduplication check
        if self._is_duplicate(user_id, alert_type, title):
            log.debug(
                "Alert suppressed (duplicate): %s for user %d",
                alert_type, user_id,
            )
            return None

        # 3. Max active alerts check
        active = self._active.get(user_id, [])
        if len(active) >= MAX_ACTIVE_ALERTS and severity not in ("critical", "high"):
            log.debug(
                "Alert suppressed (max active): %s for user %d",
                alert_type, user_id,
            )
            return None

        # 4. Escalation check
        escalation_count = self._escalation[user_id][alert_type]
        escalated_from = None
        if escalation_count >= 3 and severity == "moderate":
            severity = "high"
            escalated_from = "moderate"
            message += " (Escalated: recurring pattern detected.)"

        # 5. Create alert
        self._alert_counter += 1
        alert = RealtimeAlert(
            alert_id=f"rt-{user_id}-{self._alert_counter}",
            user_id=user_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            contributing_signals=contributing_signals or {},
            contextual_reasoning=contextual_reasoning,
            threshold_explanation=threshold_explanation,
            confidence=confidence,
            escalated_from=escalated_from,
        )

        # Track
        self._active[user_id].append(alert)
        self._cooldowns[user_id][alert_type] = time.time()
        self._escalation[user_id][alert_type] += 1

        # Prune old alerts
        self._prune_old_alerts(user_id)

        return alert

    # ── Alert management ─────────────────────────────────────

    def acknowledge_alert(
        self,
        user_id: int,
        alert_id: str,
    ) -> bool:
        """Mark an alert as acknowledged."""
        for alert in self._active.get(user_id, []):
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                return True
        return False

    def get_active_alerts(
        self,
        user_id: int,
        severity_filter: Optional[str] = None,
    ) -> list[dict]:
        """Get all active (unacknowledged) alerts for a user."""
        alerts = [
            a for a in self._active.get(user_id, [])
            if not a.acknowledged and not a.suppressed
        ]

        if severity_filter:
            alerts = [a for a in alerts if a.severity == severity_filter]

        return [
            {
                "alert_id": a.alert_id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "title": a.title,
                "message": a.message,
                "contributing_signals": a.contributing_signals,
                "contextual_reasoning": a.contextual_reasoning,
                "threshold_explanation": a.threshold_explanation,
                "confidence": a.confidence,
                "created_at": datetime.fromtimestamp(a.created_at).isoformat(),
                "escalated_from": a.escalated_from,
            }
            for a in alerts
        ]

    def clear_alerts(self, user_id: int) -> int:
        """Clear all alerts for a user. Returns count cleared."""
        count = len(self._active.get(user_id, []))
        self._active[user_id] = []
        self._escalation[user_id] = defaultdict(int)
        return count

    # ── Fatigue prevention internals ─────────────────────────

    def _is_on_cooldown(
        self,
        user_id: int,
        alert_type: str,
        severity: str,
    ) -> bool:
        """Check if an alert type is still in cooldown."""
        last = self._cooldowns.get(user_id, {}).get(alert_type, 0)
        cooldown = COOLDOWN_SECONDS.get(severity, 600)
        return (time.time() - last) < cooldown

    def _is_duplicate(
        self,
        user_id: int,
        alert_type: str,
        title: str,
    ) -> bool:
        """Check if an identical alert is already active."""
        for alert in self._active.get(user_id, []):
            if (
                alert.alert_type == alert_type
                and alert.title == title
                and not alert.acknowledged
            ):
                return True
        return False

    def _prune_old_alerts(
        self,
        user_id: int,
        max_age_seconds: float = 7200,
    ) -> None:
        """Remove alerts older than max_age_seconds."""
        now = time.time()
        self._active[user_id] = [
            a for a in self._active.get(user_id, [])
            if (now - a.created_at) < max_age_seconds
        ]

    # ── Stats ────────────────────────────────────────────────

    def get_stats(self, user_id: int) -> dict:
        active = self._active.get(user_id, [])
        return {
            "active_alerts": len([
                a for a in active
                if not a.acknowledged and not a.suppressed
            ]),
            "total_generated": self._alert_counter,
            "escalation_counts": dict(self._escalation.get(user_id, {})),
        }
