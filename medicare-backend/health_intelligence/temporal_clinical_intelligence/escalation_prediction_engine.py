"""
escalation_prediction_engine.py
───────────────────────────────
Predicts worsening risk before critical states emerge.

Responsibilities:
  - Model escalation trajectory smoothly (no sudden jumps)
  - Track escalation acceleration, stability, and reversal
  - Built-in cooldown logic to prevent alert fatigue
  - Calm, probabilistic framing only
"""

import time
from typing import Any, Dict, List

# Safety
MAX_ESCALATION_SCORE = 0.85
COOLDOWN_SECONDS = 3600  # 1 hour between repeated escalation warnings


class EscalationPredictionEngine:

    def __init__(self) -> None:
        self._history: Dict[str, List[Dict[str, Any]]] = {}
        self._last_alert_ts: Dict[str, float] = {}

    def record_state(
        self,
        session_id: str,
        deterioration_score: float,
        severity: float,
        wearable_risk: float = 0.0,
    ) -> None:
        self._history.setdefault(session_id, []).append({
            "deterioration": deterioration_score,
            "severity": severity,
            "wearable_risk": wearable_risk,
            "ts": time.time(),
        })

    def predict(self, session_id: str) -> Dict[str, Any]:
        history = self._history.get(session_id, [])
        if len(history) < 2:
            return {
                "escalation_likelihood": 0.0,
                "trajectory": "insufficient_data",
                "acceleration": 0.0,
                "should_alert": False,
                "cooldown_active": False,
                "explanation": "Not enough data to predict escalation.",
            }

        # Compute trajectory
        scores = [h["deterioration"] for h in history]
        acceleration = self._acceleration(scores)
        current = scores[-1]
        trend = self._trajectory(scores)

        # Composite escalation likelihood
        raw = (
            current * 0.5
            + acceleration * 0.3
            + history[-1].get("wearable_risk", 0) * 0.2
        )
        likelihood = min(MAX_ESCALATION_SCORE, max(0, raw))

        # Cooldown: suppress repeated alerts
        now = time.time()
        last_alert = self._last_alert_ts.get(session_id, 0)
        cooldown_active = (now - last_alert) < COOLDOWN_SECONDS
        should_alert = likelihood > 0.35 and not cooldown_active

        if should_alert:
            self._last_alert_ts[session_id] = now

        return {
            "escalation_likelihood": round(likelihood, 3),
            "trajectory": trend,
            "acceleration": round(acceleration, 4),
            "should_alert": should_alert,
            "cooldown_active": cooldown_active,
            "explanation": self._explain(likelihood, trend, cooldown_active),
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _acceleration(scores: List[float]) -> float:
        if len(scores) < 3:
            return scores[-1] - scores[-2] if len(scores) == 2 else 0.0
        d1 = scores[-1] - scores[-2]
        d2 = scores[-2] - scores[-3]
        return d1 - d2  # positive = accelerating

    @staticmethod
    def _trajectory(scores: List[float]) -> str:
        if len(scores) < 2:
            return "unknown"
        recent = scores[-3:] if len(scores) >= 3 else scores
        deltas = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
        avg = sum(deltas) / len(deltas)
        if avg > 0.05:
            return "escalating"
        if avg < -0.05:
            return "de_escalating"
        return "stable"

    @staticmethod
    def _explain(likelihood: float, trend: str, cooldown: bool) -> str:
        if likelihood < 0.15:
            return "Escalation risk is low. No immediate concerns."
        if cooldown:
            return "Elevated risk was recently noted. Monitoring continues without repeated alerts."
        if trend == "escalating":
            return (
                "There is a gradual increase in clinical concern. "
                "This does not indicate certainty of worsening, but continued monitoring is recommended."
            )
        return "Some risk indicators are present. The situation is being tracked."
