"""
progression_engine.py
─────────────────────
Tracks clinical progression trajectories and scores their stability.

Responsibilities:
  - Compute a progression stability score per session
  - Detect whether progression is stable / improving / fluctuating / deteriorating
  - Flag unstable trajectories for downstream reasoning
"""

from typing import Any, Dict, List

# Safety constants
MAX_STABILITY = 1.0
MIN_STABILITY = 0.0


class ProgressionEngine:
    """Scores the stability of a patient's clinical trajectory."""

    def __init__(self) -> None:
        # session_id -> list of snapshot dicts
        self._history: Dict[str, List[Dict[str, Any]]] = {}

    # ── public API ───────────────────────────────

    def record_snapshot(
        self,
        session_id: str,
        severity_score: float,
        symptom_count: int,
        wearable_summary: Dict[str, Any] | None = None,
    ) -> None:
        """Append a point-in-time clinical snapshot."""
        entry = {
            "severity": severity_score,
            "symptom_count": symptom_count,
            "wearable": wearable_summary or {},
            "ts": len(self._history.get(session_id, [])),
        }
        self._history.setdefault(session_id, []).append(entry)

    def evaluate_trajectory(self, session_id: str) -> Dict[str, Any]:
        """Return the trajectory assessment for the session."""
        snaps = self._history.get(session_id, [])
        if len(snaps) < 2:
            return {
                "trajectory": "insufficient_data",
                "stability_score": 0.5,
                "trend": "unknown",
                "volatility": 0.0,
                "explanation": "Not enough data points to assess trajectory.",
            }

        severities = [s["severity"] for s in snaps]
        deltas = [severities[i] - severities[i - 1] for i in range(1, len(severities))]
        avg_delta = sum(deltas) / len(deltas)
        volatility = self._volatility(deltas)

        trajectory = self._classify_trajectory(avg_delta, volatility)
        stability = max(MIN_STABILITY, min(MAX_STABILITY, 1.0 - volatility))

        return {
            "trajectory": trajectory,
            "stability_score": round(stability, 3),
            "trend": "improving" if avg_delta < -0.02 else "worsening" if avg_delta > 0.02 else "stable",
            "volatility": round(volatility, 3),
            "avg_delta": round(avg_delta, 4),
            "snapshot_count": len(snaps),
            "explanation": self._explain(trajectory, avg_delta, volatility),
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _volatility(deltas: List[float]) -> float:
        if not deltas:
            return 0.0
        mean = sum(deltas) / len(deltas)
        variance = sum((d - mean) ** 2 for d in deltas) / len(deltas)
        return min(1.0, variance ** 0.5)

    @staticmethod
    def _classify_trajectory(avg_delta: float, volatility: float) -> str:
        if volatility > 0.3:
            return "fluctuating"
        if avg_delta < -0.05:
            return "improving"
        if avg_delta > 0.05:
            return "deteriorating"
        return "stable"

    @staticmethod
    def _explain(trajectory: str, avg_delta: float, volatility: float) -> str:
        labels = {
            "stable": "Clinical progression appears steady with no significant changes.",
            "improving": "There is a consistent trend toward improvement.",
            "deteriorating": "There is a trend toward worsening that warrants attention.",
            "fluctuating": "Symptoms are fluctuating unpredictably, making progression uncertain.",
        }
        return labels.get(trajectory, "Insufficient data to characterise progression.")
