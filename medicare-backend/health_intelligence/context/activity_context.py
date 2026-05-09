"""
health_intelligence/context/activity_context.py
───────────────────────────────────────────────
Activity-aware signal interpretation — determines
whether current biometric readings make sense given
the user's activity state.

Examples:
  High HR during workout   → normal
  High HR during sleep     → abnormal
  Low activity during recovery → acceptable
  Low activity for many days   → risk signal
"""

import logging
from datetime import datetime
from typing import Any, Optional

log = logging.getLogger(__name__)

# Activity states and their expected signal modifications
ACTIVITY_PROFILES: dict[str, dict[str, dict]] = {
    "exercise": {
        "heart_rate_bpm": {"adjust": "allow_high", "max": 190, "normal_min": 90},
        "stress_level": {"adjust": "allow_high", "max": 80},
        "steps": {"adjust": "allow_high", "min": 200},
        "active_minutes": {"adjust": "allow_high", "min": 10},
        "calories_burned": {"adjust": "allow_high"},
    },
    "resting": {
        "heart_rate_bpm": {"adjust": "expect_low", "max": 80, "normal_max": 75},
        "stress_level": {"adjust": "expect_low", "max": 40},
        "steps": {"adjust": "expect_low", "max": 200},
        "active_minutes": {"adjust": "expect_low", "max": 5},
    },
    "sleeping": {
        "heart_rate_bpm": {"adjust": "expect_low", "max": 65, "alert_above": 85},
        "stress_level": {"adjust": "expect_low", "max": 25, "alert_above": 60},
        "steps": {"adjust": "expect_zero", "max": 10},
        "active_minutes": {"adjust": "expect_zero", "max": 0},
    },
    "recovering": {
        "heart_rate_bpm": {"adjust": "expect_low", "max": 78},
        "stress_level": {"adjust": "expect_low", "max": 35},
        "steps": {"adjust": "allow_low", "min": 0},
        "active_minutes": {"adjust": "allow_low", "min": 0},
    },
    "commuting": {
        "heart_rate_bpm": {"adjust": "normal"},
        "stress_level": {"adjust": "allow_moderate", "max": 60},
        "steps": {"adjust": "allow_low"},
    },
    "working": {
        "heart_rate_bpm": {"adjust": "normal"},
        "stress_level": {"adjust": "allow_moderate", "max": 70},
        "steps": {"adjust": "allow_low"},
    },
}


class ActivityContext:
    """
    Provides activity-aware signal interpretation.
    Adjusts what is considered "normal" based on the
    user's current activity.
    """

    @staticmethod
    def infer_activity(signals: dict[str, Any]) -> str:
        """
        Infer the most likely activity from raw signals.

        Returns activity name or 'unknown'.
        """
        hr = signals.get("heart_rate_bpm")
        steps = signals.get("steps")
        active = signals.get("active_minutes")
        stress = signals.get("stress_level")

        # High activity signals → exercise
        if hr and hr > 110 and steps and steps > 300:
            return "exercise"
        if active and active > 20 and hr and hr > 100:
            return "exercise"

        # Very low activity → sleeping
        if hr and hr < 60 and (steps is None or steps < 20):
            return "sleeping"

        # Low activity with low stress → resting
        if (
            hr and hr < 75
            and (stress is None or stress < 35)
            and (steps is None or steps < 200)
        ):
            return "resting"

        # Low activity, low stress, recovering from stress
        if (
            hr and hr < 78
            and (stress is None or stress < 40)
            and (active is None or active < 10)
        ):
            return "recovering"

        return "unknown"

    @staticmethod
    def interpret_signal(
        signal_name: str,
        value: float,
        activity: str,
    ) -> dict:
        """
        Interpret a signal value in the context of an activity.

        Returns:
          {
            "normal_for_activity": True/False,
            "activity": "exercise",
            "adjustment": "allow_high",
            "concern": True/False,
            "explanation": "...",
          }
        """
        profile = ACTIVITY_PROFILES.get(activity, {})
        rules = profile.get(signal_name, {})

        if not rules:
            return {
                "normal_for_activity": True,
                "activity": activity,
                "adjustment": "none",
                "concern": False,
                "explanation": (
                    f"No activity-specific rules for "
                    f"{signal_name} during {activity}."
                ),
            }

        adjust = rules.get("adjust", "normal")
        display = signal_name.replace("_", " ").title()
        concern = False
        normal = True

        # Check alert thresholds
        alert_above = rules.get("alert_above")
        if alert_above and value > alert_above:
            concern = True
            normal = False
            explanation = (
                f"⚠️ {display} ({value:.1f}) is abnormally high "
                f"for {activity} (alert above {alert_above})."
            )
            return {
                "normal_for_activity": False,
                "activity": activity,
                "adjustment": adjust,
                "concern": True,
                "explanation": explanation,
            }

        max_val = rules.get("max")
        min_val = rules.get("min")

        if adjust == "allow_high":
            if max_val and value > max_val:
                normal = False
                concern = True
            explanation = (
                f"{display} ({value:.1f}) — elevated values "
                f"are expected during {activity}."
            )
        elif adjust in ("expect_low", "expect_zero"):
            if max_val and value > max_val:
                normal = False
                concern = True
                explanation = (
                    f"{display} ({value:.1f}) is higher than expected "
                    f"during {activity} (expected ≤{max_val})."
                )
            else:
                explanation = (
                    f"{display} ({value:.1f}) is within expected range "
                    f"for {activity}."
                )
        elif adjust == "allow_low":
            normal = True
            explanation = (
                f"{display} ({value:.1f}) — low values are "
                f"acceptable during {activity}."
            )
        else:
            explanation = (
                f"{display} ({value:.1f}) — normal range "
                f"during {activity}."
            )

        return {
            "normal_for_activity": normal,
            "activity": activity,
            "adjustment": adjust,
            "concern": concern,
            "explanation": explanation,
        }

    @staticmethod
    def get_activity_risk_modifier(activity: str) -> float:
        """
        Risk modifier based on activity context.
        < 1.0 = lower risk (e.g. exercise explains high HR)
        > 1.0 = higher risk (e.g. sleeping shouldn't have high HR)
        """
        modifiers = {
            "exercise": 0.6,
            "commuting": 0.9,
            "working": 1.0,
            "resting": 1.2,
            "sleeping": 1.5,
            "recovering": 1.1,
        }
        return modifiers.get(activity, 1.0)
