"""
health_intelligence/differential_reasoning/confidence_evolution_engine.py
─────────────────────────────────────────────────────────────────────────
Tracks how reasoning confidence changes over time for each hypothesis.
Maintains a per-session history of confidence snapshots.
"""

import time
from typing import Any, Dict, List


class ConfidenceEvolutionEngine:

    def __init__(self) -> None:
        # session_id → list of snapshots
        self._history: Dict[str, List[Dict[str, Any]]] = {}

    def record_evolution(
        self,
        session_id: str,
        hypotheses: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Record a confidence snapshot and return evolution data."""
        if session_id not in self._history:
            self._history[session_id] = []

        snapshot = {
            "timestamp": time.time(),
            "step": len(self._history[session_id]) + 1,
            "hypotheses": {
                h["condition"]: h["confidence"] for h in hypotheses
            },
        }
        self._history[session_id].append(snapshot)

        # Compute per-condition evolution
        evolution: Dict[str, Dict[str, Any]] = {}
        for h in hypotheses:
            cond = h["condition"]
            history = [
                s["hypotheses"].get(cond, 0)
                for s in self._history[session_id]
            ]
            if len(history) >= 2:
                delta = history[-1] - history[-2]
                trend = "increasing" if delta > 0.02 else "decreasing" if delta < -0.02 else "stable"
            else:
                delta = 0
                trend = "new"

            evolution[cond] = {
                "current": h["confidence"],
                "history": history,
                "delta": round(delta, 3),
                "trend": trend,
            }

        return {
            "step": snapshot["step"],
            "evolution": evolution,
        }

    def get_full_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Return all confidence snapshots for a session."""
        return self._history.get(session_id, [])
