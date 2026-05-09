"""
health_intelligence/utils/validators.py
───────────────────────────────────────────────
Physiological boundary validators for the Health
Intelligence Core. Enforces medically meaningful
ranges on vitals, wearable signals, and user inputs.
"""

import logging
from typing import Optional

log = logging.getLogger(__name__)

# ── Physiological boundaries ────────────────────────────────
# Source: Clinical reference ranges (adult, resting)

VITAL_RANGES: dict[str, dict[str, float]] = {
    "heart_rate_bpm": {"min": 30.0, "max": 220.0, "normal_min": 60.0, "normal_max": 100.0},
    "spo2_percent": {"min": 50.0, "max": 100.0, "normal_min": 95.0, "normal_max": 100.0},
    "systolic_bp": {"min": 60.0, "max": 260.0, "normal_min": 90.0, "normal_max": 120.0},
    "diastolic_bp": {"min": 30.0, "max": 160.0, "normal_min": 60.0, "normal_max": 80.0},
    "temperature_celsius": {"min": 33.0, "max": 43.0, "normal_min": 36.1, "normal_max": 37.2},
    "respiratory_rate": {"min": 6.0, "max": 60.0, "normal_min": 12.0, "normal_max": 20.0},
    "blood_glucose_mgdl": {"min": 20.0, "max": 600.0, "normal_min": 70.0, "normal_max": 100.0},
}

WEARABLE_RANGES: dict[str, dict[str, float]] = {
    "steps": {"min": 0, "max": 100_000},
    "calories_burned": {"min": 0, "max": 15_000},
    "sleep_hours": {"min": 0.0, "max": 24.0},
    "active_minutes": {"min": 0, "max": 1440},
    "distance_km": {"min": 0.0, "max": 200.0},
}


def validate_vital(name: str, value: Optional[float]) -> tuple[bool, str]:
    """
    Validate a single vital sign against physiological boundaries.

    Returns:
        (is_valid, message) — True if within plausible range.
    """
    if value is None:
        return True, "No value provided"

    bounds = VITAL_RANGES.get(name)
    if not bounds:
        return True, f"No validation rule for '{name}'"

    if value < bounds["min"] or value > bounds["max"]:
        return False, (
            f"{name}={value} is outside physiological range "
            f"[{bounds['min']}–{bounds['max']}]"
        )
    return True, "Valid"


def is_vital_abnormal(name: str, value: Optional[float]) -> bool:
    """Check whether a vital sign falls outside the normal reference range."""
    if value is None:
        return False
    bounds = VITAL_RANGES.get(name)
    if not bounds:
        return False
    return value < bounds["normal_min"] or value > bounds["normal_max"]


def validate_wearable_metric(name: str, value: Optional[float]) -> tuple[bool, str]:
    """Validate a wearable metric against reasonable boundaries."""
    if value is None:
        return True, "No value provided"

    bounds = WEARABLE_RANGES.get(name)
    if not bounds:
        return True, f"No validation rule for '{name}'"

    if value < bounds["min"] or value > bounds["max"]:
        return False, (
            f"{name}={value} is outside plausible range "
            f"[{bounds['min']}–{bounds['max']}]"
        )
    return True, "Valid"


def clamp_vital(name: str, value: Optional[float]) -> Optional[float]:
    """Clamp a vital sign to physiological boundaries, returning None if missing."""
    if value is None:
        return None
    bounds = VITAL_RANGES.get(name)
    if not bounds:
        return value
    return max(bounds["min"], min(bounds["max"], value))


def validate_age(age: Optional[int]) -> tuple[bool, str]:
    """Validate that age is within a reasonable human range."""
    if age is None:
        return True, "No age provided"
    if age < 0 or age > 130:
        return False, f"Age {age} is outside valid range [0–130]"
    return True, "Valid"


def validate_bmi(bmi: Optional[float]) -> tuple[bool, str]:
    """Validate BMI is within a plausible range."""
    if bmi is None:
        return True, "No BMI provided"
    if bmi < 10.0 or bmi > 80.0:
        return False, f"BMI {bmi} is outside plausible range [10–80]"
    return True, "Valid"
