"""
temporal_evidence_mapper.py
───────────────────────────
Tracks how evidence relationships evolve over time.

Responsibilities:
  - Record evidence strength at each time step
  - Detect evidence strengthening / weakening trends
  - Map escalation and recovery pathways
"""

from typing import Any, Dict, List


class TemporalEvidenceMapper:

    def __init__(self) -> None:
        # session_id -> list of evidence snapshots
        self._snapshots: Dict[str, List[Dict[str, float]]] = {}

    def record_evidence(self, session_id: str, evidence_weights: Dict[str, float]) -> None:
        self._snapshots.setdefault(session_id, []).append(dict(evidence_weights))

    def analyse_trends(self, session_id: str) -> Dict[str, Any]:
        snaps = self._snapshots.get(session_id, [])
        if len(snaps) < 2:
            return {
                "trends": {},
                "strengthening": [],
                "weakening": [],
                "stable": [],
                "explanation": "Insufficient evidence history for trend analysis.",
            }

        first = snaps[0]
        last = snaps[-1]
        all_keys = set(first.keys()) | set(last.keys())

        trends: Dict[str, Dict[str, Any]] = {}
        strengthening = []
        weakening = []
        stable = []

        for key in all_keys:
            start = first.get(key, 0)
            end = last.get(key, 0)
            delta = end - start
            if delta > 0.05:
                label = "strengthening"
                strengthening.append(key)
            elif delta < -0.05:
                label = "weakening"
                weakening.append(key)
            else:
                label = "stable"
                stable.append(key)
            trends[key] = {
                "start": round(start, 3),
                "end": round(end, 3),
                "delta": round(delta, 3),
                "trend": label,
            }

        return {
            "trends": trends,
            "strengthening": strengthening,
            "weakening": weakening,
            "stable": stable,
            "explanation": self._explain(strengthening, weakening),
        }

    @staticmethod
    def _explain(strengthening: List[str], weakening: List[str]) -> str:
        parts = []
        if strengthening:
            parts.append(f"Evidence strengthening for: {', '.join(s.replace('_', ' ') for s in strengthening[:3])}.")
        if weakening:
            parts.append(f"Evidence weakening for: {', '.join(s.replace('_', ' ') for s in weakening[:3])}.")
        return " ".join(parts) if parts else "Evidence profile is stable."
