"""
health_intelligence/simulation/trajectory_simulator.py
───────────────────────────────────────────────
Simulates future wellness trajectories over N days.

Safety constraints:
  - Bounded forecasting (no extrapolation beyond plausible)
  - Confidence degrades with horizon
  - Supports scenario branching (current vs. with-intervention)
  - Exposes simulation uncertainty at each step
  - Non-diagnostic disclaimers

Simulates:
  - Stress accumulation trajectory
  - Fatigue progression
  - Recovery outlook
  - Burnout risk progression
  - Sleep debt impact
  - Wellness improvement scenarios
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

# Metric bounds (simulation cannot exceed these)
METRIC_BOUNDS = {
    "stress_level": (0, 100),
    "fatigue": (0, 100),
    "recovery_score": (0, 100),
    "burnout_risk": (0, 1.0),
    "sleep_debt_hours": (0, 40),
    "resilience": (0, 100),
    "wellness_score": (0, 100),
}

# Default daily change rates (per-day drift if no intervention)
DEFAULT_DRIFT = {
    "stress_level": 1.5,       # slow upward drift
    "fatigue": 2.0,            # accumulates moderately
    "recovery_score": -1.0,    # slight decline without recovery
    "burnout_risk": 0.02,      # slow accumulation
    "sleep_debt_hours": 0.5,   # deficit accumulates
    "resilience": -0.5,        # slow erosion
    "wellness_score": -1.0,    # gradual decline
}


@dataclass
class SimulationStep:
    """A single step in a trajectory simulation."""
    day: int
    values: dict[str, float]
    confidence: float
    uncertainty_range: dict[str, tuple[float, float]]


@dataclass
class TrajectoryResult:
    """Complete trajectory simulation result."""
    user_id: int
    scenario: str
    steps: list[SimulationStep]
    horizon_days: int
    initial_values: dict[str, float]
    final_values: dict[str, float]
    overall_direction: str          # improving | stable | declining
    confidence_at_horizon: float
    warnings: list[str]
    simulated_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class TrajectorySimulator:
    """
    Simulates forward-looking wellness trajectories
    with bounded uncertainty and scenario branching.
    """

    def simulate(
        self,
        user_id: int,
        current_values: dict[str, float],
        horizon_days: int = 7,
        scenario: str = "current_trend",
        intervention_effects: Optional[dict[str, float]] = None,
    ) -> TrajectoryResult:
        """
        Simulate a wellness trajectory.

        Args:
            user_id: User identifier
            current_values: Current metric values
            horizon_days: How many days to simulate
            scenario: "current_trend" or "with_intervention"
            intervention_effects: Per-metric daily improvement
                                  (negative = reducing, e.g. stress -3.0)
        """
        horizon_days = min(horizon_days, 14)  # Safety cap
        intervention_effects = intervention_effects or {}

        steps: list[SimulationStep] = []
        values = dict(current_values)
        warnings: list[str] = []

        for day in range(1, horizon_days + 1):
            # Apply daily drift
            for metric, drift in DEFAULT_DRIFT.items():
                if metric in values:
                    # Apply intervention effect if available
                    intervention = intervention_effects.get(metric, 0)
                    net_drift = drift + intervention

                    # Add noise (reality is not smooth)
                    noise = math.sin(day * 0.7) * abs(net_drift) * 0.2
                    values[metric] = values[metric] + net_drift + noise

                    # Clamp to bounds
                    bounds = METRIC_BOUNDS.get(metric, (0, 100))
                    values[metric] = max(bounds[0], min(bounds[1], values[metric]))

            # Confidence degrades with distance
            confidence = max(0.1, 0.85 * math.exp(-0.08 * day))

            # Uncertainty range grows
            uncertainty: dict[str, tuple[float, float]] = {}
            for metric, val in values.items():
                spread = abs(val) * (1 - confidence) * 0.3
                bounds = METRIC_BOUNDS.get(metric, (0, 100))
                lower = max(bounds[0], val - spread)
                upper = min(bounds[1], val + spread)
                uncertainty[metric] = (round(lower, 2), round(upper, 2))

            steps.append(SimulationStep(
                day=day,
                values={k: round(v, 2) for k, v in values.items()},
                confidence=round(confidence, 3),
                uncertainty_range=uncertainty,
            ))

        # Determine overall direction
        direction = self._compute_direction(current_values, values)

        # Generate warnings
        if steps and steps[-1].confidence < 0.3:
            warnings.append(
                "Simulation confidence is low at the forecast horizon. "
                "Treat projections as directional estimates only."
            )

        for metric, val in values.items():
            bounds = METRIC_BOUNDS.get(metric, (0, 100))
            if val >= bounds[1] * 0.9:
                warnings.append(
                    f"{metric.replace('_', ' ').title()} is approaching "
                    f"upper safety bound."
                )

        return TrajectoryResult(
            user_id=user_id,
            scenario=scenario,
            steps=steps,
            horizon_days=horizon_days,
            initial_values={k: round(v, 2) for k, v in current_values.items()},
            final_values={k: round(v, 2) for k, v in values.items()},
            overall_direction=direction,
            confidence_at_horizon=steps[-1].confidence if steps else 0,
            warnings=warnings,
        )

    def compare_scenarios(
        self,
        user_id: int,
        current_values: dict[str, float],
        intervention_effects: dict[str, float],
        horizon_days: int = 7,
    ) -> dict:
        """
        Compare "current trend" vs "with intervention" scenarios.
        """
        baseline = self.simulate(
            user_id, current_values, horizon_days,
            scenario="current_trend",
        )
        with_intervention = self.simulate(
            user_id, current_values, horizon_days,
            scenario="with_intervention",
            intervention_effects=intervention_effects,
        )

        # Compute deltas
        deltas: dict[str, float] = {}
        for metric in baseline.final_values:
            if metric in with_intervention.final_values:
                diff = (
                    with_intervention.final_values[metric]
                    - baseline.final_values[metric]
                )
                deltas[metric] = round(diff, 2)

        return {
            "baseline_scenario": self._result_to_dict(baseline),
            "intervention_scenario": self._result_to_dict(with_intervention),
            "deltas": deltas,
            "recommendation": (
                "Interventions show positive impact"
                if sum(deltas.values()) < 0  # lower stress/fatigue is better
                else "Limited projected impact — consider alternative approaches"
            ),
            "disclaimer": (
                "These projections are wellness estimates, not medical forecasts. "
                "Actual outcomes depend on many factors."
            ),
        }

    @staticmethod
    def _compute_direction(
        initial: dict[str, float],
        final: dict[str, float],
    ) -> str:
        """Compute overall trajectory direction."""
        improvements = 0
        declines = 0

        for metric in initial:
            if metric not in final:
                continue
            diff = final[metric] - initial[metric]

            # For stress, fatigue, burnout — increase is bad
            if metric in ("stress_level", "fatigue", "burnout_risk", "sleep_debt_hours"):
                if diff > 1:
                    declines += 1
                elif diff < -1:
                    improvements += 1
            else:
                # For wellness, resilience, recovery — increase is good
                if diff > 1:
                    improvements += 1
                elif diff < -1:
                    declines += 1

        if declines > improvements + 1:
            return "declining"
        elif improvements > declines + 1:
            return "improving"
        return "stable"

    @staticmethod
    def _result_to_dict(result: TrajectoryResult) -> dict:
        return {
            "scenario": result.scenario,
            "direction": result.overall_direction,
            "confidence_at_horizon": result.confidence_at_horizon,
            "initial": result.initial_values,
            "final": result.final_values,
            "warnings": result.warnings,
            "steps": [
                {
                    "day": s.day,
                    "values": s.values,
                    "confidence": s.confidence,
                }
                for s in result.steps
            ],
        }
