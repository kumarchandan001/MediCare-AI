"""
health_intelligence/deterioration/early_deterioration_detector.py
───────────────────────────────────────────────
Detects slow, hidden wellness decline BEFORE acute
issues appear by monitoring multi-signal convergence.

Detects:
  - Chronic fatigue accumulation
  - Resilience collapse
  - Sleep debt progression
  - Stress overload (sustained)
  - Recovery instability
  - Wellness degradation

Each detection includes:
  - deterioration_severity (0–1)
  - intervention_urgency (low/moderate/high/critical)
  - progression_confidence
  - contributing_signals
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class DeteriorationSignal:
    """A single deterioration indicator."""
    name: str
    severity: float           # 0–1
    confidence: float
    contributing_metrics: list[str]
    days_active: int
    explanation: str


# Deterioration detection rules
DETERIORATION_RULES = {
    "chronic_fatigue": {
        "indicators": [
            ("sleep_hours", "below", 6.5),
            ("stress_level", "above", 50),
            ("active_minutes", "below", 15),
        ],
        "min_indicators": 2,
        "base_severity": 0.4,
        "escalation_per_day": 0.03,
        "explanation": "Sustained fatigue from inadequate sleep and elevated stress",
    },
    "resilience_collapse": {
        "indicators": [
            ("recovery_score", "below", 50),
            ("stress_level", "above", 55),
            ("heart_rate_bpm", "above", 82),
        ],
        "min_indicators": 2,
        "base_severity": 0.5,
        "escalation_per_day": 0.04,
        "explanation": "Recovery systems weakening under sustained stress load",
    },
    "sleep_debt_crisis": {
        "indicators": [
            ("sleep_hours", "below", 5.5),
        ],
        "min_indicators": 1,
        "base_severity": 0.45,
        "escalation_per_day": 0.05,
        "explanation": "Critical sleep deficit accumulating with cascading effects",
    },
    "stress_overload": {
        "indicators": [
            ("stress_level", "above", 65),
            ("heart_rate_bpm", "above", 85),
            ("hrv_ms", "below", 25),
        ],
        "min_indicators": 2,
        "base_severity": 0.55,
        "escalation_per_day": 0.04,
        "explanation": "Sustained stress exceeding recovery capacity",
    },
    "recovery_instability": {
        "indicators": [
            ("recovery_score", "below", 40),
            ("sleep_hours", "below", 6),
            ("stress_level", "above", 50),
        ],
        "min_indicators": 2,
        "base_severity": 0.4,
        "escalation_per_day": 0.03,
        "explanation": "Recovery patterns becoming unpredictable and unreliable",
    },
    "wellness_degradation": {
        "indicators": [
            ("wellness_score", "below", 50),
            ("active_minutes", "below", 10),
            ("sleep_hours", "below", 6),
        ],
        "min_indicators": 2,
        "base_severity": 0.35,
        "escalation_per_day": 0.025,
        "explanation": "Overall wellness declining across multiple dimensions",
    },
}


class EarlyDeteriorationDetector:
    """
    Detects slow wellness deterioration before it
    becomes an acute health concern.
    """

    def __init__(self):
        # user_id → rule_name → consecutive days active
        self._sustained: dict[int, dict[str, int]] = defaultdict(
            lambda: defaultdict(int),
        )

    def detect(
        self,
        user_id: int,
        current_signals: dict[str, float],
    ) -> dict:
        """
        Run all deterioration detection rules.

        Returns comprehensive deterioration report.
        """
        detections: list[dict] = []
        max_severity = 0.0

        for rule_name, config in DETERIORATION_RULES.items():
            result = self._evaluate_rule(
                user_id, rule_name, config, current_signals,
            )
            if result.severity > 0:
                detections.append({
                    "name": result.name,
                    "severity": result.severity,
                    "confidence": result.confidence,
                    "contributing_metrics": result.contributing_metrics,
                    "days_active": result.days_active,
                    "explanation": result.explanation,
                    "urgency": self._classify_urgency(result.severity),
                })
                max_severity = max(max_severity, result.severity)

        # Sort by severity
        detections.sort(key=lambda d: d["severity"], reverse=True)

        # Overall assessment
        if max_severity >= 0.7:
            overall = "critical_deterioration"
        elif max_severity >= 0.5:
            overall = "significant_deterioration"
        elif max_severity >= 0.3:
            overall = "mild_deterioration"
        elif detections:
            overall = "early_warning"
        else:
            overall = "stable"

        return {
            "user_id": user_id,
            "overall_assessment": overall,
            "max_severity": round(max_severity, 3),
            "active_deteriorations": len(detections),
            "detections": detections,
            "needs_escalation": max_severity >= 0.7,
            "assessed_at": datetime.utcnow().isoformat(),
        }

    def _evaluate_rule(
        self,
        user_id: int,
        rule_name: str,
        config: dict,
        signals: dict[str, float],
    ) -> DeteriorationSignal:
        """Evaluate a single deterioration rule."""
        indicators = config["indicators"]
        matched: list[str] = []

        for metric, direction, threshold in indicators:
            value = signals.get(metric)
            if value is None:
                continue

            if direction == "above" and value > threshold:
                matched.append(metric)
            elif direction == "below" and value < threshold:
                matched.append(metric)

        is_active = len(matched) >= config["min_indicators"]

        if is_active:
            self._sustained[user_id][rule_name] += 1
        else:
            self._sustained[user_id][rule_name] = 0

        days = self._sustained[user_id][rule_name]

        severity = 0.0
        if is_active:
            severity = min(
                0.95,
                config["base_severity"]
                + config["escalation_per_day"] * days,
            )

        confidence = min(0.85, 0.3 + len(matched) * 0.15 + days * 0.02)

        return DeteriorationSignal(
            name=rule_name,
            severity=round(severity, 3),
            confidence=round(confidence, 3),
            contributing_metrics=matched,
            days_active=days,
            explanation=config["explanation"] if is_active else "",
        )

    @staticmethod
    def _classify_urgency(severity: float) -> str:
        if severity >= 0.7:
            return "critical"
        elif severity >= 0.5:
            return "high"
        elif severity >= 0.3:
            return "moderate"
        return "low"
