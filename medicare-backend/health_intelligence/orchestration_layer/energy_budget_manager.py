"""
health_intelligence/orchestration_layer/energy_budget_manager.py
───────────────────────────────────────────────
Wellness Energy Budgeting — adaptive capacity management.
(Refinement 2)

Tracks:
  - Cognitive load (how much mental effort user can spare)
  - Intervention fatigue (too many suggestions → resistance)
  - Recovery bandwidth (capacity for improvement actions)
  - Emotional energy (stress-adjusted engagement capacity)
  - Behavioral overload risk (too much change at once)

Ensures the orchestrator:
  - Limits excessive interventions
  - Prioritises sustainable actions
  - Prevents optimization burnout
  - Balances recovery vs improvement effort

The budget regenerates daily and is consumed by
interventions, coaching, and notifications.
"""

import logging
import math
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class EnergyBudget:
    """User's current wellness energy budget."""
    # Capacity pools (0–100)
    cognitive_capacity: float = 80.0
    intervention_capacity: float = 100.0
    recovery_bandwidth: float = 70.0
    emotional_energy: float = 75.0

    # Daily limits
    max_interventions_today: int = 5
    interventions_delivered_today: int = 0
    max_notifications_today: int = 8
    notifications_delivered_today: int = 0

    # Overload tracking
    behavioral_overload_risk: float = 0.0  # 0–1
    consecutive_high_load_days: int = 0

    # Regeneration
    last_regeneration: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class EnergyBudgetManager:
    """
    Manages the user's wellness energy budget to
    prevent optimization burnout and intervention fatigue.
    """

    def __init__(self):
        self._budgets: dict[int, EnergyBudget] = {}

    def get_budget(self, user_id: int) -> EnergyBudget:
        if user_id not in self._budgets:
            self._budgets[user_id] = EnergyBudget()
        return self._budgets[user_id]

    def update_from_signals(
        self,
        user_id: int,
        stress_level: float = 40,
        fatigue: float = 30,
        recovery_score: float = 70,
        sleep_hours: float = 7.5,
    ) -> EnergyBudget:
        """
        Recalculate energy pools from current signals.
        """
        b = self.get_budget(user_id)

        # Cognitive capacity: inversely proportional to stress and fatigue
        b.cognitive_capacity = max(10, 100 - stress_level * 0.6 - fatigue * 0.4)

        # Emotional energy: stress and sleep quality driven
        sleep_factor = min(1.0, sleep_hours / 7.5)
        b.emotional_energy = max(10, 100 - stress_level * 0.5) * sleep_factor

        # Recovery bandwidth: how much capacity for improvement actions
        b.recovery_bandwidth = max(10, recovery_score * 0.8 + (100 - fatigue) * 0.2)

        # Intervention capacity: degrades with deliveries
        delivery_penalty = b.interventions_delivered_today * 15
        b.intervention_capacity = max(0, 100 - delivery_penalty)

        # Dynamic max interventions based on energy
        avg_energy = (b.cognitive_capacity + b.emotional_energy + b.recovery_bandwidth) / 3
        if avg_energy > 70:
            b.max_interventions_today = 5
        elif avg_energy > 50:
            b.max_interventions_today = 3
        elif avg_energy > 30:
            b.max_interventions_today = 2
        else:
            b.max_interventions_today = 1

        # Behavioral overload risk
        load = (
            (100 - b.cognitive_capacity) * 0.3
            + (100 - b.emotional_energy) * 0.3
            + b.interventions_delivered_today * 10
            + b.consecutive_high_load_days * 5
        )
        b.behavioral_overload_risk = min(1.0, load / 100)

        return b

    def consume_intervention(self, user_id: int) -> bool:
        """
        Attempt to consume an intervention slot.
        Returns True if budget allows, False if exhausted.
        """
        b = self.get_budget(user_id)

        if b.interventions_delivered_today >= b.max_interventions_today:
            log.info(f"User {user_id}: intervention budget exhausted")
            return False

        if b.intervention_capacity < 15:
            log.info(f"User {user_id}: intervention capacity too low")
            return False

        b.interventions_delivered_today += 1
        b.intervention_capacity = max(0, b.intervention_capacity - 20)
        return True

    def consume_notification(self, user_id: int) -> bool:
        """Attempt to send a notification."""
        b = self.get_budget(user_id)
        if b.notifications_delivered_today >= b.max_notifications_today:
            return False
        b.notifications_delivered_today += 1
        return True

    def regenerate_daily(self, user_id: int) -> None:
        """
        Daily regeneration — reset daily counters,
        adjust pools based on previous day's load.
        """
        b = self.get_budget(user_id)

        # Track consecutive high-load days
        if b.behavioral_overload_risk > 0.6:
            b.consecutive_high_load_days += 1
        else:
            b.consecutive_high_load_days = max(0, b.consecutive_high_load_days - 1)

        # Reset daily counters
        b.interventions_delivered_today = 0
        b.notifications_delivered_today = 0
        b.intervention_capacity = 100.0
        b.last_regeneration = datetime.utcnow().isoformat()

    def can_intervene(self, user_id: int) -> bool:
        """Quick check: is there budget for an intervention?"""
        b = self.get_budget(user_id)
        return (
            b.interventions_delivered_today < b.max_interventions_today
            and b.intervention_capacity >= 15
            and b.behavioral_overload_risk < 0.85
        )

    def get_budget_report(self, user_id: int) -> dict:
        """Get a human-readable budget report."""
        b = self.get_budget(user_id)
        return {
            "cognitive_capacity": round(b.cognitive_capacity, 1),
            "emotional_energy": round(b.emotional_energy, 1),
            "recovery_bandwidth": round(b.recovery_bandwidth, 1),
            "intervention_capacity": round(b.intervention_capacity, 1),
            "interventions_remaining": max(
                0, b.max_interventions_today - b.interventions_delivered_today,
            ),
            "notifications_remaining": max(
                0, b.max_notifications_today - b.notifications_delivered_today,
            ),
            "behavioral_overload_risk": round(b.behavioral_overload_risk, 3),
            "consecutive_high_load_days": b.consecutive_high_load_days,
            "can_intervene": self.can_intervene(user_id),
            "recommendation": self._budget_recommendation(b),
        }

    @staticmethod
    def _budget_recommendation(b: EnergyBudget) -> str:
        if b.behavioral_overload_risk > 0.7:
            return "Energy reserves are low. Prioritise rest over improvement today."
        if b.cognitive_capacity < 30:
            return "Cognitive load is high. Only essential, low-effort actions recommended."
        if b.emotional_energy < 30:
            return "Emotional energy is depleted. Focus on self-care and recovery."
        if b.intervention_capacity < 20:
            return "Intervention budget nearly exhausted. Saving remaining capacity."
        return "Energy levels are sufficient for wellness activities."
