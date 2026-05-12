"""
escalation_priority_engine.py
─────────────────────────────
Prioritises conditions showing rapid or severe deterioration.

Includes:
  - Alert cooldown logic to prevent alert fatigue
  - Repeated-alert suppression
  - Wearable-noise escalation filtering
"""

import time
from typing import Any, Dict, List

COOLDOWN_SECONDS = 7200  # 2 hours between same-level alerts
MAX_ALERTS_PER_SESSION = 5


class EscalationPriorityEngine:

    def __init__(self) -> None:
        self._alert_log: Dict[str, List[Dict[str, Any]]] = {}
        self._last_level: Dict[str, str] = {}

    def prioritise(
        self,
        session_id: str,
        hypotheses: List[Dict[str, Any]],
        deterioration_score: float,
        wearable_reliability: float = 0.7,
    ) -> Dict[str, Any]:
        # Filter out low-reliability wearable-driven signals
        effective_det = deterioration_score * max(0.3, wearable_reliability)

        priorities = []
        for h in hypotheses:
            sev = h.get("severity_priority", 1.0)
            conf = h.get("confidence", 0.1)
            priority_score = conf * sev * (1 + effective_det)
            priorities.append({
                "condition": h["condition"],
                "priority_score": round(min(0.9, priority_score), 3),
                "is_urgent": priority_score > 0.5,
            })

        priorities.sort(key=lambda x: -x["priority_score"])

        # Alert fatigue protection
        should_alert = self._should_alert(session_id, priorities)

        return {
            "priorities": priorities[:6],
            "urgent_count": sum(1 for p in priorities if p["is_urgent"]),
            "should_alert": should_alert,
            "wearable_reliability_applied": round(wearable_reliability, 2),
        }

    def _should_alert(self, session_id: str, priorities: List[Dict]) -> bool:
        log = self._alert_log.setdefault(session_id, [])

        # Max alert cap
        if len(log) >= MAX_ALERTS_PER_SESSION:
            return False

        # Cooldown
        now = time.time()
        if log and (now - log[-1].get("ts", 0)) < COOLDOWN_SECONDS:
            return False

        # Only alert if something is urgent
        has_urgent = any(p["is_urgent"] for p in priorities)
        if has_urgent:
            log.append({"ts": now})
        return has_urgent
