"""
health_intelligence/orchestration_layer/intervention_coordinator.py
───────────────────────────────────────────────
Manages execution timing and delivery of interventions,
respecting energy budgets, stability controls, and
agent priorities.

Coordinates:
  - Agent-proposed interventions
  - Energy budget consumption
  - Pacing enforcement
  - Delivery scheduling
  - Outcome recording
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class InterventionCoordinator:
    """
    Controls when and how interventions are delivered,
    enforcing budget and stability constraints.
    """

    def __init__(self, energy_manager, stability_controls):
        self._energy = energy_manager
        self._stability = stability_controls
        # user_id → list of pending interventions
        self._pending: dict[int, list[dict]] = {}
        # user_id → list of delivered interventions
        self._delivered: dict[int, list[dict]] = {}

    def submit_intervention(
        self,
        user_id: int,
        intervention: dict,
        source_agent: str = "unknown",
    ) -> dict:
        """
        Submit an intervention for delivery.
        Returns scheduling decision.
        """
        # Check pacing
        pacing = self._stability.check_intervention_pacing(user_id)
        if not pacing["allowed"]:
            return {
                "status": "deferred",
                "reason": pacing["reason"],
                "intervention": intervention,
                "source": source_agent,
            }

        # Check energy budget
        if not self._energy.can_intervene(user_id):
            return {
                "status": "budget_exhausted",
                "reason": "Insufficient energy budget for today",
                "intervention": intervention,
                "source": source_agent,
            }

        # Consume budget
        consumed = self._energy.consume_intervention(user_id)
        if not consumed:
            return {
                "status": "budget_exhausted",
                "reason": "Failed to consume intervention budget",
                "intervention": intervention,
                "source": source_agent,
            }

        # Record pacing
        self._stability.record_intervention(user_id)

        # Deliver
        delivery = {
            "intervention": intervention,
            "source": source_agent,
            "delivered_at": datetime.utcnow().isoformat(),
            "status": "delivered",
        }

        if user_id not in self._delivered:
            self._delivered[user_id] = []
        self._delivered[user_id].append(delivery)

        return delivery

    def submit_batch(
        self,
        user_id: int,
        interventions: list[dict],
        source_agent: str = "orchestrator",
    ) -> list[dict]:
        """
        Submit a batch of interventions.
        Only delivers what the budget and pacing allows.
        """
        results: list[dict] = []
        for intervention in interventions:
            result = self.submit_intervention(user_id, intervention, source_agent)
            results.append(result)
            # Stop if budget exhausted
            if result["status"] in ("budget_exhausted", "deferred"):
                # Queue remaining
                remaining = interventions[len(results):]
                for r in remaining:
                    results.append({
                        "status": "queued",
                        "reason": "Budget or pacing limit reached",
                        "intervention": r,
                        "source": source_agent,
                    })
                break
        return results

    def get_delivered_today(self, user_id: int) -> list[dict]:
        """Get all interventions delivered today."""
        return self._delivered.get(user_id, [])

    def get_delivery_summary(self, user_id: int) -> dict:
        """Get intervention delivery summary."""
        delivered = self._delivered.get(user_id, [])
        return {
            "delivered_count": len(delivered),
            "can_deliver_more": self._energy.can_intervene(user_id),
            "pacing_status": self._stability.check_intervention_pacing(user_id),
            "budget_report": self._energy.get_budget_report(user_id),
        }

    def reset_daily(self, user_id: int) -> None:
        """Reset daily delivery tracking."""
        self._delivered[user_id] = []
        self._pending[user_id] = []
