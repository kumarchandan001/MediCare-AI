"""
health_intelligence/context/contextual_reasoning.py
───────────────────────────────────────────────
Core context-aware reasoning engine — the "brain" that
decides whether a signal is normal or concerning given
the full context.

Combines:
  - Circadian phase expectations
  - Activity state interpretation
  - Environmental adjustments
  - Personal baseline context

Produces explainable, confidence-aware interpretations.
"""

import logging
from datetime import datetime
from typing import Any, Optional

from health_intelligence.context.circadian_context import CircadianContext
from health_intelligence.context.activity_context import ActivityContext
from health_intelligence.context.environmental_context import EnvironmentalContext

log = logging.getLogger(__name__)


class ContextualReasoningEngine:
    """
    Combines all context layers to produce explainable
    real-time signal interpretations.
    """

    def __init__(self):
        self._circadian = CircadianContext()
        self._activity = ActivityContext()
        self._environment = EnvironmentalContext()

    def reason(
        self,
        signals: dict[str, Any],
        at: Optional[datetime] = None,
        user_timezone_offset: float = 0,
        personal_baselines: Optional[dict[str, float]] = None,
        known_activity: Optional[str] = None,
    ) -> dict:
        """
        Contextually interpret all signals.

        Returns:
          {
            "context": {...},
            "interpretations": {signal: {...}},
            "overall_concern": True/False,
            "adjusted_risk_modifier": float,
            "explanations": [...],
          }
        """
        now = at or datetime.utcnow()
        baselines = personal_baselines or {}

        # Build context layers
        phase = self._circadian.get_phase(now, user_timezone_offset)
        activity = known_activity or self._activity.infer_activity(signals)
        env = self._environment.get_full_context(now)

        context = {
            "circadian_phase": phase,
            "phase_description": self._circadian.get_phase_description(phase),
            "activity": activity,
            "season": env.get("season"),
            "timestamp": now.isoformat(),
        }

        # Interpret each signal
        interpretations: dict[str, dict] = {}
        explanations: list[str] = []
        concerns: list[str] = []

        for signal_name, value in signals.items():
            if value is None:
                continue

            interp = self._interpret_signal(
                signal_name, float(value),
                phase, activity, baselines,
            )
            interpretations[signal_name] = interp

            if interp.get("concern"):
                concerns.append(signal_name)
                explanations.append(interp["explanation"])

        # Overall risk modifier
        activity_mod = self._activity.get_activity_risk_modifier(activity)
        circadian_mod = self._circadian_risk_modifier(phase)
        adjusted_modifier = activity_mod * circadian_mod

        # Contextual concern suppression
        # E.g., high HR during exercise is not concerning
        true_concerns = self._filter_contextual_concerns(
            concerns, signals, activity, phase,
        )

        overall_concern = len(true_concerns) > 0

        if not overall_concern and concerns:
            explanations.append(
                f"Elevated signals ({', '.join(concerns)}) are "
                f"explained by current context ({activity}, {phase})."
            )

        return {
            "context": context,
            "interpretations": interpretations,
            "overall_concern": overall_concern,
            "true_concerns": true_concerns,
            "contextually_explained": [
                c for c in concerns if c not in true_concerns
            ],
            "adjusted_risk_modifier": round(adjusted_modifier, 3),
            "explanations": explanations,
        }

    def _interpret_signal(
        self,
        signal_name: str,
        value: float,
        phase: str,
        activity: str,
        baselines: dict[str, float],
    ) -> dict:
        """Interpret a single signal across all context layers."""
        # Circadian check
        circ = self._circadian.is_signal_expected(
            signal_name, value, phase,
        )

        # Activity check
        act = self._activity.interpret_signal(
            signal_name, value, activity,
        )

        # Baseline deviation
        baseline_dev = None
        if signal_name in baselines:
            bl = baselines[signal_name]
            if bl > 0:
                baseline_dev = (value - bl) / bl * 100

        # Combined assessment
        concern = False
        if not circ["expected"] and not act["normal_for_activity"]:
            concern = True
        elif act.get("concern"):
            concern = True

        display = signal_name.replace("_", " ").title()

        if concern:
            explanation = (
                f"{display} ({value:.1f}) is unexpected for both "
                f"circadian phase ({phase}) and activity ({activity})."
            )
        elif not circ["expected"]:
            explanation = (
                f"{display} ({value:.1f}) is outside circadian norms "
                f"for {phase}, but acceptable for {activity}."
            )
        elif not act["normal_for_activity"]:
            explanation = (
                f"{display} ({value:.1f}) is unusual for {activity}, "
                f"but within circadian norms for {phase}."
            )
        else:
            explanation = (
                f"{display} ({value:.1f}) is normal for both "
                f"{phase} phase and {activity} activity."
            )

        return {
            "value": value,
            "concern": concern,
            "circadian_expected": circ["expected"],
            "activity_normal": act["normal_for_activity"],
            "baseline_deviation_pct": (
                round(baseline_dev, 1) if baseline_dev else None
            ),
            "explanation": explanation,
        }

    @staticmethod
    def _circadian_risk_modifier(phase: str) -> float:
        """
        During sleep phases, abnormal readings are more
        concerning than during active phases.
        """
        modifiers = {
            "deep_night": 1.4,
            "night": 1.3,
            "early_morning": 1.1,
            "morning": 1.0,
            "afternoon": 1.0,
            "evening": 1.1,
        }
        return modifiers.get(phase, 1.0)

    @staticmethod
    def _filter_contextual_concerns(
        concerns: list[str],
        signals: dict[str, Any],
        activity: str,
        phase: str,
    ) -> list[str]:
        """
        Filter out concerns that are fully explained
        by the current context.
        """
        true_concerns: list[str] = []

        for signal in concerns:
            # High HR during exercise is not a concern
            if signal == "heart_rate_bpm" and activity == "exercise":
                val = signals.get("heart_rate_bpm", 0)
                if val and val < 180:
                    continue

            # High steps during exercise is not a concern
            if signal == "steps" and activity in ("exercise", "commuting"):
                continue

            # High stress during working is moderate, not alarming
            if signal == "stress_level" and activity == "working":
                val = signals.get("stress_level", 0)
                if val and val < 75:
                    continue

            true_concerns.append(signal)

        return true_concerns
