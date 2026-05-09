"""
health_intelligence/optimization/intervention_memory.py
───────────────────────────────────────────────
Long-term intervention tracking — remembers what
worked, what failed, and adapts strategy over time.

Tracks:
  - Intervention history
  - Repeated failures
  - Successful recovery protocols
  - Behavioral adaptation trends
  - Long-term optimization effectiveness
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class InterventionMemoryEntry:
    """A single intervention memory entry."""
    intervention_id: str
    category: str
    root_cause: str
    accepted: bool
    completed: bool
    physiological_change: Optional[float] = None
    days_since_last_similar: Optional[int] = None
    timestamp: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class InterventionMemory:
    """
    Long-term memory of intervention outcomes.
    Learns from successes and failures to improve
    future intervention selection.
    """

    def __init__(self):
        # user_id → list of entries
        self._memory: dict[int, list[InterventionMemoryEntry]] = defaultdict(list)
        self._max_entries = 500

    def remember(
        self,
        user_id: int,
        intervention_id: str,
        category: str,
        root_cause: str,
        accepted: bool,
        completed: bool = False,
        physiological_change: Optional[float] = None,
    ) -> None:
        """Store an intervention outcome."""
        # Calculate days since last similar intervention
        similar = [
            e for e in self._memory[user_id]
            if e.category == category
        ]
        days_since = None
        if similar:
            last = similar[-1]
            try:
                last_dt = datetime.fromisoformat(last.timestamp)
                days_since = (datetime.utcnow() - last_dt).days
            except (ValueError, TypeError):
                pass

        self._memory[user_id].append(InterventionMemoryEntry(
            intervention_id=intervention_id,
            category=category,
            root_cause=root_cause,
            accepted=accepted,
            completed=completed,
            physiological_change=physiological_change,
            days_since_last_similar=days_since,
        ))

        # Prune
        if len(self._memory[user_id]) > self._max_entries:
            self._memory[user_id] = self._memory[user_id][-self._max_entries:]

    def get_success_rate(
        self,
        user_id: int,
        category: Optional[str] = None,
    ) -> dict:
        """Get success rate for a category or overall."""
        entries = self._memory.get(user_id, [])
        if category:
            entries = [e for e in entries if e.category == category]

        if not entries:
            return {"rate": None, "count": 0, "status": "no_data"}

        accepted = sum(1 for e in entries if e.accepted)
        completed = sum(1 for e in entries if e.completed)
        improved = [
            e.physiological_change
            for e in entries
            if e.physiological_change is not None and e.physiological_change > 0
        ]

        return {
            "acceptance_rate": round(accepted / len(entries), 3),
            "completion_rate": round(completed / max(accepted, 1), 3),
            "improvement_rate": round(len(improved) / max(len(entries), 1), 3),
            "count": len(entries),
            "avg_improvement": (
                round(sum(improved) / len(improved), 3)
                if improved else None
            ),
        }

    def get_failed_patterns(self, user_id: int) -> list[dict]:
        """Identify repeatedly failed intervention categories."""
        entries = self._memory.get(user_id, [])
        cat_fails: dict[str, int] = defaultdict(int)
        cat_total: dict[str, int] = defaultdict(int)

        for e in entries:
            cat_total[e.category] += 1
            if not e.accepted or not e.completed:
                cat_fails[e.category] += 1

        failed: list[dict] = []
        for cat, fails in cat_fails.items():
            total = cat_total[cat]
            if total >= 3 and fails / total > 0.6:
                failed.append({
                    "category": cat,
                    "failure_rate": round(fails / total, 3),
                    "total_attempts": total,
                    "recommendation": (
                        f"User consistently resists {cat} interventions. "
                        f"Consider alternative approaches."
                    ),
                })

        return failed

    def get_best_protocols(
        self,
        user_id: int,
        root_cause: Optional[str] = None,
    ) -> list[dict]:
        """Get the most effective intervention protocols."""
        entries = self._memory.get(user_id, [])
        if root_cause:
            entries = [e for e in entries if e.root_cause == root_cause]

        # Group by category
        cat_scores: dict[str, list[float]] = defaultdict(list)
        for e in entries:
            if e.completed and e.physiological_change is not None:
                cat_scores[e.category].append(e.physiological_change)

        ranked: list[dict] = []
        for cat, scores in cat_scores.items():
            avg = sum(scores) / len(scores)
            ranked.append({
                "category": cat,
                "avg_improvement": round(avg, 3),
                "sample_size": len(scores),
                "effectiveness": "high" if avg > 0.3 else "moderate" if avg > 0 else "low",
            })

        ranked.sort(key=lambda x: x["avg_improvement"], reverse=True)
        return ranked[:5]

    def get_long_term_report(self, user_id: int) -> dict:
        """Comprehensive long-term intervention report."""
        entries = self._memory.get(user_id, [])
        return {
            "total_interventions": len(entries),
            "overall_stats": self.get_success_rate(user_id),
            "failed_patterns": self.get_failed_patterns(user_id),
            "best_protocols": self.get_best_protocols(user_id),
            "unique_categories": len(set(e.category for e in entries)),
            "assessed_at": datetime.utcnow().isoformat(),
        }
