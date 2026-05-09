"""
health_intelligence/adaptation/dynamic_thresholding.py
───────────────────────────────────────────────
Real-time dynamic threshold evolution — thresholds
adapt continuously based on context and personal state.

Thresholds evolve using:
  - Baseline confidence
  - Recent behavior (EMA)
  - Recovery state
  - Stress trends
  - Circadian phase
  - Wearable consistency

Every threshold comes with an explanation of why
it was set to its current value.
"""

import logging
from datetime import datetime
from typing import Any, Optional

from health_intelligence.adaptation.adaptive_learning import (
    AdaptiveLearningEngine,
)
from health_intelligence.context.circadian_context import CircadianContext

log = logging.getLogger(__name__)

# Population-level default thresholds
DEFAULT_THRESHOLDS: dict[str, dict[str, float]] = {
    "heart_rate_bpm": {"low": 50, "high": 100, "critical_low": 40, "critical_high": 150},
    "spo2_percent": {"low": 94, "critical_low": 90},
    "stress_level": {"high": 70, "critical_high": 90},
    "sleep_hours": {"low": 6.0, "critical_low": 4.0},
    "steps": {"low": 3000},
    "hrv_ms": {"low": 20, "critical_low": 10},
}


class DynamicThresholdEngine:
    """
    Continuously adapts alert thresholds based on
    personal baselines, context, and data confidence.

    Every threshold includes an explanation of the
    contributing factors.
    """

    def __init__(self):
        self._learner = AdaptiveLearningEngine()
        self._circadian = CircadianContext()

    def compute_thresholds(
        self,
        user_id: int,
        circadian_phase: Optional[str] = None,
        recovery_state: Optional[str] = None,
        baseline_confidence: float = 0.5,
        stress_trend: Optional[str] = None,
    ) -> dict[str, dict]:
        """
        Compute current adaptive thresholds for a user.

        Returns dict of metric → {
            "low": ..., "high": ...,
            "critical_low": ..., "critical_high": ...,
            "source": "personal" | "population",
            "explanation": "...",
        }
        """
        learned = self._learner.get_learned_baselines(user_id)
        phase = circadian_phase or self._circadian.get_phase()

        thresholds: dict[str, dict] = {}

        for metric, defaults in DEFAULT_THRESHOLDS.items():
            personal = learned.get(metric, {})
            personal_mean = personal.get("mean")
            personal_std = personal.get("std")
            personal_conf = personal.get("confidence", 0)

            # Blend personal and population thresholds
            blend = min(personal_conf, baseline_confidence)

            result = dict(defaults)  # start from population
            explanation_parts: list[str] = []

            if personal_mean and personal_std and blend > 0.3:
                # Adjust thresholds toward personal baselines
                if "low" in defaults:
                    pop_low = defaults["low"]
                    pers_low = personal_mean - 2 * personal_std
                    result["low"] = round(
                        blend * pers_low + (1 - blend) * pop_low, 1,
                    )
                    explanation_parts.append(
                        f"low threshold blended "
                        f"(personal={pers_low:.1f}, pop={pop_low:.1f}, "
                        f"blend={blend:.2f})"
                    )

                if "high" in defaults:
                    pop_high = defaults["high"]
                    pers_high = personal_mean + 2 * personal_std
                    result["high"] = round(
                        blend * pers_high + (1 - blend) * pop_high, 1,
                    )
                    explanation_parts.append(
                        f"high threshold blended "
                        f"(personal={pers_high:.1f}, pop={pop_high:.1f})"
                    )

                result["source"] = "blended"
            else:
                result["source"] = "population"
                explanation_parts.append("Using population defaults (insufficient personal data)")

            # Circadian adjustment
            circ_adj = self._circadian_adjustment(metric, phase)
            if circ_adj != 0:
                if "low" in result:
                    result["low"] = round(result["low"] + circ_adj, 1)
                if "high" in result:
                    result["high"] = round(result["high"] + circ_adj, 1)
                explanation_parts.append(
                    f"circadian adjustment: {circ_adj:+.1f} ({phase})"
                )

            # Recovery state adjustment
            if recovery_state == "recovering":
                if metric == "heart_rate_bpm":
                    result["high"] = round(result.get("high", 100) - 5, 1)
                    explanation_parts.append(
                        "tighter HR threshold during recovery"
                    )
                if metric == "stress_level":
                    result["high"] = round(result.get("high", 70) - 10, 1)
                    explanation_parts.append(
                        "tighter stress threshold during recovery"
                    )

            # Stress trend adjustment
            if stress_trend == "rising" and metric == "stress_level":
                result["high"] = round(result.get("high", 70) - 5, 1)
                explanation_parts.append(
                    "lowered stress threshold due to rising stress trend"
                )

            result["explanation"] = "; ".join(explanation_parts)
            result["confidence"] = round(blend, 3)
            thresholds[metric] = result

        return thresholds

    def check_against_thresholds(
        self,
        user_id: int,
        signals: dict[str, float],
        **kwargs,
    ) -> list[dict]:
        """
        Check current signals against dynamic thresholds.

        Returns list of threshold violations.
        """
        thresholds = self.compute_thresholds(user_id, **kwargs)
        violations: list[dict] = []

        for metric, value in signals.items():
            if value is None or metric not in thresholds:
                continue

            th = thresholds[metric]
            display = metric.replace("_", " ").title()

            # Critical checks
            if "critical_high" in th and value > th["critical_high"]:
                violations.append({
                    "metric": metric,
                    "value": value,
                    "threshold": th["critical_high"],
                    "direction": "above_critical",
                    "severity": "critical",
                    "message": (
                        f"{display} ({value:.1f}) exceeds critical "
                        f"threshold ({th['critical_high']:.1f})"
                    ),
                    "threshold_explanation": th.get("explanation", ""),
                })
            elif "critical_low" in th and value < th["critical_low"]:
                violations.append({
                    "metric": metric,
                    "value": value,
                    "threshold": th["critical_low"],
                    "direction": "below_critical",
                    "severity": "critical",
                    "message": (
                        f"{display} ({value:.1f}) below critical "
                        f"threshold ({th['critical_low']:.1f})"
                    ),
                    "threshold_explanation": th.get("explanation", ""),
                })
            elif "high" in th and value > th["high"]:
                violations.append({
                    "metric": metric,
                    "value": value,
                    "threshold": th["high"],
                    "direction": "above",
                    "severity": "moderate",
                    "message": (
                        f"{display} ({value:.1f}) above adaptive "
                        f"threshold ({th['high']:.1f})"
                    ),
                    "threshold_explanation": th.get("explanation", ""),
                })
            elif "low" in th and value < th["low"]:
                violations.append({
                    "metric": metric,
                    "value": value,
                    "threshold": th["low"],
                    "direction": "below",
                    "severity": "moderate",
                    "message": (
                        f"{display} ({value:.1f}) below adaptive "
                        f"threshold ({th['low']:.1f})"
                    ),
                    "threshold_explanation": th.get("explanation", ""),
                })

        return violations

    def get_learner(self) -> AdaptiveLearningEngine:
        """Access the underlying adaptive learner."""
        return self._learner

    @staticmethod
    def _circadian_adjustment(metric: str, phase: str) -> float:
        """
        Return circadian adjustment for a metric.
        E.g., HR should be lower at night.
        """
        adjustments: dict[str, dict[str, float]] = {
            "heart_rate_bpm": {
                "deep_night": -10, "night": -8,
                "early_morning": -3, "evening": -5,
            },
            "stress_level": {
                "deep_night": -15, "night": -10,
                "early_morning": -5,
            },
        }
        return adjustments.get(metric, {}).get(phase, 0)
