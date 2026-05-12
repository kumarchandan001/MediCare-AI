"""
symptom_evolution_engine.py
───────────────────────────
Analyses how symptoms change over time.

Tracks:
  - Onset sequence
  - Worsening / improvement patterns
  - Intermittent vs persistent symptoms
  - Spreading symptoms
  - Severity fluctuations
"""

from typing import Any, Dict, List


class SymptomEvolutionEngine:

    def __init__(self) -> None:
        # session_id -> list of symptom snapshots
        self._snapshots: Dict[str, List[List[str]]] = {}
        # session_id -> symptom -> list of severity observations
        self._severity_track: Dict[str, Dict[str, List[float]]] = {}

    def record_symptoms(
        self,
        session_id: str,
        active_symptoms: List[str],
        severity_map: Dict[str, float] | None = None,
    ) -> None:
        self._snapshots.setdefault(session_id, []).append(list(active_symptoms))
        severity_map = severity_map or {}
        track = self._severity_track.setdefault(session_id, {})
        for sym in active_symptoms:
            track.setdefault(sym, []).append(severity_map.get(sym, 0.5))

    def analyse_evolution(self, session_id: str) -> Dict[str, Any]:
        snaps = self._snapshots.get(session_id, [])
        track = self._severity_track.get(session_id, {})

        if len(snaps) < 2:
            return {
                "changes": [],
                "new_symptoms": [],
                "resolved_symptoms": [],
                "persistent": [],
                "intermittent": [],
                "spreading": False,
                "explanation": "Not enough snapshots for evolution analysis.",
            }

        first = set(snaps[0])
        last = set(snaps[-1])
        all_ever = set()
        for s in snaps:
            all_ever.update(s)

        new_symptoms = sorted(last - first)
        resolved = sorted(first - last)
        persistent = sorted(first & last)

        # Intermittent: appeared, disappeared, and reappeared
        intermittent = self._detect_intermittent(snaps)

        # Per-symptom severity trend
        changes = []
        for sym, values in track.items():
            if len(values) >= 2:
                delta = values[-1] - values[0]
                trend = "worsening" if delta > 0.05 else "improving" if delta < -0.05 else "stable"
                changes.append({"symptom": sym, "trend": trend, "delta": round(delta, 3)})

        spreading = len(last) > len(first) + 1

        return {
            "changes": changes,
            "new_symptoms": new_symptoms,
            "resolved_symptoms": resolved,
            "persistent": persistent,
            "intermittent": intermittent,
            "spreading": spreading,
            "total_ever": len(all_ever),
            "explanation": self._explain(new_symptoms, resolved, persistent, spreading, intermittent),
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _detect_intermittent(snaps: List[List[str]]) -> List[str]:
        presence: Dict[str, List[bool]] = {}
        for snap in snaps:
            s = set(snap)
            for sym in presence:
                presence[sym].append(sym in s)
            for sym in s:
                if sym not in presence:
                    presence[sym] = [False] * (len(presence.get(list(presence.keys())[0] if presence else "", []))) + [True] if presence else [True]
                    presence.setdefault(sym, []).append(True) if sym not in presence else None

        # Simpler intermittent detection
        intermittent = []
        all_syms: set = set()
        for snap in snaps:
            all_syms.update(snap)

        for sym in all_syms:
            appeared_in = [sym in set(snap) for snap in snaps]
            if len(appeared_in) >= 3:
                transitions = sum(
                    1 for i in range(1, len(appeared_in)) if appeared_in[i] != appeared_in[i - 1]
                )
                if transitions >= 2:
                    intermittent.append(sym)
        return intermittent

    @staticmethod
    def _explain(new: list, resolved: list, persistent: list, spreading: bool, intermittent: list) -> str:
        parts = []
        if new:
            parts.append(f"New symptoms appeared: {', '.join(s.replace('_', ' ') for s in new)}.")
        if resolved:
            parts.append(f"Some symptoms have resolved: {', '.join(s.replace('_', ' ') for s in resolved)}.")
        if persistent:
            parts.append(f"{len(persistent)} symptom(s) remain persistent.")
        if spreading:
            parts.append("Symptoms appear to be spreading to new areas.")
        if intermittent:
            parts.append(f"Intermittent patterns detected: {', '.join(s.replace('_', ' ') for s in intermittent)}.")
        return " ".join(parts) if parts else "Symptom profile is stable."
