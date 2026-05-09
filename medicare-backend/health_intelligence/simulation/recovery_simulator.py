"""
health_intelligence/simulation/recovery_simulator.py
───────────────────────────────────────────────
Simulates the impact of proposed interventions on
the user's recovery trajectory.

Answers questions like:
  - "If I sleep 8h tonight, how fast will fatigue drop?"
  - "Will stress management reduce my burnout risk?"
  - "How many rest days do I need to recover?"

Provides:
  - Day-by-day recovery projections
  - Intervention impact quantification
  - Confidence bounds
  - Comparison with no-action baseline
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

# Intervention daily improvement rates
INTERVENTION_EFFECTS = {
    "sleep_hygiene": {"fatigue": -3.0, "stress_level": -1.5, "recovery_score": 2.0},
    "breathing": {"stress_level": -4.0, "fatigue": -1.0},
    "exercise": {"fatigue": -2.5, "stress_level": -3.0, "resilience": 1.5, "wellness_score": 2.0},
    "meditation": {"stress_level": -3.5, "fatigue": -1.5, "wellness_score": 1.5},
    "hydration": {"fatigue": -1.5, "recovery_score": 1.0},
    "movement_break": {"fatigue": -2.0, "stress_level": -1.0},
    "recovery_protocol": {"recovery_score": 4.0, "fatigue": -4.0, "resilience": 2.0},
    "sleep_schedule": {"fatigue": -3.5, "stress_level": -2.0, "recovery_score": 3.0},
    "screen_reduction": {"stress_level": -1.5, "fatigue": -1.0},
    "stress_management": {"stress_level": -5.0, "burnout_risk": -0.03, "wellness_score": 2.0},
}


@dataclass
class RecoveryProjection:
    """Recovery trajectory projection."""
    scenario: str
    interventions: list[str]
    days: list[dict]
    estimated_recovery_days: Optional[int]
    confidence: float
    impact_summary: dict[str, float]
    warnings: list[str]
    simulated_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class RecoverySimulator:
    """
    Simulates recovery trajectories under different
    intervention combinations.
    """

    def simulate_recovery(
        self,
        current_values: dict[str, float],
        interventions: list[str],
        horizon_days: int = 10,
    ) -> RecoveryProjection:
        """
        Simulate how metrics change with given interventions.
        """
        horizon_days = min(horizon_days, 14)

        # Aggregate intervention effects
        combined_effects: dict[str, float] = {}
        for intervention in interventions:
            effects = INTERVENTION_EFFECTS.get(intervention, {})
            for metric, change in effects.items():
                combined_effects[metric] = combined_effects.get(metric, 0) + change

        # Apply diminishing returns for stacked interventions
        if len(interventions) > 2:
            factor = 0.85
            combined_effects = {
                k: v * factor for k, v in combined_effects.items()
            }

        # Simulate
        values = dict(current_values)
        days: list[dict] = []
        recovery_day = None

        for day in range(1, horizon_days + 1):
            for metric, change in combined_effects.items():
                if metric in values:
                    # Effect diminishes over time (body adapts)
                    adapted = change * math.exp(-0.03 * day)
                    values[metric] += adapted

                    # Clamp
                    if metric in ("stress_level", "fatigue", "burnout_risk"):
                        values[metric] = max(0, values[metric])
                    else:
                        values[metric] = min(100, max(0, values[metric]))

            confidence = max(0.15, 0.8 * math.exp(-0.06 * day))

            days.append({
                "day": day,
                "values": {k: round(v, 2) for k, v in values.items()},
                "confidence": round(confidence, 3),
            })

            # Check if "recovered" (key metrics back to reasonable)
            if recovery_day is None:
                stress_ok = values.get("stress_level", 100) < 40
                fatigue_ok = values.get("fatigue", 100) < 35
                if stress_ok and fatigue_ok:
                    recovery_day = day

        # Impact summary
        impact: dict[str, float] = {}
        for metric in current_values:
            if metric in values:
                impact[metric] = round(values[metric] - current_values[metric], 2)

        warnings: list[str] = []
        if not recovery_day:
            warnings.append(
                "Full recovery may take longer than the simulation horizon."
            )
        if days and days[-1]["confidence"] < 0.25:
            warnings.append(
                "Low confidence at horizon — results are approximate."
            )

        return RecoveryProjection(
            scenario="with_interventions",
            interventions=interventions,
            days=days,
            estimated_recovery_days=recovery_day,
            confidence=days[-1]["confidence"] if days else 0,
            impact_summary=impact,
            warnings=warnings,
        )

    def compare_with_baseline(
        self,
        current_values: dict[str, float],
        interventions: list[str],
        horizon_days: int = 10,
    ) -> dict:
        """Compare recovery with and without interventions."""
        with_int = self.simulate_recovery(
            current_values, interventions, horizon_days,
        )
        without_int = self.simulate_recovery(
            current_values, [], horizon_days,
        )

        return {
            "with_interventions": {
                "recovery_days": with_int.estimated_recovery_days,
                "final_values": with_int.days[-1]["values"] if with_int.days else {},
                "impact": with_int.impact_summary,
            },
            "without_interventions": {
                "recovery_days": without_int.estimated_recovery_days,
                "final_values": without_int.days[-1]["values"] if without_int.days else {},
                "impact": without_int.impact_summary,
            },
            "interventions": interventions,
            "recommendation": (
                f"Interventions may reduce recovery time by "
                f"{(without_int.estimated_recovery_days or horizon_days) - (with_int.estimated_recovery_days or horizon_days)} days."
                if with_int.estimated_recovery_days and without_int.estimated_recovery_days
                else "Interventions show positive directional impact."
            ),
        }
