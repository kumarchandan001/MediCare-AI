"""
recurrence_analysis_engine.py
─────────────────────────────
Identifies returning episodes of previously tracked conditions.

Responsibilities:
  - Detect recurring symptom clusters
  - Track episode frequency and intervals
  - Flag chronic recurrence patterns
"""

from typing import Any, Dict, List


class RecurrenceAnalysisEngine:

    def __init__(self) -> None:
        # user_id -> list of episode summaries
        self._episodes: Dict[str, List[Dict[str, Any]]] = {}

    def record_episode(
        self,
        user_id: str,
        symptoms: List[str],
        hypotheses: List[str],
        severity: float,
    ) -> None:
        self._episodes.setdefault(user_id, []).append({
            "symptoms": set(symptoms),
            "hypotheses": set(hypotheses),
            "severity": severity,
            "index": len(self._episodes.get(user_id, [])),
        })

    def analyse_recurrence(self, user_id: str, current_symptoms: List[str]) -> Dict[str, Any]:
        episodes = self._episodes.get(user_id, [])
        if not episodes:
            return {
                "is_recurring": False,
                "matching_episodes": 0,
                "recurrence_score": 0.0,
                "recurring_conditions": [],
                "explanation": "No prior episodes on record.",
            }

        current_set = set(current_symptoms)
        matches = []
        condition_freq: Dict[str, int] = {}

        for ep in episodes:
            overlap = current_set & ep["symptoms"]
            if len(overlap) >= 2 or (len(overlap) >= 1 and len(current_set) <= 3):
                matches.append(ep)
                for h in ep["hypotheses"]:
                    condition_freq[h] = condition_freq.get(h, 0) + 1

        recurring = sorted(condition_freq.items(), key=lambda x: -x[1])
        recurrence_score = min(0.85, len(matches) * 0.15)
        is_recurring = len(matches) >= 2

        return {
            "is_recurring": is_recurring,
            "matching_episodes": len(matches),
            "recurrence_score": round(recurrence_score, 3),
            "recurring_conditions": [{"condition": c, "count": n} for c, n in recurring[:5]],
            "explanation": self._explain(is_recurring, recurring),
        }

    @staticmethod
    def _explain(is_recurring: bool, recurring: list) -> str:
        if not is_recurring:
            return "This appears to be a new or isolated episode."
        top = recurring[0][0] if recurring else "unknown"
        return (
            f"A recurring pattern has been identified. "
            f"The most frequently associated condition is {top}. "
            f"This may indicate a chronic or episodic condition."
        )
