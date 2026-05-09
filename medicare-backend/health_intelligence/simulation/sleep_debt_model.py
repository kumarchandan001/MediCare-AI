"""
health_intelligence/simulation/sleep_debt_model.py
───────────────────────────────────────────────
Models cumulative sleep debt accumulation and its
cascading effects on recovery, stress, and fatigue.

Sleep debt = sum of (needed_sleep - actual_sleep) over N days.

Effects modeled:
  - Recovery capacity reduction
  - Stress amplification
  - Fatigue acceleration
  - Cognitive performance degradation
  - Immune readiness decline

Includes payback simulation: how many days of good
sleep are needed to recover from current debt.
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

DEFAULT_SLEEP_NEED = 8.0  # hours


@dataclass
class SleepDebtState:
    """Current sleep debt state."""
    total_debt_hours: float
    debt_severity: str             # none | mild | moderate | severe | critical
    recovery_capacity_impact: float   # 0–1 reduction
    stress_amplification: float       # 1.0 = none, 1.5 = 50% worse
    fatigue_multiplier: float
    cognitive_impact: float           # 0–1 reduction
    immune_impact: float              # 0–1 reduction
    payback_nights_needed: int
    daily_history: list[dict]
    assessed_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class SleepDebtModel:
    """
    Models cumulative sleep debt and its cascading
    physiological effects.
    """

    def __init__(self, sleep_need: float = DEFAULT_SLEEP_NEED):
        self._sleep_need = sleep_need
        # user_id → list of (date, hours_slept)
        self._history: dict[int, list[tuple[str, float]]] = {}

    def record_sleep(
        self,
        user_id: int,
        hours_slept: float,
        date: Optional[str] = None,
    ) -> None:
        """Record a night's sleep."""
        dt = date or datetime.utcnow().strftime("%Y-%m-%d")
        if user_id not in self._history:
            self._history[user_id] = []
        self._history[user_id].append((dt, hours_slept))
        # Keep last 30 days
        if len(self._history[user_id]) > 30:
            self._history[user_id] = self._history[user_id][-30:]

    def assess_debt(
        self,
        user_id: int,
        lookback_days: int = 14,
    ) -> SleepDebtState:
        """
        Assess current sleep debt and cascading effects.
        """
        history = self._history.get(user_id, [])
        recent = history[-lookback_days:]

        # Compute total debt
        daily: list[dict] = []
        total_debt = 0.0

        for date, slept in recent:
            deficit = max(0, self._sleep_need - slept)
            surplus = max(0, slept - self._sleep_need)
            # Payback is slower than accumulation (only 50% effective)
            net = deficit - surplus * 0.5
            total_debt += net
            total_debt = max(0, total_debt)  # can't go negative

            daily.append({
                "date": date,
                "hours_slept": round(slept, 1),
                "deficit": round(deficit, 1),
                "cumulative_debt": round(total_debt, 1),
            })

        # Severity classification
        if total_debt < 2:
            severity = "none"
        elif total_debt < 5:
            severity = "mild"
        elif total_debt < 10:
            severity = "moderate"
        elif total_debt < 20:
            severity = "severe"
        else:
            severity = "critical"

        # Cascading effects (sigmoid curves)
        recovery_impact = 1.0 / (1 + math.exp(-0.3 * (total_debt - 8)))
        stress_amp = 1.0 + 0.5 * (1.0 / (1 + math.exp(-0.2 * (total_debt - 6))))
        fatigue_mult = 1.0 + 0.8 * (1.0 / (1 + math.exp(-0.25 * (total_debt - 5))))
        cognitive_impact = 1.0 / (1 + math.exp(-0.2 * (total_debt - 10)))
        immune_impact = 1.0 / (1 + math.exp(-0.15 * (total_debt - 12)))

        # Payback estimation (assumes 1 extra hour per night)
        payback_nights = int(math.ceil(total_debt / 0.5)) if total_debt > 0 else 0

        return SleepDebtState(
            total_debt_hours=round(total_debt, 1),
            debt_severity=severity,
            recovery_capacity_impact=round(recovery_impact, 3),
            stress_amplification=round(stress_amp, 3),
            fatigue_multiplier=round(fatigue_mult, 3),
            cognitive_impact=round(cognitive_impact, 3),
            immune_impact=round(immune_impact, 3),
            payback_nights_needed=payback_nights,
            daily_history=daily,
        )

    def simulate_payback(
        self,
        user_id: int,
        extra_sleep_per_night: float = 1.0,
        max_days: int = 14,
    ) -> list[dict]:
        """
        Simulate how sleep debt reduces with extra sleep.
        """
        state = self.assess_debt(user_id)
        debt = state.total_debt_hours
        projection: list[dict] = []

        for day in range(1, max_days + 1):
            # Payback at 50% efficiency
            payback = extra_sleep_per_night * 0.5
            debt = max(0, debt - payback)

            projection.append({
                "day": day,
                "remaining_debt": round(debt, 1),
                "severity": self._classify_debt(debt),
                "recovery_impact": round(
                    1.0 / (1 + math.exp(-0.3 * (debt - 8))), 3,
                ),
            })

            if debt <= 0:
                break

        return projection

    @staticmethod
    def _classify_debt(debt: float) -> str:
        if debt < 2:
            return "none"
        elif debt < 5:
            return "mild"
        elif debt < 10:
            return "moderate"
        elif debt < 20:
            return "severe"
        return "critical"
