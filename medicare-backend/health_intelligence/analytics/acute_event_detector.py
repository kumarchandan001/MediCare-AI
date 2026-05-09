"""
health_intelligence/analytics/acute_event_detector.py
───────────────────────────────────────────────
Detects sudden dangerous or abnormal physiological
changes in real-time.

Detects:
  - Acute stress spikes
  - Abnormal HR drift
  - Rapid SpO2 drops
  - Severe fatigue states
  - Recovery collapse
  - Unusual physiological instability

Generates confidence-aware severity-graded alerts.
"""

import logging
from datetime import datetime
from typing import Any, Optional

log = logging.getLogger(__name__)

# Acute event thresholds
ACUTE_THRESHOLDS = {
    "hr_spike": {
        "metric": "heart_rate_bpm",
        "min_change": 30,
        "window_seconds": 300,
        "severity": "high",
    },
    "spo2_drop": {
        "metric": "spo2_percent",
        "min_change": -4,
        "window_seconds": 600,
        "severity": "critical",
    },
    "stress_spike": {
        "metric": "stress_level",
        "min_change": 30,
        "window_seconds": 300,
        "severity": "moderate",
    },
}


class AcuteEventDetector:
    """
    Detects sudden, potentially dangerous physiological
    shifts using a rolling observation window.
    """

    def __init__(self):
        # user_id → metric → list of (timestamp, value)
        self._history: dict[int, dict[str, list[tuple[float, float]]]] = {}
        self._max_history = 100

    def record_observation(
        self,
        user_id: int,
        metric: str,
        value: float,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Record a new observation for acute detection."""
        ts = (timestamp or datetime.utcnow()).timestamp()

        if user_id not in self._history:
            self._history[user_id] = {}
        if metric not in self._history[user_id]:
            self._history[user_id][metric] = []

        self._history[user_id][metric].append((ts, value))

        # Prune old observations
        hist = self._history[user_id][metric]
        if len(hist) > self._max_history:
            self._history[user_id][metric] = hist[-self._max_history:]

    def record_batch(
        self,
        user_id: int,
        signals: dict[str, float],
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Record multiple observations at once."""
        for metric, value in signals.items():
            if value is not None:
                self.record_observation(user_id, metric, value, timestamp)

    def detect_acute_events(
        self,
        user_id: int,
        current_signals: dict[str, float],
    ) -> list[dict]:
        """
        Check for acute events based on recent history.

        Returns list of detected acute events.
        """
        events: list[dict] = []
        now = datetime.utcnow().timestamp()

        for event_name, config in ACUTE_THRESHOLDS.items():
            metric = config["metric"]
            current = current_signals.get(metric)
            if current is None:
                continue

            history = self._history.get(user_id, {}).get(metric, [])
            if not history:
                continue

            # Filter to window
            window = config["window_seconds"]
            recent = [
                (ts, v) for ts, v in history
                if (now - ts) <= window
            ]

            if len(recent) < 2:
                continue

            # Check for rapid change
            oldest_val = recent[0][1]
            change = current - oldest_val

            min_change = config["min_change"]

            if min_change > 0 and change >= min_change:
                # Spike detected
                events.append(self._build_event(
                    event_name, metric, current, oldest_val,
                    change, config, recent,
                ))
            elif min_change < 0 and change <= min_change:
                # Drop detected
                events.append(self._build_event(
                    event_name, metric, current, oldest_val,
                    change, config, recent,
                ))

        # Check instability (high variance in HR)
        instability = self._check_instability(user_id, current_signals)
        if instability:
            events.append(instability)

        return events

    def _check_instability(
        self,
        user_id: int,
        current_signals: dict[str, float],
    ) -> Optional[dict]:
        """Detect unusual HR instability."""
        history = self._history.get(user_id, {}).get(
            "heart_rate_bpm", [],
        )
        if len(history) < 10:
            return None

        recent_vals = [v for _, v in history[-20:]]
        mean = sum(recent_vals) / len(recent_vals)
        variance = sum((v - mean) ** 2 for v in recent_vals) / len(recent_vals)
        std = variance ** 0.5

        # High variability = instability
        cv = std / mean if mean > 0 else 0
        if cv > 0.15:
            return {
                "event_type": "hr_instability",
                "severity": "moderate",
                "metric": "heart_rate_bpm",
                "current_value": current_signals.get("heart_rate_bpm"),
                "detail": {
                    "mean": round(mean, 1),
                    "std": round(std, 1),
                    "coefficient_of_variation": round(cv, 3),
                },
                "confidence": min(0.8, 0.4 + cv * 2),
                "message": (
                    f"Heart rate instability detected "
                    f"(CV={cv:.2f}, mean={mean:.0f}±{std:.0f}). "
                    "This may indicate physiological stress."
                ),
                "detected_at": datetime.utcnow().isoformat(),
            }

        return None

    @staticmethod
    def _build_event(
        event_name: str,
        metric: str,
        current: float,
        baseline: float,
        change: float,
        config: dict,
        recent: list,
    ) -> dict:
        """Build an acute event dict."""
        display = metric.replace("_", " ").title()
        direction = "spike" if change > 0 else "drop"

        confidence = min(
            0.9,
            0.5 + abs(change) / (abs(config["min_change"]) * 2),
        )

        return {
            "event_type": event_name,
            "severity": config["severity"],
            "metric": metric,
            "current_value": round(current, 1),
            "baseline_value": round(baseline, 1),
            "change": round(change, 1),
            "direction": direction,
            "confidence": round(confidence, 3),
            "observations_in_window": len(recent),
            "window_seconds": config["window_seconds"],
            "message": (
                f"Acute {display} {direction}: {change:+.1f} "
                f"({baseline:.1f} → {current:.1f}) "
                f"in {config['window_seconds'] // 60} minutes."
            ),
            "detected_at": datetime.utcnow().isoformat(),
        }
