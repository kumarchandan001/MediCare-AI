"""
health_intelligence/digital_twin/physiological_profile_model.py
───────────────────────────────────────────────
Models the user's physiological characteristics as a
continuously-evolving profile.

Tracks:
  - Stress adaptation capacity (how fast stress resolves)
  - Recovery behaviour (speed, depth, patterns)
  - Sleep dynamics (ideal duration, deficit sensitivity)
  - Activity patterns (baseline energy expenditure)
  - Resilience characteristics (stress tolerance ceiling)
  - Intervention responsiveness (how well body reacts)
  - Circadian alignment (natural rhythm stability)

Each parameter uses exponential moving averages so
the profile evolves gradually without overreacting
to single-day outliers (Refinement 1 — stability).
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

# Exponential smoothing alpha (lower = more stable)
_ALPHA = 0.12


def _ema(old: float, new: float, alpha: float = _ALPHA) -> float:
    """Exponential moving average update."""
    return old * (1 - alpha) + new * alpha


@dataclass
class PhysiologicalProfile:
    """A single snapshot of a user's physiological model."""
    # Stress
    stress_baseline: float = 35.0
    stress_adaptation_rate: float = 0.5   # 0–1 (fast resolver)
    stress_tolerance_ceiling: float = 70.0

    # Recovery
    recovery_speed: float = 0.5           # 0–1
    recovery_depth: float = 0.6           # 0–1
    recovery_consistency: float = 0.5

    # Sleep
    ideal_sleep_hours: float = 8.0
    sleep_deficit_sensitivity: float = 0.5
    sleep_quality_baseline: float = 70.0

    # Activity
    activity_baseline_minutes: float = 30.0
    activity_tolerance: float = 60.0      # max comfortable
    energy_expenditure_rate: float = 0.5

    # Resilience
    resilience_capacity: float = 60.0     # 0–100
    resilience_growth_rate: float = 0.01  # per-day

    # Intervention response
    intervention_responsiveness: float = 0.5   # 0–1
    intervention_fatigue_threshold: float = 5  # max per day

    # Circadian
    circadian_stability: float = 0.6

    # Metadata
    update_count: int = 0
    last_updated: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class PhysiologicalProfileModel:
    """
    Maintains and evolves the physiological profile of
    each user using exponential smoothing for stability.
    """

    def __init__(self):
        self._profiles: dict[int, PhysiologicalProfile] = {}

    def get_profile(self, user_id: int) -> PhysiologicalProfile:
        """Get or initialise the user's physiological profile."""
        if user_id not in self._profiles:
            self._profiles[user_id] = PhysiologicalProfile()
        return self._profiles[user_id]

    def update_from_signals(
        self,
        user_id: int,
        signals: dict[str, float],
    ) -> PhysiologicalProfile:
        """
        Evolve the profile using latest signal snapshot.
        Uses EMA for gradual, stable adaptation.
        """
        p = self.get_profile(user_id)

        # Stress adaptation
        stress = signals.get("stress_level")
        if stress is not None:
            p.stress_baseline = _ema(p.stress_baseline, stress)
            # Adaptation rate: if stress recovered from high → fast adapter
            if stress < p.stress_baseline * 0.8:
                p.stress_adaptation_rate = _ema(
                    p.stress_adaptation_rate, min(1.0, p.stress_adaptation_rate + 0.05),
                )

        # Recovery
        recovery = signals.get("recovery_score")
        if recovery is not None:
            p.recovery_depth = _ema(p.recovery_depth, recovery / 100.0)
            # Consistency: low variance = high consistency
            diff = abs(recovery / 100.0 - p.recovery_depth)
            consistency_signal = max(0, 1.0 - diff * 3)
            p.recovery_consistency = _ema(p.recovery_consistency, consistency_signal)

        # Sleep
        sleep = signals.get("sleep_hours")
        if sleep is not None:
            p.ideal_sleep_hours = _ema(p.ideal_sleep_hours, sleep, alpha=0.05)
            # Deficit sensitivity: how much fatigue increases per hour lost
            fatigue = signals.get("fatigue", 30)
            deficit = max(0, p.ideal_sleep_hours - sleep)
            if deficit > 0:
                sensitivity = min(1.0, (fatigue / 100.0) / max(deficit, 0.5))
                p.sleep_deficit_sensitivity = _ema(
                    p.sleep_deficit_sensitivity, sensitivity,
                )

        # Activity
        active = signals.get("active_minutes")
        if active is not None:
            p.activity_baseline_minutes = _ema(
                p.activity_baseline_minutes, active, alpha=0.08,
            )

        # Resilience
        resilience = signals.get("resilience", signals.get("recovery_score"))
        if resilience is not None:
            p.resilience_capacity = _ema(p.resilience_capacity, resilience, alpha=0.06)

        # Intervention responsiveness (updated externally)

        # Circadian
        hrv = signals.get("hrv_ms")
        if hrv is not None:
            stability = min(1.0, hrv / 80.0)
            p.circadian_stability = _ema(p.circadian_stability, stability)

        p.update_count += 1
        p.last_updated = datetime.utcnow().isoformat()
        return p

    def update_intervention_response(
        self,
        user_id: int,
        accepted: bool,
        improvement: Optional[float] = None,
    ) -> None:
        """Update intervention responsiveness from feedback."""
        p = self.get_profile(user_id)
        if accepted and improvement is not None and improvement > 0:
            p.intervention_responsiveness = _ema(
                p.intervention_responsiveness,
                min(1.0, p.intervention_responsiveness + 0.1),
            )
        elif not accepted:
            p.intervention_responsiveness = _ema(
                p.intervention_responsiveness,
                max(0.0, p.intervention_responsiveness - 0.05),
            )

    def to_dict(self, user_id: int) -> dict:
        """Serialise the profile to a dictionary."""
        p = self.get_profile(user_id)
        return {
            "stress": {
                "baseline": round(p.stress_baseline, 2),
                "adaptation_rate": round(p.stress_adaptation_rate, 3),
                "tolerance_ceiling": round(p.stress_tolerance_ceiling, 1),
            },
            "recovery": {
                "speed": round(p.recovery_speed, 3),
                "depth": round(p.recovery_depth, 3),
                "consistency": round(p.recovery_consistency, 3),
            },
            "sleep": {
                "ideal_hours": round(p.ideal_sleep_hours, 1),
                "deficit_sensitivity": round(p.sleep_deficit_sensitivity, 3),
                "quality_baseline": round(p.sleep_quality_baseline, 1),
            },
            "activity": {
                "baseline_minutes": round(p.activity_baseline_minutes, 1),
                "tolerance": round(p.activity_tolerance, 1),
                "energy_rate": round(p.energy_expenditure_rate, 3),
            },
            "resilience": {
                "capacity": round(p.resilience_capacity, 1),
                "growth_rate": round(p.resilience_growth_rate, 4),
            },
            "intervention": {
                "responsiveness": round(p.intervention_responsiveness, 3),
                "fatigue_threshold": p.intervention_fatigue_threshold,
            },
            "circadian_stability": round(p.circadian_stability, 3),
            "update_count": p.update_count,
            "last_updated": p.last_updated,
        }
