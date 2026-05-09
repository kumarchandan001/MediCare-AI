"""
health_intelligence/prediction/risk_projection.py
───────────────────────────────────────────────
Projects forward wellness decline risk based on
current trajectory and context.

Different from disease prediction — this identifies
when the user is on a trajectory toward:
  - Burnout (sustained high stress + low sleep)
  - Immune vulnerability (fatigue + low activity)
  - Cardiovascular strain (persistent high HR)
  - Sleep debt crisis (cumulative deficit)

Every projection is probabilistic with uncertainty.
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

# Risk scenario definitions
RISK_SCENARIOS = {
    "burnout_risk": {
        "triggers": {
            "stress_level": ("above", 60),
            "sleep_hours": ("below", 6.5),
        },
        "min_triggers": 2,
        "base_risk": 0.4,
        "escalation_per_day": 0.05,
        "description": "Sustained high stress with insufficient sleep",
    },
    "immune_vulnerability": {
        "triggers": {
            "sleep_hours": ("below", 6),
            "stress_level": ("above", 55),
            "active_minutes": ("below", 15),
        },
        "min_triggers": 2,
        "base_risk": 0.3,
        "escalation_per_day": 0.04,
        "description": "Low sleep + high stress + sedentary pattern",
    },
    "cardiovascular_strain": {
        "triggers": {
            "heart_rate_bpm": ("above", 90),
            "stress_level": ("above", 65),
        },
        "min_triggers": 2,
        "base_risk": 0.25,
        "escalation_per_day": 0.03,
        "description": "Persistently elevated resting HR with high stress",
    },
    "sleep_debt_crisis": {
        "triggers": {
            "sleep_hours": ("below", 5.5),
        },
        "min_triggers": 1,
        "base_risk": 0.35,
        "escalation_per_day": 0.06,
        "description": "Critical sleep deficit accumulating",
    },
    "fatigue_spiral": {
        "triggers": {
            "sleep_hours": ("below", 6),
            "active_minutes": ("below", 10),
            "stress_level": ("above", 50),
        },
        "min_triggers": 2,
        "base_risk": 0.3,
        "escalation_per_day": 0.04,
        "description": "Fatigue reducing activity, reducing sleep quality",
    },
}


class RiskProjectionEngine:
    """
    Projects forward wellness decline risk based on
    current metrics and sustained patterns.
    """

    def __init__(self):
        # user_id → scenario → consecutive days triggered
        self._sustained_days: dict[int, dict[str, int]] = {}

    def assess_risks(
        self,
        user_id: int,
        current_signals: dict[str, float],
        trend_direction: str = "stable",
        recovery_state: Optional[str] = None,
    ) -> dict:
        """
        Assess all risk scenarios against current signals.

        Returns comprehensive risk projection report.
        """
        if user_id not in self._sustained_days:
            self._sustained_days[user_id] = {}

        risks: list[dict] = []
        overall_risk = 0.0

        for scenario_name, config in RISK_SCENARIOS.items():
            result = self._assess_scenario(
                user_id, scenario_name, config,
                current_signals, trend_direction,
            )
            if result["active"]:
                risks.append(result)
                overall_risk = max(overall_risk, result["risk_level"])

        # Trend modifier
        if trend_direction == "declining":
            overall_risk = min(1.0, overall_risk * 1.2)
        elif trend_direction == "improving":
            overall_risk *= 0.8

        # Recovery modifier
        if recovery_state == "declining":
            overall_risk = min(1.0, overall_risk * 1.15)

        # Classification
        if overall_risk >= 0.7:
            risk_class = "high"
        elif overall_risk >= 0.4:
            risk_class = "moderate"
        elif overall_risk >= 0.2:
            risk_class = "low"
        else:
            risk_class = "minimal"

        return {
            "overall_risk": round(overall_risk, 3),
            "risk_classification": risk_class,
            "active_risks": risks,
            "risk_count": len(risks),
            "trend_modifier": trend_direction,
            "assessed_at": datetime.utcnow().isoformat(),
        }

    def _assess_scenario(
        self,
        user_id: int,
        name: str,
        config: dict,
        signals: dict[str, float],
        trend: str,
    ) -> dict:
        """Assess a single risk scenario."""
        triggers = config["triggers"]
        matched = 0
        matched_details: list[dict] = []

        for metric, (direction, threshold) in triggers.items():
            value = signals.get(metric)
            if value is None:
                continue

            triggered = False
            if direction == "above" and value > threshold:
                triggered = True
            elif direction == "below" and value < threshold:
                triggered = True

            if triggered:
                matched += 1
                matched_details.append({
                    "metric": metric,
                    "value": round(value, 1),
                    "threshold": threshold,
                    "direction": direction,
                })

        active = matched >= config["min_triggers"]

        # Track sustained days
        if active:
            prev = self._sustained_days[user_id].get(name, 0)
            self._sustained_days[user_id][name] = prev + 1
        else:
            self._sustained_days[user_id][name] = 0

        sustained = self._sustained_days[user_id].get(name, 0)

        # Risk escalates with sustained days
        risk_level = 0.0
        if active:
            risk_level = min(
                0.95,
                config["base_risk"]
                + config["escalation_per_day"] * sustained,
            )
            if trend == "declining":
                risk_level = min(0.95, risk_level * 1.15)

        # Time-to-impact estimate (days until >0.7 risk)
        time_to_impact = None
        if active and risk_level < 0.7:
            remaining = 0.7 - risk_level
            daily_esc = config["escalation_per_day"]
            if daily_esc > 0:
                time_to_impact = int(remaining / daily_esc)

        return {
            "scenario": name,
            "active": active,
            "risk_level": round(risk_level, 3),
            "sustained_days": sustained,
            "triggers_matched": matched,
            "triggers_required": config["min_triggers"],
            "matched_details": matched_details,
            "description": config["description"],
            "time_to_high_risk_days": time_to_impact,
            "message": (
                f"{config['description']}. "
                f"Risk: {risk_level:.0%} "
                f"(sustained {sustained} day{'s' if sustained != 1 else ''})."
                if active else f"{name}: not active"
            ),
        }

    def reset_user(self, user_id: int) -> None:
        """Reset sustained day counts for a user."""
        self._sustained_days.pop(user_id, None)
