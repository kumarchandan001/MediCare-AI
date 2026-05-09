"""
health_intelligence/simulation/multi_future_simulator.py
───────────────────────────────────────────────
Simulates multiple possible future wellness trajectories
simultaneously — branching from the current state into
N probabilistic futures.

Each future differs in:
  - Intervention adherence
  - Stress exposure
  - Recovery behaviour
  - Habit consistency

Outputs:
  - Probabilistic fan of trajectories
  - Best-case / worst-case / expected paths
  - Outcome distributions per metric
  - Non-diagnostic uncertainty bounds
"""

import logging
import math
import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class FutureScenario:
    """A single simulated future."""
    scenario_id: str
    label: str
    probability: float
    days: list[dict]
    final_values: dict[str, float]
    direction: str              # improving | stable | declining
    confidence: float


@dataclass
class MultiFutureResult:
    """Results of multi-future simulation."""
    user_id: int
    scenarios: list[FutureScenario]
    best_case: str              # scenario_id
    worst_case: str
    expected: str
    metric_distributions: dict[str, dict]
    simulated_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


# Scenario templates
SCENARIO_TEMPLATES = {
    "optimistic": {
        "label": "Positive trajectory — adherence to recommendations",
        "probability": 0.25,
        "stress_modifier": -0.7,
        "fatigue_modifier": -0.6,
        "recovery_modifier": 1.3,
        "sleep_modifier": 0.5,
    },
    "current_trend": {
        "label": "Continuation of current patterns",
        "probability": 0.40,
        "stress_modifier": 0.0,
        "fatigue_modifier": 0.0,
        "recovery_modifier": 0.0,
        "sleep_modifier": 0.0,
    },
    "pessimistic": {
        "label": "Declining trajectory — no intervention",
        "probability": 0.20,
        "stress_modifier": 0.5,
        "fatigue_modifier": 0.4,
        "recovery_modifier": -0.8,
        "sleep_modifier": -0.3,
    },
    "disrupted": {
        "label": "External disruption — acute stress event",
        "probability": 0.15,
        "stress_modifier": 1.5,
        "fatigue_modifier": 1.0,
        "recovery_modifier": -1.5,
        "sleep_modifier": -0.8,
    },
}

# Default daily drift rates
DEFAULT_DRIFT = {
    "stress_level": 1.2,
    "fatigue": 1.5,
    "recovery_score": -0.8,
    "wellness_score": -0.7,
    "burnout_risk": 0.015,
}

METRIC_BOUNDS = {
    "stress_level": (0, 100),
    "fatigue": (0, 100),
    "recovery_score": (0, 100),
    "wellness_score": (0, 100),
    "burnout_risk": (0, 1.0),
}


class MultiFutureSimulator:
    """
    Simulates multiple probabilistic wellness futures
    simultaneously from the current state.
    """

    def simulate(
        self,
        user_id: int,
        current_values: dict[str, float],
        horizon_days: int = 7,
        num_scenarios: Optional[int] = None,
    ) -> MultiFutureResult:
        """
        Simulate multiple futures.
        """
        horizon_days = min(horizon_days, 14)
        scenarios: list[FutureScenario] = []

        for scenario_id, template in SCENARIO_TEMPLATES.items():
            scenario = self._simulate_scenario(
                user_id, scenario_id, template,
                current_values, horizon_days,
            )
            scenarios.append(scenario)

        # Identify best/worst/expected
        best = min(scenarios, key=lambda s: s.final_values.get("stress_level", 100))
        worst = max(scenarios, key=lambda s: s.final_values.get("stress_level", 0))
        expected = max(scenarios, key=lambda s: s.probability)

        # Metric distributions across scenarios
        distributions: dict[str, dict] = {}
        for metric in current_values:
            finals = [s.final_values.get(metric, 0) for s in scenarios]
            if finals:
                distributions[metric] = {
                    "min": round(min(finals), 2),
                    "max": round(max(finals), 2),
                    "expected": round(
                        sum(f * s.probability for f, s in zip(finals, scenarios))
                        / max(sum(s.probability for s in scenarios), 0.01),
                        2,
                    ),
                    "spread": round(max(finals) - min(finals), 2),
                }

        return MultiFutureResult(
            user_id=user_id,
            scenarios=scenarios,
            best_case=best.scenario_id,
            worst_case=worst.scenario_id,
            expected=expected.scenario_id,
            metric_distributions=distributions,
        )

    def _simulate_scenario(
        self,
        user_id: int,
        scenario_id: str,
        template: dict,
        initial: dict[str, float],
        horizon: int,
    ) -> FutureScenario:
        """Simulate a single scenario."""
        values = dict(initial)
        days: list[dict] = []

        for day in range(1, horizon + 1):
            for metric, drift in DEFAULT_DRIFT.items():
                if metric not in values:
                    continue

                # Apply scenario modifier
                modifier_key = metric.split("_")[0] + "_modifier"
                if modifier_key not in template:
                    modifier_key = "stress_modifier"
                mod = template.get(modifier_key, 0)

                net = drift + mod
                # Add stochastic noise
                noise = random.gauss(0, abs(net) * 0.25)
                values[metric] += net + noise

                # Clamp
                lo, hi = METRIC_BOUNDS.get(metric, (0, 100))
                values[metric] = max(lo, min(hi, values[metric]))

            confidence = max(0.1, 0.8 * math.exp(-0.07 * day))
            days.append({
                "day": day,
                "values": {k: round(v, 2) for k, v in values.items()},
                "confidence": round(confidence, 3),
            })

        # Direction
        direction = self._compute_direction(initial, values)

        return FutureScenario(
            scenario_id=scenario_id,
            label=template["label"],
            probability=template["probability"],
            days=days,
            final_values={k: round(v, 2) for k, v in values.items()},
            direction=direction,
            confidence=days[-1]["confidence"] if days else 0,
        )

    @staticmethod
    def _compute_direction(initial: dict, final: dict) -> str:
        improvements = 0
        declines = 0
        for metric in initial:
            if metric not in final:
                continue
            diff = final[metric] - initial[metric]
            if metric in ("stress_level", "fatigue", "burnout_risk"):
                if diff > 1:
                    declines += 1
                elif diff < -1:
                    improvements += 1
            else:
                if diff > 1:
                    improvements += 1
                elif diff < -1:
                    declines += 1
        if declines > improvements + 1:
            return "declining"
        elif improvements > declines + 1:
            return "improving"
        return "stable"

    def to_dict(self, result: MultiFutureResult) -> dict:
        return {
            "user_id": result.user_id,
            "scenarios": [
                {
                    "id": s.scenario_id,
                    "label": s.label,
                    "probability": s.probability,
                    "direction": s.direction,
                    "confidence": s.confidence,
                    "final_values": s.final_values,
                    "days": s.days,
                }
                for s in result.scenarios
            ],
            "best_case": result.best_case,
            "worst_case": result.worst_case,
            "expected": result.expected,
            "distributions": result.metric_distributions,
            "simulated_at": result.simulated_at,
        }
