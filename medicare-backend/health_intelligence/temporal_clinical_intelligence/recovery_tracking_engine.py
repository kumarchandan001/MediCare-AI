"""
recovery_tracking_engine.py
───────────────────────────
Tracks recovery depth, fragility, and relapse probability.

Responsibilities:
  - Score recovery quality (not just symptom reduction)
  - Detect fragile / unstable recovery states
  - Estimate relapse probability
  - Track recovery milestones
  - Identify incomplete recovery and recovery fatigue
"""

from typing import Any, Dict, List

MAX_RECOVERY_CONFIDENCE = 0.90


class RecoveryTrackingEngine:

    def __init__(self) -> None:
        self._history: Dict[str, List[Dict[str, Any]]] = {}

    def record_state(
        self,
        session_id: str,
        severity: float,
        symptom_count: int,
        wearable: Dict[str, Any] | None = None,
    ) -> None:
        self._history.setdefault(session_id, []).append({
            "severity": severity,
            "symptom_count": symptom_count,
            "wearable": wearable or {},
        })

    def assess_recovery(self, session_id: str) -> Dict[str, Any]:
        history = self._history.get(session_id, [])
        if len(history) < 2:
            return {
                "is_recovering": False,
                "recovery_quality": 0.0,
                "fragility": 0.0,
                "relapse_probability": 0.0,
                "milestones": [],
                "explanation": "Not enough data to assess recovery.",
            }

        severities = [s["severity"] for s in history]
        peak = max(severities)
        current = severities[-1]
        improvement = max(0, peak - current)

        # Consistency: are improvements sustained?
        consistency = self._recovery_consistency(severities)
        fragility = 1.0 - consistency

        # Relapse probability based on volatility
        relapse_prob = self._relapse_probability(severities)

        # Recovery quality: deep, sustained improvement
        quality = min(MAX_RECOVERY_CONFIDENCE, improvement * consistency)

        is_recovering = current < peak and quality > 0.05
        milestones = self._detect_milestones(severities)

        return {
            "is_recovering": is_recovering,
            "recovery_quality": round(quality, 3),
            "consistency": round(consistency, 3),
            "fragility": round(fragility, 3),
            "relapse_probability": round(relapse_prob, 3),
            "peak_severity": round(peak, 3),
            "current_severity": round(current, 3),
            "improvement": round(improvement, 3),
            "milestones": milestones,
            "explanation": self._explain(is_recovering, quality, fragility, relapse_prob),
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _recovery_consistency(severities: List[float]) -> float:
        """How consistently severity has been decreasing."""
        if len(severities) < 2:
            return 0.5
        improving_steps = sum(
            1 for i in range(1, len(severities)) if severities[i] <= severities[i - 1]
        )
        return improving_steps / (len(severities) - 1)

    @staticmethod
    def _relapse_probability(severities: List[float]) -> float:
        """Estimate relapse risk from bounce-back patterns."""
        if len(severities) < 3:
            return 0.1
        bounces = sum(
            1
            for i in range(2, len(severities))
            if severities[i] > severities[i - 1] and severities[i - 1] < severities[i - 2]
        )
        return min(0.85, bounces * 0.2 + 0.05)

    @staticmethod
    def _detect_milestones(severities: List[float]) -> List[Dict[str, Any]]:
        milestones = []
        peak = max(severities)
        if peak == 0:
            return milestones
        current = severities[-1]
        reduction_pct = (peak - current) / peak
        if reduction_pct >= 0.25:
            milestones.append({"label": "25% improvement", "reached": True})
        if reduction_pct >= 0.50:
            milestones.append({"label": "50% improvement", "reached": True})
        if reduction_pct >= 0.75:
            milestones.append({"label": "75% improvement", "reached": True})
        return milestones

    @staticmethod
    def _explain(is_recovering: bool, quality: float, fragility: float, relapse: float) -> str:
        if not is_recovering:
            return "No clear recovery trend has been established yet."
        parts = []
        if quality > 0.5:
            parts.append("Recovery appears sustained and meaningful.")
        elif quality > 0.2:
            parts.append("Some improvement has been observed.")
        else:
            parts.append("Early signs of improvement are present but not yet well-established.")
        if fragility > 0.5:
            parts.append("However, recovery appears fragile and may not be sustained.")
        if relapse > 0.4:
            parts.append("There is a notable pattern of bounce-back that warrants monitoring.")
        return " ".join(parts)
