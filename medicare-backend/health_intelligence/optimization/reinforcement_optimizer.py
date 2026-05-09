"""
health_intelligence/optimization/reinforcement_optimizer.py
───────────────────────────────────────────────
Reinforcement-style wellness optimizer — learns from
intervention outcomes to improve future recommendations.

Uses a Multi-Armed Bandit approach (Thompson Sampling)
to balance exploration (trying new interventions) with
exploitation (using proven ones).

Optimises:
  - Intervention selection per context
  - Delivery timing
  - Category effectiveness
  - Context-specific success rates
"""

import logging
import math
import random
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime

log = logging.getLogger(__name__)


@dataclass
class ArmStats:
    """Statistics for a single bandit arm (intervention category)."""
    category: str
    successes: int = 1       # Beta prior (alpha)
    failures: int = 1        # Beta prior (beta)
    total_reward: float = 0.0
    pull_count: int = 0


class ReinforcementOptimizer:
    """
    Thompson Sampling bandit optimizer for intervention
    selection — balances exploration vs exploitation.
    """

    def __init__(self):
        # user_id → context_key → category → ArmStats
        self._arms: dict[int, dict[str, dict[str, ArmStats]]] = defaultdict(
            lambda: defaultdict(dict),
        )

    def select_best(
        self,
        user_id: int,
        available_categories: list[str],
        context_key: str = "default",
        num_selections: int = 3,
    ) -> list[dict]:
        """
        Select the best intervention categories using
        Thompson Sampling.
        """
        arms = self._arms[user_id][context_key]

        # Ensure all categories have arms
        for cat in available_categories:
            if cat not in arms:
                arms[cat] = ArmStats(category=cat)

        # Sample from Beta distribution for each arm
        samples: list[tuple[float, str]] = []
        for cat in available_categories:
            arm = arms[cat]
            # Thompson Sampling: draw from Beta(alpha, beta)
            sample = random.betavariate(
                max(1, arm.successes),
                max(1, arm.failures),
            )
            samples.append((sample, cat))

        # Sort by sampled value (highest = most promising)
        samples.sort(reverse=True)

        selections: list[dict] = []
        for score, cat in samples[:num_selections]:
            arm = arms[cat]
            avg_reward = (
                arm.total_reward / max(arm.pull_count, 1)
            )
            selections.append({
                "category": cat,
                "thompson_score": round(score, 4),
                "success_rate": round(
                    arm.successes / max(arm.successes + arm.failures, 1), 3,
                ),
                "avg_reward": round(avg_reward, 3),
                "exploration_level": "high" if arm.pull_count < 5 else "low",
                "pull_count": arm.pull_count,
            })

        return selections

    def update(
        self,
        user_id: int,
        category: str,
        success: bool,
        reward: float = 0.0,
        context_key: str = "default",
    ) -> None:
        """
        Update arm statistics after observing outcome.
        """
        arms = self._arms[user_id][context_key]
        if category not in arms:
            arms[category] = ArmStats(category=category)

        arm = arms[category]
        arm.pull_count += 1

        if success:
            arm.successes += 1
        else:
            arm.failures += 1

        arm.total_reward += reward

    def get_arm_stats(
        self,
        user_id: int,
        context_key: str = "default",
    ) -> dict:
        """Get all arm statistics for a user context."""
        arms = self._arms.get(user_id, {}).get(context_key, {})
        return {
            cat: {
                "successes": arm.successes,
                "failures": arm.failures,
                "success_rate": round(
                    arm.successes / max(arm.successes + arm.failures, 1), 3,
                ),
                "total_reward": round(arm.total_reward, 3),
                "pull_count": arm.pull_count,
            }
            for cat, arm in arms.items()
        }

    def get_optimization_report(self, user_id: int) -> dict:
        """Comprehensive optimization report."""
        all_contexts = self._arms.get(user_id, {})
        report: dict[str, dict] = {}

        for ctx, arms in all_contexts.items():
            best_arm = max(
                arms.values(),
                key=lambda a: a.successes / max(a.successes + a.failures, 1),
                default=None,
            )
            report[ctx] = {
                "arm_count": len(arms),
                "total_pulls": sum(a.pull_count for a in arms.values()),
                "best_category": best_arm.category if best_arm else None,
                "arms": self.get_arm_stats(user_id, ctx),
            }

        return {"user_id": user_id, "contexts": report}
