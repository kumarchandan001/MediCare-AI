"""
health_intelligence/infrastructure/research_expansion_hooks.py
───────────────────────────────────────────────
Extensible interfaces and hooks for future research
expansion. (Refinement 8)

Prepares for:
  - Digital physiology research
  - Federated wellness learning
  - Multi-user wellness ecosystems
  - Collaborative wellness intelligence
  - Advanced simulation environments
  - Reinforcement learning optimisation

These are INTERFACE DEFINITIONS only — not full
implementations. They serve as extension points
for future research integration.
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional, Protocol

log = logging.getLogger(__name__)


# ── Research Extension Protocols ─────────────────────────

class FederatedLearningProvider(Protocol):
    """
    Protocol for future federated learning integration.
    Allows the system to learn from aggregate patterns
    across users without sharing individual data.
    """

    def contribute_aggregate(
        self,
        anonymised_metrics: dict[str, float],
    ) -> None:
        """Contribute anonymised metrics to federated model."""
        ...

    def receive_update(self) -> dict:
        """Receive model updates from federated coordinator."""
        ...


class CollaborativeIntelligenceProvider(Protocol):
    """
    Protocol for multi-user collaborative wellness.
    Example: family wellness coordination, team health.
    """

    def get_group_context(
        self,
        group_id: str,
    ) -> dict:
        """Get aggregated group wellness context."""
        ...

    def contribute_to_group(
        self,
        group_id: str,
        user_contribution: dict,
    ) -> None:
        """Contribute user insights to group intelligence."""
        ...


class AdvancedSimulationProvider(Protocol):
    """
    Protocol for advanced simulation environments.
    Example: Monte Carlo wellness simulation, agent-based modeling.
    """

    def run_simulation(
        self,
        initial_state: dict,
        config: dict,
    ) -> dict:
        """Run an advanced simulation."""
        ...


class ReinforcementLearningProvider(Protocol):
    """
    Protocol for full RL integration.
    Extends the Thompson Sampling approach to
    deep RL for intervention optimisation.
    """

    def get_action(
        self,
        state: dict,
        available_actions: list[str],
    ) -> str:
        """Select an action from RL policy."""
        ...

    def update_policy(
        self,
        state: dict,
        action: str,
        reward: float,
        next_state: dict,
    ) -> None:
        """Update RL policy with outcome."""
        ...


# ── Extension Registry ──────────────────────────────────

class ResearchExpansionHooks:
    """
    Registry for research extension providers.
    Future implementations can register here to
    integrate with the wellness ecosystem.
    """

    def __init__(self):
        self._federated: Optional[FederatedLearningProvider] = None
        self._collaborative: Optional[CollaborativeIntelligenceProvider] = None
        self._simulation: Optional[AdvancedSimulationProvider] = None
        self._rl: Optional[ReinforcementLearningProvider] = None
        self._custom_hooks: dict[str, object] = {}

    def register_federated(self, provider: FederatedLearningProvider) -> None:
        self._federated = provider
        log.info("Federated learning provider registered")

    def register_collaborative(self, provider: CollaborativeIntelligenceProvider) -> None:
        self._collaborative = provider
        log.info("Collaborative intelligence provider registered")

    def register_simulation(self, provider: AdvancedSimulationProvider) -> None:
        self._simulation = provider
        log.info("Advanced simulation provider registered")

    def register_rl(self, provider: ReinforcementLearningProvider) -> None:
        self._rl = provider
        log.info("Reinforcement learning provider registered")

    def register_custom(self, name: str, hook: object) -> None:
        self._custom_hooks[name] = hook
        log.info(f"Custom research hook registered: {name}")

    def get_status(self) -> dict:
        """Get research extension status."""
        return {
            "federated_learning": "registered" if self._federated else "not_registered",
            "collaborative_intelligence": "registered" if self._collaborative else "not_registered",
            "advanced_simulation": "registered" if self._simulation else "not_registered",
            "reinforcement_learning": "registered" if self._rl else "not_registered",
            "custom_hooks": list(self._custom_hooks.keys()),
            "note": (
                "These are extension points for future research. "
                "Register providers to activate capabilities."
            ),
        }
