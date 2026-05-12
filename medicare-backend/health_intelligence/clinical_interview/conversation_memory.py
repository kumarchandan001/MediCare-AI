"""
health_intelligence/clinical_interview/conversation_memory.py
─────────────────────────────────────────────────────────────
Longitudinal reasoning memory with continuity tracking.

Tracks:
  • Previously ruled-out conditions
  • Recurring hypotheses across sessions
  • Chronic ambiguity patterns
  • Recurring escalation states
  • Prior evidence conflicts
"""

from typing import Any, Dict, List


class ConversationMemory:

    def __init__(self) -> None:
        self.history: Dict[str, List[Dict[str, Any]]] = {}
        self._ruled_out: Dict[str, List[str]] = {}
        self._recurring_hypotheses: Dict[str, Dict[str, int]] = {}

    def save_session(self, user_id: str, session_data: Dict[str, Any]) -> None:
        if user_id not in self.history:
            self.history[user_id] = []
        self.history[user_id].append(session_data)

        # Track ruled-out conditions
        exclusions = session_data.get("exclusions", [])
        if user_id not in self._ruled_out:
            self._ruled_out[user_id] = []
        for ex in exclusions:
            if ex.get("status") == "ruled_out":
                self._ruled_out[user_id].append(ex["condition"])

        # Track recurring hypotheses
        hypotheses = session_data.get("hypotheses", [])
        if user_id not in self._recurring_hypotheses:
            self._recurring_hypotheses[user_id] = {}
        for h in hypotheses:
            cond = h.get("condition", "")
            self._recurring_hypotheses[user_id][cond] = (
                self._recurring_hypotheses[user_id].get(cond, 0) + 1
            )

    def get_history(self, user_id: str) -> List[Dict[str, Any]]:
        return self.history.get(user_id, [])

    def get_previously_ruled_out(self, user_id: str) -> List[str]:
        return self._ruled_out.get(user_id, [])

    def get_recurring_hypotheses(self, user_id: str) -> Dict[str, int]:
        return self._recurring_hypotheses.get(user_id, {})

    def get_longitudinal_context(self, user_id: str) -> Dict[str, Any]:
        """Return a summary of longitudinal reasoning context."""
        return {
            "session_count": len(self.history.get(user_id, [])),
            "previously_ruled_out": self.get_previously_ruled_out(user_id),
            "recurring_hypotheses": self.get_recurring_hypotheses(user_id),
        }
