"""
health_intelligence/agents/agent_negotiation.py
───────────────────────────────────────────────
Agent negotiation system — resolves conflicts between
competing wellness goals.

Examples:
  - Activity optimisation vs Recovery preservation
  - Stress reduction vs Productivity maintenance
  - Sleep extension vs Morning exercise

Implements:
  - Weighted priority negotiation
  - Adaptive tradeoff reasoning
  - Wellness conflict resolution
  - Dominance scoring per context
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class NegotiationOutcome:
    """Result of an agent negotiation."""
    winning_agent: str
    losing_agent: str
    conflict_type: str
    resolution: str
    rationale: str
    compromise: Optional[dict] = None
    confidence: float = 0.5


# Context-dependent priority overrides
# In certain states, some agents should always win
CONTEXT_OVERRIDES = {
    "high_stress": {"winner": "stress_agent", "reason": "Stress reduction takes priority during high stress"},
    "poor_recovery": {"winner": "recovery_agent", "reason": "Recovery is critical when reserves are depleted"},
    "sleep_deficit": {"winner": "sleep_agent", "reason": "Sleep debt resolution is foundational"},
    "burnout_risk": {"winner": "stress_agent", "reason": "Burnout prevention overrides other goals"},
}


class AgentNegotiation:
    """
    Resolves conflicts between autonomous wellness agents
    using weighted negotiation and contextual overrides.
    """

    def negotiate(
        self,
        agent_a: dict,
        agent_b: dict,
        context: dict[str, float],
    ) -> NegotiationOutcome:
        """
        Negotiate between two competing agent proposals.

        Args:
            agent_a: First agent's evaluation result
            agent_b: Second agent's evaluation result
            context: Current signal context for overrides
        """
        name_a = agent_a.get("agent", "agent_a")
        name_b = agent_b.get("agent", "agent_b")

        # Check context overrides
        override = self._check_overrides(context)
        if override:
            winner_name = override["winner"]
            if winner_name == name_a:
                winner, loser = agent_a, agent_b
            elif winner_name == name_b:
                winner, loser = agent_b, agent_a
            else:
                winner, loser = self._weighted_resolution(agent_a, agent_b)
                winner_name = winner.get("agent", "unknown")

            loser_name = loser.get("agent", "unknown")
            return NegotiationOutcome(
                winning_agent=winner_name,
                losing_agent=loser_name,
                conflict_type="context_override",
                resolution=f"{winner_name} takes priority",
                rationale=override["reason"],
                confidence=0.8,
            )

        # Weighted resolution
        winner, loser = self._weighted_resolution(agent_a, agent_b)
        winner_name = winner.get("agent", "unknown")
        loser_name = loser.get("agent", "unknown")

        # Try to find a compromise
        compromise = self._find_compromise(winner, loser)

        return NegotiationOutcome(
            winning_agent=winner_name,
            losing_agent=loser_name,
            conflict_type="priority_negotiation",
            resolution=(
                f"{winner_name} takes primary priority; "
                f"{loser_name} recommendations deferred"
            ),
            rationale=self._build_rationale(winner, loser),
            compromise=compromise,
            confidence=0.6,
        )

    def negotiate_batch(
        self,
        proposals: list[dict],
        context: dict[str, float],
    ) -> list[dict]:
        """
        Negotiate among multiple agents and return
        a prioritised, conflict-resolved list.
        """
        if len(proposals) <= 1:
            return proposals

        # Detect conflicts
        conflicts = self._detect_conflicts(proposals)

        # Resolve each conflict
        resolutions: list[NegotiationOutcome] = []
        suppressed: set[str] = set()

        for a_idx, b_idx, conflict_desc in conflicts:
            if proposals[a_idx]["agent"] in suppressed:
                continue
            if proposals[b_idx]["agent"] in suppressed:
                continue

            outcome = self.negotiate(
                proposals[a_idx], proposals[b_idx], context,
            )
            resolutions.append(outcome)
            suppressed.add(outcome.losing_agent)

        # Build final list: winners first, then non-conflicting
        final: list[dict] = []
        for p in proposals:
            if p["agent"] not in suppressed:
                final.append(p)

        # Sort by urgency then priority weight
        urgency_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
        final.sort(key=lambda x: (
            urgency_order.get(x.get("urgency", "low"), 3),
            -x.get("priority_weight", 0),
        ))

        return final

    def _check_overrides(self, context: dict[str, float]) -> Optional[dict]:
        """Check if any context override applies."""
        stress = context.get("stress_level", 40)
        recovery = context.get("recovery_score", 70)
        sleep = context.get("sleep_hours", 7.5)
        burnout = context.get("burnout_risk", 0.1)

        if burnout > 0.7:
            return CONTEXT_OVERRIDES["burnout_risk"]
        if stress > 70:
            return CONTEXT_OVERRIDES["high_stress"]
        if recovery < 35:
            return CONTEXT_OVERRIDES["poor_recovery"]
        if sleep < 5.0:
            return CONTEXT_OVERRIDES["sleep_deficit"]

        return None

    @staticmethod
    def _weighted_resolution(
        agent_a: dict,
        agent_b: dict,
    ) -> tuple[dict, dict]:
        """Resolve using weighted priority scores."""
        urgency_scores = {"critical": 4, "high": 3, "moderate": 2, "low": 1}

        score_a = (
            urgency_scores.get(agent_a.get("urgency", "low"), 1)
            * agent_a.get("priority_weight", 0.5)
            * agent_a.get("confidence", 0.5)
        )
        score_b = (
            urgency_scores.get(agent_b.get("urgency", "low"), 1)
            * agent_b.get("priority_weight", 0.5)
            * agent_b.get("confidence", 0.5)
        )

        if score_a >= score_b:
            return agent_a, agent_b
        return agent_b, agent_a

    @staticmethod
    def _find_compromise(winner: dict, loser: dict) -> Optional[dict]:
        """
        Try to find a compromise that satisfies both agents
        at reduced intensity.
        """
        loser_interventions = loser.get("interventions", [])
        if not loser_interventions:
            return None

        # Downgrade loser's interventions to low priority
        deferred = []
        for intv in loser_interventions[:1]:  # Only keep 1
            deferred.append({
                **intv,
                "priority": "low",
                "note": f"Deferred due to {winner.get('agent', 'unknown')} priority",
            })

        if deferred:
            return {
                "deferred_interventions": deferred,
                "note": (
                    f"{loser.get('agent', 'unknown')} recommendations "
                    "available at lower priority"
                ),
            }
        return None

    @staticmethod
    def _detect_conflicts(proposals: list[dict]) -> list[tuple[int, int, str]]:
        """
        Detect conflicting agent proposals.
        Agents conflict when their interventions pull
        in opposite directions.
        """
        conflict_pairs = {
            ("activity_agent", "recovery_agent"): "activity_vs_recovery",
            ("stress_agent", "activity_agent"): "stress_vs_activity",
            ("sleep_agent", "activity_agent"): "sleep_vs_activity",
        }

        conflicts: list[tuple[int, int, str]] = []
        for i, a in enumerate(proposals):
            for j, b in enumerate(proposals):
                if i >= j:
                    continue
                pair = (a.get("agent"), b.get("agent"))
                pair_rev = (b.get("agent"), a.get("agent"))

                if pair in conflict_pairs:
                    conflicts.append((i, j, conflict_pairs[pair]))
                elif pair_rev in conflict_pairs:
                    conflicts.append((i, j, conflict_pairs[pair_rev]))

        return conflicts

    @staticmethod
    def _build_rationale(winner: dict, loser: dict) -> str:
        return (
            f"{winner.get('agent', 'Agent')} "
            f"(urgency={winner.get('urgency', 'low')}, "
            f"confidence={winner.get('confidence', 0):.2f}) "
            f"outweighs {loser.get('agent', 'Agent')} "
            f"(urgency={loser.get('urgency', 'low')}, "
            f"confidence={loser.get('confidence', 0):.2f})"
        )
