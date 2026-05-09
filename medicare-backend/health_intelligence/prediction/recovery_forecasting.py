"""
health_intelligence/prediction/recovery_forecasting.py
───────────────────────────────────────────────
Estimates time-to-recovery and recovery trajectory
based on current physiological state and historical
recovery patterns.

Forecasts:
  - Estimated time to return to baseline
  - Recovery trajectory (fast/normal/slow)
  - Recovery probability per hour
  - Factors aiding or hindering recovery
"""

import logging
import math
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

# Average recovery times by state (minutes)
AVG_RECOVERY_TIMES = {
    "stressed": 45,
    "fatigued": 180,
    "workout": 30,
    "abnormal": 120,
}

# Factors that speed up or slow down recovery
RECOVERY_FACTORS = {
    "positive": {
        "good_sleep": {
            "condition": lambda s: s.get("sleep_hours", 0) >= 7,
            "multiplier": 0.8,
            "label": "Good sleep (≥7h) accelerates recovery",
        },
        "low_stress": {
            "condition": lambda s: s.get("stress_level", 100) < 35,
            "multiplier": 0.85,
            "label": "Low stress environment aids recovery",
        },
        "light_activity": {
            "condition": lambda s: 10 < s.get("active_minutes", 0) < 40,
            "multiplier": 0.9,
            "label": "Light activity promotes recovery",
        },
    },
    "negative": {
        "poor_sleep": {
            "condition": lambda s: s.get("sleep_hours", 8) < 5.5,
            "multiplier": 1.4,
            "label": "Poor sleep (<5.5h) delays recovery",
        },
        "high_stress": {
            "condition": lambda s: s.get("stress_level", 0) > 65,
            "multiplier": 1.3,
            "label": "High stress impedes recovery",
        },
        "overexertion": {
            "condition": lambda s: s.get("active_minutes", 0) > 90,
            "multiplier": 1.25,
            "label": "Overexertion slows recovery",
        },
        "elevated_hr": {
            "condition": lambda s: s.get("heart_rate_bpm", 70) > 95,
            "multiplier": 1.15,
            "label": "Elevated resting HR suggests incomplete recovery",
        },
    },
}


class RecoveryForecaster:
    """
    Estimates recovery trajectories and time-to-baseline
    based on current state and historical patterns.
    """

    def __init__(self):
        # user_id → list of past recovery durations
        self._recovery_history: dict[int, list[float]] = {}

    def forecast_recovery(
        self,
        user_id: int,
        current_state: str,
        current_signals: dict[str, float],
        personal_recovery_rate: Optional[float] = None,
    ) -> dict:
        """
        Forecast recovery timeline from current state.

        Args:
            user_id: User ID
            current_state: Current physiological state
            current_signals: Current biometric values
            personal_recovery_rate: Learned personal recovery multiplier

        Returns:
            Recovery forecast with timeline, trajectory, and factors.
        """
        # Base recovery time
        base_minutes = AVG_RECOVERY_TIMES.get(current_state, 60)

        # Apply personal recovery rate
        personal_mult = personal_recovery_rate or 1.0
        adjusted = base_minutes * personal_mult

        # Apply recovery factors
        positive_factors: list[str] = []
        negative_factors: list[str] = []
        combined_multiplier = 1.0

        for factor_name, factor in RECOVERY_FACTORS["positive"].items():
            try:
                if factor["condition"](current_signals):
                    combined_multiplier *= factor["multiplier"]
                    positive_factors.append(factor["label"])
            except Exception:
                pass

        for factor_name, factor in RECOVERY_FACTORS["negative"].items():
            try:
                if factor["condition"](current_signals):
                    combined_multiplier *= factor["multiplier"]
                    negative_factors.append(factor["label"])
            except Exception:
                pass

        estimated_minutes = adjusted * combined_multiplier

        # Trajectory classification
        if combined_multiplier < 0.85:
            trajectory = "fast"
        elif combined_multiplier > 1.2:
            trajectory = "slow"
        else:
            trajectory = "normal"

        # Probability curve: recovery probability per hour
        hourly_probs = []
        total_hours = max(1, estimated_minutes / 60)
        for h in range(1, min(int(total_hours * 2), 25)):
            # Sigmoid-like recovery probability
            progress = h / total_hours
            prob = 1.0 / (1.0 + math.exp(-5 * (progress - 1.0)))
            hourly_probs.append({
                "hour": h,
                "recovery_probability": round(prob, 3),
            })

        # Confidence based on data availability and history
        history = self._recovery_history.get(user_id, [])
        confidence = min(
            0.85,
            0.4 + len(history) * 0.03 + (
                0.1 if positive_factors or negative_factors else 0
            ),
        )

        # Record for future learning
        if user_id not in self._recovery_history:
            self._recovery_history[user_id] = []

        return {
            "current_state": current_state,
            "estimated_recovery_minutes": round(estimated_minutes, 0),
            "estimated_recovery_hours": round(estimated_minutes / 60, 1),
            "trajectory": trajectory,
            "recovery_multiplier": round(combined_multiplier, 3),
            "positive_factors": positive_factors,
            "negative_factors": negative_factors,
            "hourly_probabilities": hourly_probs,
            "confidence": round(confidence, 3),
            "recommendations": self._generate_recommendations(
                current_state, negative_factors,
            ),
            "forecasted_at": datetime.utcnow().isoformat(),
        }

    def record_completed_recovery(
        self,
        user_id: int,
        duration_minutes: float,
    ) -> None:
        """Record a completed recovery for learning."""
        if user_id not in self._recovery_history:
            self._recovery_history[user_id] = []
        self._recovery_history[user_id].append(duration_minutes)
        if len(self._recovery_history[user_id]) > 50:
            self._recovery_history[user_id] = (
                self._recovery_history[user_id][-50:]
            )

    def get_personal_recovery_rate(
        self,
        user_id: int,
    ) -> Optional[float]:
        """
        Compute personal recovery rate multiplier based on
        historical recovery durations.

        < 1.0 = recovers faster than average
        > 1.0 = recovers slower than average
        """
        history = self._recovery_history.get(user_id, [])
        if len(history) < 3:
            return None

        avg_personal = sum(history) / len(history)
        avg_population = 60  # 1 hour average baseline
        return round(avg_personal / avg_population, 3)

    @staticmethod
    def _generate_recommendations(
        state: str,
        negative_factors: list[str],
    ) -> list[str]:
        """Generate actionable recovery recommendations."""
        recs = []

        if state == "stressed":
            recs.append("Consider deep breathing or a short walk.")
            recs.append("Reduce screen time and cognitive load.")
        elif state == "fatigued":
            recs.append("Prioritize sleep tonight (aim for 8+ hours).")
            recs.append("Avoid intense exercise until recovered.")
        elif state == "workout":
            recs.append("Hydrate and have a protein-rich meal.")
            recs.append("Light stretching can aid muscle recovery.")

        if any("sleep" in f.lower() for f in negative_factors):
            recs.append("Sleep deficit is slowing recovery — prioritize rest.")

        if any("stress" in f.lower() for f in negative_factors):
            recs.append("Stress is impeding recovery — try relaxation techniques.")

        return recs[:4]
