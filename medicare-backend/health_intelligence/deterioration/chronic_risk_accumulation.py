"""
health_intelligence/deterioration/chronic_risk_accumulation.py
───────────────────────────────────────────────
Tracks long-term chronic risk buildup — slower than
deterioration detection, focused on weeks/months.

Monitors:
  - Sleep debt accumulation (weeks)
  - Stress chronicity (sustained high stress weeks)
  - Activity deficit (prolonged sedentary periods)
  - Recovery debt (insufficient recovery over time)
  - Resilience erosion (declining stress tolerance)

Generates:
  - Chronic risk severity
  - Weeks of accumulation
  - Projected risk if unchanged
  - Intervention urgency
"""

import logging
from collections import defaultdict
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class ChronicRiskAccumulator:
    """
    Tracks multi-week chronic risk buildup across
    health dimensions.
    """

    def __init__(self):
        # user_id → risk_type → weekly scores
        self._weekly: dict[int, dict[str, list[float]]] = defaultdict(
            lambda: defaultdict(list),
        )
        self._max_weeks = 12

    def record_weekly_summary(
        self,
        user_id: int,
        avg_sleep: float,
        avg_stress: float,
        avg_active_minutes: float,
        avg_recovery: float,
        week_label: Optional[str] = None,
    ) -> None:
        """Record a weekly health summary for chronic tracking."""
        # Score each dimension (0–1, higher = more risk)
        sleep_risk = max(0, min(1, (7.0 - avg_sleep) / 3.0))
        stress_risk = max(0, min(1, (avg_stress - 30) / 50))
        activity_risk = max(0, min(1, (30 - avg_active_minutes) / 30))
        recovery_risk = max(0, min(1, (70 - avg_recovery) / 50))

        self._weekly[user_id]["sleep_debt"].append(sleep_risk)
        self._weekly[user_id]["stress_chronicity"].append(stress_risk)
        self._weekly[user_id]["activity_deficit"].append(activity_risk)
        self._weekly[user_id]["recovery_debt"].append(recovery_risk)

        # Prune
        for key in self._weekly[user_id]:
            if len(self._weekly[user_id][key]) > self._max_weeks:
                self._weekly[user_id][key] = (
                    self._weekly[user_id][key][-self._max_weeks:]
                )

    def assess_chronic_risks(self, user_id: int) -> dict:
        """
        Assess accumulated chronic health risks.
        """
        risks: dict[str, dict] = {}
        max_severity = 0.0

        for risk_type in ("sleep_debt", "stress_chronicity",
                          "activity_deficit", "recovery_debt"):
            scores = self._weekly.get(user_id, {}).get(risk_type, [])

            if not scores:
                continue

            # Weighted average (recent weeks matter more)
            n = len(scores)
            weights = [1 + i * 0.2 for i in range(n)]
            weighted = sum(s * w for s, w in zip(scores, weights))
            total_w = sum(weights)
            avg_risk = weighted / total_w

            # How many consecutive "high risk" weeks?
            consecutive = 0
            for s in reversed(scores):
                if s > 0.5:
                    consecutive += 1
                else:
                    break

            # Severity escalates with consecutive weeks
            severity = min(0.95, avg_risk * 0.6 + consecutive * 0.08)
            max_severity = max(max_severity, severity)

            # Projected risk in 4 weeks if unchanged
            if n >= 2:
                trend = scores[-1] - scores[-2]
                projected = min(1.0, avg_risk + trend * 4)
            else:
                projected = avg_risk

            risks[risk_type] = {
                "current_risk": round(avg_risk, 3),
                "severity": round(severity, 3),
                "consecutive_high_weeks": consecutive,
                "total_weeks_tracked": n,
                "projected_4_weeks": round(projected, 3),
                "urgency": self._urgency(severity),
                "weekly_scores": [round(s, 3) for s in scores[-6:]],
            }

        # Compound risk: multiple chronic risks amplify each other
        active_risks = [
            r for r in risks.values() if r["severity"] > 0.3
        ]
        compound = min(0.95, max_severity + len(active_risks) * 0.05)

        return {
            "user_id": user_id,
            "chronic_risks": risks,
            "compound_risk": round(compound, 3),
            "active_risk_count": len(active_risks),
            "needs_professional_review": compound >= 0.7,
            "assessed_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def _urgency(severity: float) -> str:
        if severity >= 0.7:
            return "critical"
        elif severity >= 0.5:
            return "high"
        elif severity >= 0.3:
            return "moderate"
        return "low"
