"""
temporal_confidence_engine.py
─────────────────────────────
Adjusts clinical confidence based on the passage of time and progression compatibility.

Responsibilities:
  - Decay stale confidence when no new evidence arrives
  - Boost confidence when progression matches expected pattern
  - Penalize confidence when timeline is incompatible
"""

import time
from typing import Any, Dict, List

CONFIDENCE_DECAY_RATE = 0.02  # per "time unit" without updates
MAX_BOOST = 0.15
MAX_PENALTY = 0.12


class TemporalConfidenceEngine:

    def __init__(self) -> None:
        self._last_update: Dict[str, float] = {}
        self._adjustments: Dict[str, Dict[str, float]] = {}

    def record_update(self, session_id: str) -> None:
        self._last_update[session_id] = time.time()

    def compute_adjustments(
        self,
        session_id: str,
        hypotheses: List[Dict[str, Any]],
        progression_trajectory: str = "stable",
        elapsed_units: int = 0,
    ) -> Dict[str, float]:
        """Return per-condition confidence adjustments based on temporal factors."""
        adjustments: Dict[str, float] = {}

        for h in hypotheses:
            cond = h.get("condition", "")
            adj = 0.0

            # Decay: if no new evidence for a while, reduce confidence slightly
            if elapsed_units > 3:
                adj -= min(0.08, elapsed_units * CONFIDENCE_DECAY_RATE)

            # Progression compatibility
            expected = self._expected_progression(cond)
            if progression_trajectory == expected:
                adj += min(MAX_BOOST, 0.08)
            elif expected and progression_trajectory and expected != progression_trajectory:
                adj -= min(MAX_PENALTY, 0.06)

            adjustments[cond] = round(adj, 4)

        self._adjustments[session_id] = adjustments
        return adjustments

    def get_adjustments(self, session_id: str) -> Dict[str, float]:
        return self._adjustments.get(session_id, {})

    # ── internals ────────────────────────────────

    @staticmethod
    def _expected_progression(condition: str) -> str:
        """What trajectory would be typical for this condition?"""
        acute_conditions = {
            "Flu", "Food Poisoning", "Gastroenteritis", "Migraine",
            "Panic Attack", "Acute Bronchitis",
        }
        chronic_conditions = {
            "Chronic Fatigue", "Fibromyalgia", "Asthma", "Depression",
            "Anxiety", "GERD",
        }
        severe_conditions = {
            "Cardiac Event", "Pneumonia", "Stroke", "Pulmonary Embolism",
        }
        if condition in acute_conditions:
            return "improving"  # acute conditions should resolve
        if condition in chronic_conditions:
            return "stable"  # chronic conditions persist
        if condition in severe_conditions:
            return "deteriorating"  # severe conditions worsen without treatment
        return ""
