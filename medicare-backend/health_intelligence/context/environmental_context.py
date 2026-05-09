"""
health_intelligence/context/environmental_context.py
───────────────────────────────────────────────
External environmental context that may influence
physiological readings.

Handles:
  - Temperature/weather context (if available)
  - Altitude context
  - Time zone / travel context
  - Seasonal patterns
  - Known environmental stressors
"""

import logging
from datetime import datetime
from typing import Any, Optional

log = logging.getLogger(__name__)

# Seasonal patterns that may affect health metrics
SEASONAL_ADJUSTMENTS = {
    "winter": {
        "sleep_hours": 0.3,       # people may sleep slightly more
        "active_minutes": -10,    # less outdoor activity
        "stress_level": 5,        # seasonal affective patterns
    },
    "summer": {
        "sleep_hours": -0.3,
        "active_minutes": 10,
        "stress_level": -3,
    },
    "spring": {
        "sleep_hours": 0,
        "active_minutes": 5,
        "stress_level": -2,
    },
    "autumn": {
        "sleep_hours": 0.1,
        "active_minutes": -5,
        "stress_level": 2,
    },
}


class EnvironmentalContext:
    """
    Provides environmental context adjustments for
    health signal interpretation.
    """

    @staticmethod
    def get_season(
        at: Optional[datetime] = None,
        hemisphere: str = "northern",
    ) -> str:
        """Determine the current season."""
        now = at or datetime.utcnow()
        month = now.month

        if hemisphere == "northern":
            if month in (12, 1, 2):
                return "winter"
            elif month in (3, 4, 5):
                return "spring"
            elif month in (6, 7, 8):
                return "summer"
            else:
                return "autumn"
        else:
            if month in (12, 1, 2):
                return "summer"
            elif month in (3, 4, 5):
                return "autumn"
            elif month in (6, 7, 8):
                return "winter"
            else:
                return "spring"

    @staticmethod
    def get_seasonal_adjustments(
        season: str,
    ) -> dict[str, float]:
        """
        Return expected metric adjustments for the season.
        Positive = expect higher, negative = expect lower.
        """
        return SEASONAL_ADJUSTMENTS.get(season, {})

    @staticmethod
    def assess_travel_impact(
        timezone_change_hours: float,
    ) -> dict:
        """
        Assess the impact of travel/timezone change on
        expected biometrics.
        """
        abs_change = abs(timezone_change_hours)

        if abs_change < 2:
            return {
                "impact": "minimal",
                "recovery_days": 0,
                "adjustments": {},
                "explanation": "Minor timezone change — minimal impact expected.",
            }

        recovery_days = int(abs_change * 0.7)
        return {
            "impact": "moderate" if abs_change < 6 else "significant",
            "recovery_days": recovery_days,
            "adjustments": {
                "sleep_hours": -abs_change * 0.15,
                "stress_level": abs_change * 2,
                "heart_rate_bpm": abs_change * 0.5,
            },
            "explanation": (
                f"Timezone shift of {abs_change:.0f}h may affect "
                f"sleep and stress for ~{recovery_days} days."
            ),
        }

    @staticmethod
    def get_full_context(
        at: Optional[datetime] = None,
        hemisphere: str = "northern",
        timezone_change: float = 0,
        external_temperature: Optional[float] = None,
    ) -> dict:
        """
        Build a complete environmental context snapshot.
        """
        now = at or datetime.utcnow()
        season = EnvironmentalContext.get_season(now, hemisphere)

        context = {
            "season": season,
            "seasonal_adjustments": EnvironmentalContext.get_seasonal_adjustments(season),
            "timestamp": now.isoformat(),
        }

        if timezone_change != 0:
            context["travel_impact"] = (
                EnvironmentalContext.assess_travel_impact(timezone_change)
            )

        if external_temperature is not None:
            if external_temperature > 35:
                context["heat_stress"] = {
                    "risk": "elevated",
                    "hr_adjustment": 5,
                    "explanation": "High external temperature may elevate HR.",
                }
            elif external_temperature < 5:
                context["cold_stress"] = {
                    "risk": "moderate",
                    "explanation": "Cold conditions may affect circulation metrics.",
                }

        return context
