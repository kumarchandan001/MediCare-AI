"""
health_intelligence/differential_reasoning/hypothesis_stability_tracker.py
──────────────────────────────────────────────────────────────────────────
Tracks how stable or volatile each hypothesis is across investigation steps.

Key metrics:
  • stability_score   — 0 (highly volatile) to 1 (very stable)
  • volatility_flag   — True when confidence swings exceed threshold
  • pressure_score    — accumulated contradictory pressure
"""

from typing import Any, Dict, List


class HypothesisStabilityTracker:

    VOLATILITY_THRESHOLD = 0.08   # confidence swing per step

    def __init__(self) -> None:
        # session_id → { condition → list of confidence values }
        self._tracking: Dict[str, Dict[str, List[float]]] = {}

    def update(
        self,
        session_id: str,
        hypotheses: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Record current confidences and compute stability metrics."""
        if session_id not in self._tracking:
            self._tracking[session_id] = {}

        session = self._tracking[session_id]
        per_condition: Dict[str, Dict[str, Any]] = {}
        volatile_count = 0

        for h in hypotheses:
            cond = h["condition"]
            conf = h["confidence"]

            if cond not in session:
                session[cond] = []
            session[cond].append(conf)
            history = session[cond]

            # Stability: based on variance over recent steps
            if len(history) >= 2:
                recent = history[-5:]
                avg = sum(recent) / len(recent)
                variance = sum((x - avg) ** 2 for x in recent) / len(recent)
                stability = max(0, 1.0 - variance * 20)
                delta = abs(history[-1] - history[-2])
                is_volatile = delta > self.VOLATILITY_THRESHOLD
            else:
                stability = 0.5
                is_volatile = False
                delta = 0

            if is_volatile:
                volatile_count += 1

            per_condition[cond] = {
                "stability_score": round(stability, 3),
                "is_volatile": is_volatile,
                "last_delta": round(delta, 3),
                "steps_tracked": len(history),
                "label": "stable" if stability > 0.7 else "moderate" if stability > 0.4 else "volatile",
            }

        return {
            "conditions": per_condition,
            "volatile_count": volatile_count,
            "overall_stability": "stable" if volatile_count == 0 else "unstable",
        }
