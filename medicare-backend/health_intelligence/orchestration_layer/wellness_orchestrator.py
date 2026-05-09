"""
health_intelligence/orchestration_layer/wellness_orchestrator.py
───────────────────────────────────────────────
Central Wellness Operating System — coordinates ALL
Step 5 subsystems into unified wellness management.

Orchestrates:
  - Digital Twin (state, memory, identity)
  - Autonomous Agents (proposals, negotiation)
  - Interventions (coordination, delivery)
  - Energy Budget (capacity management)
  - Stability Controls (pacing, smoothing)
  - Explainability (reasoning aggregation)
  - Step 4 subsystems (decisions, coaching, simulation)
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.digital_twin.digital_twin_engine import (
    DigitalTwinEngine,
)
from health_intelligence.orchestration_layer.energy_budget_manager import (
    EnergyBudgetManager,
)
from health_intelligence.orchestration_layer.explainability_orchestrator import (
    ExplainabilityOrchestrator,
)
from health_intelligence.orchestration_layer.orchestration_stability_controls import (
    OrchestrationStabilityControls,
)
from health_intelligence.orchestration_layer.intervention_coordinator import (
    InterventionCoordinator,
)

log = logging.getLogger(__name__)


class WellnessOrchestrator:
    """
    Central operating system for autonomous wellness
    management — the top-level coordinator for Step 5.
    """

    def __init__(self):
        # Core systems
        self._twin = DigitalTwinEngine()
        self._energy = EnergyBudgetManager()
        self._explainability = ExplainabilityOrchestrator()
        self._stability = OrchestrationStabilityControls()
        self._coordinator = InterventionCoordinator(
            self._energy, self._stability,
        )
        # Agents registry (populated by register_agent)
        self._agents: dict[str, object] = {}

    # ── Agent Registration ───────────────────────────────

    def register_agent(self, name: str, agent: object) -> None:
        """Register an autonomous wellness agent."""
        self._agents[name] = agent
        log.info(f"Agent registered: {name}")

    # ── Main Orchestration Cycle ─────────────────────────

    def orchestrate(
        self,
        user_id: int,
        signals: dict[str, float],
        trend_direction: str = "stable",
        recovery_state: Optional[str] = None,
    ) -> dict:
        """
        Run a full orchestration cycle:
        1. Update digital twin
        2. Update energy budget
        3. Collect agent proposals
        4. Resolve conflicts
        5. Apply stability controls
        6. Coordinate interventions
        7. Aggregate explainability
        """
        cycle_start = datetime.utcnow()

        # Clear explainability for new cycle
        self._explainability.clear_cycle(user_id)

        # ── 1. Update twin ──
        twin_state = self._twin.update(user_id, signals)
        self._explainability.record_trace(
            user_id, "digital_twin", "State updated",
            "Twin evolved with latest signals",
            confidence=twin_state.get("data_quality", {}).get("quality", 0.5),
        )

        # ── 2. Update energy budget ──
        self._energy.update_from_signals(
            user_id,
            stress_level=signals.get("stress_level", 40),
            fatigue=signals.get("fatigue", 30),
            recovery_score=signals.get("recovery_score", 70),
            sleep_hours=signals.get("sleep_hours", 7.5),
        )
        budget = self._energy.get_budget_report(user_id)

        # ── 3. Collect agent proposals ──
        proposals: list[dict] = []
        for agent_name, agent in self._agents.items():
            if hasattr(agent, "evaluate"):
                try:
                    proposal = agent.evaluate(user_id, signals, twin_state)
                    if proposal and proposal.get("interventions"):
                        proposals.append({
                            "agent": agent_name,
                            "proposal": proposal,
                        })
                        self._explainability.record_agent_decision(
                            user_id, agent_name,
                            proposal.get("assessment", "Evaluated"),
                            proposal.get("rationale", "Agent-specific reasoning"),
                            confidence=proposal.get("confidence", 0.5),
                        )
                except Exception as e:
                    log.warning(f"Agent {agent_name} failed: {e}")

        # ── 4. Merge & prioritise interventions ──
        all_interventions: list[dict] = []
        for p in proposals:
            for intervention in p["proposal"].get("interventions", []):
                intervention["source_agent"] = p["agent"]
                all_interventions.append(intervention)

        # Sort by priority
        priority_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
        all_interventions.sort(
            key=lambda x: priority_order.get(x.get("priority", "low"), 3),
        )

        # ── 5. Apply stability smoothing ──
        rec_ids = [i.get("category", "") for i in all_interventions]
        smoothed = self._stability.smooth_recommendations(user_id, rec_ids)

        # ── 6. Coordinate delivery ──
        delivered = self._coordinator.submit_batch(
            user_id, all_interventions,
        )

        # ── 7. Build orchestration report ──
        report = {
            "user_id": user_id,
            "twin_state": twin_state,
            "energy_budget": budget,
            "agent_proposals": len(proposals),
            "interventions_submitted": len(all_interventions),
            "interventions_delivered": sum(
                1 for d in delivered if d.get("status") == "delivered"
            ),
            "delivery_results": delivered,
            "stability": self._stability.get_stability_report(user_id),
            "explainability": self._explainability.generate_report(user_id),
            "cycle_duration_ms": (
                datetime.utcnow() - cycle_start
            ).total_seconds() * 1000,
            "orchestrated_at": datetime.utcnow().isoformat(),
        }

        return report

    # ── Daily Lifecycle ──────────────────────────────────

    def daily_reset(self, user_id: int) -> None:
        """Daily lifecycle reset for budgets and counters."""
        self._energy.regenerate_daily(user_id)
        self._coordinator.reset_daily(user_id)

    def weekly_identity_update(
        self,
        user_id: int,
        weekly_averages: dict[str, float],
    ) -> dict:
        """Weekly identity evolution."""
        return self._twin.update_weekly_identity(user_id, weekly_averages)

    # ── Accessors ────────────────────────────────────────

    @property
    def twin(self) -> DigitalTwinEngine:
        return self._twin

    @property
    def energy(self) -> EnergyBudgetManager:
        return self._energy

    @property
    def explainability(self) -> ExplainabilityOrchestrator:
        return self._explainability

    @property
    def stability(self) -> OrchestrationStabilityControls:
        return self._stability

    @property
    def coordinator(self) -> InterventionCoordinator:
        return self._coordinator

    @property
    def agents(self) -> dict[str, object]:
        return self._agents
