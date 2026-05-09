"""
health_intelligence/context/circadian_context.py
───────────────────────────────────────────────
Maps physiological signals to expected circadian rhythms.

Circadian phases:
  early_morning  (05:00–08:00) — rising cortisol, HR increasing
  morning        (08:00–12:00) — peak alertness
  afternoon      (12:00–17:00) — post-lunch dip, gradual decline
  evening        (17:00–21:00) — winding down
  night          (21:00–01:00) — melatonin rising, HR dropping
  deep_night     (01:00–05:00) — lowest HR, deepest sleep

Each phase has expected ranges for biometrics.
"""

import logging
from datetime import datetime, time
from typing import Optional

log = logging.getLogger(__name__)

# Phase definitions (start_hour, end_hour)
PHASES = [
    ("deep_night",    0,  5),
    ("early_morning", 5,  8),
    ("morning",       8, 12),
    ("afternoon",    12, 17),
    ("evening",      17, 21),
    ("night",        21, 24),
]

# Expected biometric ranges per phase (min, max)
PHASE_EXPECTATIONS: dict[str, dict[str, tuple[float, float]]] = {
    "deep_night": {
        "heart_rate_bpm": (45, 65),
        "stress_level": (5, 25),
        "steps": (0, 50),
        "active_minutes": (0, 0),
    },
    "early_morning": {
        "heart_rate_bpm": (55, 80),
        "stress_level": (15, 45),
        "steps": (0, 2000),
        "active_minutes": (0, 30),
    },
    "morning": {
        "heart_rate_bpm": (60, 95),
        "stress_level": (20, 60),
        "steps": (500, 5000),
        "active_minutes": (5, 60),
    },
    "afternoon": {
        "heart_rate_bpm": (60, 90),
        "stress_level": (25, 65),
        "steps": (500, 5000),
        "active_minutes": (5, 45),
    },
    "evening": {
        "heart_rate_bpm": (55, 85),
        "stress_level": (15, 50),
        "steps": (200, 3000),
        "active_minutes": (0, 30),
    },
    "night": {
        "heart_rate_bpm": (50, 70),
        "stress_level": (10, 35),
        "steps": (0, 500),
        "active_minutes": (0, 10),
    },
}


class CircadianContext:
    """
    Provides circadian rhythm context for signal
    interpretation.
    """

    @staticmethod
    def get_phase(
        at: Optional[datetime] = None,
        user_timezone_offset_hours: float = 0,
    ) -> str:
        """
        Determine the circadian phase for a given time.

        Args:
            at: The timestamp to evaluate (defaults to now)
            user_timezone_offset_hours: UTC offset for the user

        Returns:
            Phase name string
        """
        now = at or datetime.utcnow()
        hour = (now.hour + user_timezone_offset_hours) % 24

        for phase_name, start, end in PHASES:
            if start <= hour < end:
                return phase_name

        return "deep_night"

    @staticmethod
    def get_expected_ranges(phase: str) -> dict[str, tuple[float, float]]:
        """Return expected biometric ranges for a phase."""
        return PHASE_EXPECTATIONS.get(phase, {})

    @staticmethod
    def is_signal_expected(
        signal_name: str,
        value: float,
        phase: str,
    ) -> dict:
        """
        Check if a signal value is within expected range
        for the current circadian phase.

        Returns:
            {
                "expected": True/False,
                "phase": "...",
                "expected_range": (min, max),
                "deviation": "normal" | "above" | "below",
            }
        """
        ranges = PHASE_EXPECTATIONS.get(phase, {})
        expected_range = ranges.get(signal_name)

        if expected_range is None:
            return {
                "expected": True,
                "phase": phase,
                "expected_range": None,
                "deviation": "unknown",
                "explanation": (
                    f"No circadian expectation for {signal_name} "
                    f"during {phase}."
                ),
            }

        low, high = expected_range
        if value < low:
            deviation = "below"
            expected = False
        elif value > high:
            deviation = "above"
            expected = False
        else:
            deviation = "normal"
            expected = True

        display = signal_name.replace("_", " ").title()
        if expected:
            explanation = (
                f"{display} ({value:.1f}) is within expected range "
                f"for {phase} phase [{low:.0f}–{high:.0f}]."
            )
        else:
            explanation = (
                f"{display} ({value:.1f}) is {deviation} expected range "
                f"for {phase} phase [{low:.0f}–{high:.0f}]."
            )

        return {
            "expected": expected,
            "phase": phase,
            "expected_range": expected_range,
            "deviation": deviation,
            "explanation": explanation,
        }

    @staticmethod
    def should_sleep(phase: str) -> bool:
        """Whether sleep is expected in this phase."""
        return phase in ("night", "deep_night")

    @staticmethod
    def should_be_active(phase: str) -> bool:
        """Whether activity is expected in this phase."""
        return phase in ("morning", "afternoon", "early_morning")

    @staticmethod
    def get_phase_description(phase: str) -> str:
        """Human-readable description of a phase."""
        descriptions = {
            "deep_night": "Deep night — lowest HR, deepest sleep expected",
            "early_morning": "Early morning — cortisol rising, body waking",
            "morning": "Morning — peak alertness and activity",
            "afternoon": "Afternoon — post-lunch dip, gradual wind-down",
            "evening": "Evening — winding down, preparing for rest",
            "night": "Night — melatonin rising, HR dropping",
        }
        return descriptions.get(phase, phase)
