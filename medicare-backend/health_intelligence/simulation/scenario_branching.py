"""
health_intelligence/simulation/scenario_branching.py
───────────────────────────────────────────────
Generates specific "what-if" wellness scenario branches.

Examples:
  - "What if I sleep 8h for the next week?"
  - "What if stress stays at 70 for 5 days?"
  - "What if I add 30 min exercise daily?"

Each branch modifies specific metrics and simulates
the cascading effects on the full wellness state.
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime

log = logging.getLogger(__name__)


@dataclass
class ScenarioBranch:
    """A what-if scenario branch definition."""
    branch_id: str
    description: str
    modifications: dict[str, float]  # metric → daily delta
    duration_days: int
    cascade_effects: dict[str, float]  # secondary effects


# Pre-built scenario library
SCENARIO_LIBRARY = {
    "better_sleep": ScenarioBranch(
        branch_id="better_sleep",
        description="Sleep 8+ hours nightly for the next week",
        modifications={"sleep_hours": 1.5},
        duration_days=7,
        cascade_effects={
            "fatigue": -3.0,
            "stress_level": -1.5,
            "recovery_score": 2.5,
            "wellness_score": 1.5,
        },
    ),
    "sustained_stress": ScenarioBranch(
        branch_id="sustained_stress",
        description="Stress remains elevated at 70+ for 5 days",
        modifications={"stress_level": 5.0},
        duration_days=5,
        cascade_effects={
            "fatigue": 3.0,
            "recovery_score": -2.5,
            "burnout_risk": 0.04,
            "wellness_score": -2.0,
        },
    ),
    "daily_exercise": ScenarioBranch(
        branch_id="daily_exercise",
        description="Add 30 min moderate exercise daily",
        modifications={"active_minutes": 30.0},
        duration_days=7,
        cascade_effects={
            "stress_level": -2.5,
            "fatigue": -1.5,
            "recovery_score": 1.5,
            "wellness_score": 2.0,
        },
    ),
    "meditation_practice": ScenarioBranch(
        branch_id="meditation_practice",
        description="10 minutes daily meditation for a week",
        modifications={},
        duration_days=7,
        cascade_effects={
            "stress_level": -4.0,
            "fatigue": -1.0,
            "recovery_score": 1.0,
            "wellness_score": 1.5,
        },
    ),
    "no_action": ScenarioBranch(
        branch_id="no_action",
        description="Continue current patterns without change",
        modifications={},
        duration_days=7,
        cascade_effects={},
    ),
}

METRIC_BOUNDS = {
    "stress_level": (0, 100),
    "fatigue": (0, 100),
    "recovery_score": (0, 100),
    "wellness_score": (0, 100),
    "burnout_risk": (0, 1.0),
    "sleep_hours": (0, 14),
    "active_minutes": (0, 180),
}


class ScenarioBranching:
    """
    Generates and simulates specific what-if
    scenario branches.
    """

    def simulate_branch(
        self,
        current_values: dict[str, float],
        branch_id: str,
    ) -> dict:
        """Simulate a pre-defined scenario branch."""
        branch = SCENARIO_LIBRARY.get(branch_id)
        if not branch:
            return {"error": f"Unknown scenario: {branch_id}"}

        return self._run_branch(current_values, branch)

    def simulate_custom(
        self,
        current_values: dict[str, float],
        description: str,
        modifications: dict[str, float],
        cascade_effects: dict[str, float],
        duration_days: int = 7,
    ) -> dict:
        """Simulate a custom what-if scenario."""
        branch = ScenarioBranch(
            branch_id="custom",
            description=description,
            modifications=modifications,
            duration_days=min(duration_days, 14),
            cascade_effects=cascade_effects,
        )
        return self._run_branch(current_values, branch)

    def compare_branches(
        self,
        current_values: dict[str, float],
        branch_ids: list[str],
    ) -> dict:
        """Compare multiple scenario branches side by side."""
        results: list[dict] = []
        for bid in branch_ids:
            result = self.simulate_branch(current_values, bid)
            if "error" not in result:
                results.append(result)

        # Find best outcome
        if results:
            best = min(
                results,
                key=lambda r: r.get("final_values", {}).get("stress_level", 100),
            )
            best_id = best.get("branch_id", "unknown")
        else:
            best_id = None

        return {
            "branches": results,
            "recommended_branch": best_id,
            "disclaimer": (
                "These are directional wellness estimates, not predictions."
            ),
        }

    def list_available_scenarios(self) -> list[dict]:
        """List all pre-built scenarios."""
        return [
            {
                "branch_id": b.branch_id,
                "description": b.description,
                "duration_days": b.duration_days,
            }
            for b in SCENARIO_LIBRARY.values()
        ]

    def _run_branch(
        self,
        initial: dict[str, float],
        branch: ScenarioBranch,
    ) -> dict:
        """Execute a branch simulation."""
        values = dict(initial)
        days: list[dict] = []

        for day in range(1, branch.duration_days + 1):
            # Apply direct modifications
            for metric, delta in branch.modifications.items():
                if metric in values:
                    values[metric] += delta

            # Apply cascade effects (diminishing over time)
            for metric, effect in branch.cascade_effects.items():
                if metric in values:
                    diminished = effect * math.exp(-0.05 * day)
                    values[metric] += diminished

            # Clamp
            for metric in values:
                lo, hi = METRIC_BOUNDS.get(metric, (0, 100))
                values[metric] = max(lo, min(hi, values[metric]))

            confidence = max(0.15, 0.85 * math.exp(-0.06 * day))
            days.append({
                "day": day,
                "values": {k: round(v, 2) for k, v in values.items()},
                "confidence": round(confidence, 3),
            })

        return {
            "branch_id": branch.branch_id,
            "description": branch.description,
            "duration_days": branch.duration_days,
            "initial_values": {k: round(v, 2) for k, v in initial.items()},
            "final_values": {k: round(v, 2) for k, v in values.items()},
            "days": days,
            "impact_summary": {
                metric: round(values.get(metric, 0) - initial.get(metric, 0), 2)
                for metric in initial
            },
        }
