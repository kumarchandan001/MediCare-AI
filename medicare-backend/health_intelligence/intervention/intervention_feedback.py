"""
health_intelligence/intervention/intervention_feedback.py
───────────────────────────────────────────────
Tracks intervention effectiveness over time and learns
which interventions work best per user.

Tracks:
  - Acceptance (did user start it?)
  - Adherence (did user follow through?)
  - Physiological response (did metrics improve?)
  - Intervention fatigue (diminishing returns)
  - Behavioral resistance patterns

Enables the system to learn and adapt future
intervention selection.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class InterventionRecord:
    """A single intervention interaction record."""
    intervention_id: str
    category: str
    accepted: bool
    completed: bool = False
    physiological_improvement: Optional[float] = None  # -1 to +1
    user_rating: Optional[int] = None                  # 1–5
    created_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class InterventionFeedbackTracker:
    """
    Learns which interventions are effective for each user
    by tracking acceptance, completion, and physiological response.
    """

    def __init__(self):
        # user_id → list of records
        self._records: dict[int, list[InterventionRecord]] = defaultdict(list)
        self._max_records = 200

    def record_offered(
        self,
        user_id: int,
        intervention_id: str,
        category: str,
        accepted: bool,
    ) -> None:
        """Record that an intervention was offered."""
        self._records[user_id].append(InterventionRecord(
            intervention_id=intervention_id,
            category=category,
            accepted=accepted,
        ))
        self._prune(user_id)

    def record_completion(
        self,
        user_id: int,
        intervention_id: str,
        completed: bool,
        physiological_improvement: Optional[float] = None,
        user_rating: Optional[int] = None,
    ) -> None:
        """Record completion and physiological response."""
        for rec in reversed(self._records.get(user_id, [])):
            if rec.intervention_id == intervention_id:
                rec.completed = completed
                rec.physiological_improvement = physiological_improvement
                rec.user_rating = user_rating
                break

    def get_category_effectiveness(
        self,
        user_id: int,
        category: str,
    ) -> dict:
        """
        Get effectiveness metrics for a category.
        """
        records = [
            r for r in self._records.get(user_id, [])
            if r.category == category
        ]

        if not records:
            return {
                "category": category,
                "status": "no_data",
                "effectiveness": None,
            }

        accepted = sum(1 for r in records if r.accepted)
        completed = sum(1 for r in records if r.completed)
        total = len(records)

        improvements = [
            r.physiological_improvement
            for r in records
            if r.physiological_improvement is not None
        ]
        avg_improvement = (
            sum(improvements) / len(improvements)
            if improvements else None
        )

        ratings = [r.user_rating for r in records if r.user_rating]
        avg_rating = sum(ratings) / len(ratings) if ratings else None

        # Detect intervention fatigue: declining acceptance
        if total >= 6:
            first_half = records[:total // 2]
            second_half = records[total // 2:]
            first_rate = sum(1 for r in first_half if r.accepted) / len(first_half)
            second_rate = sum(1 for r in second_half if r.accepted) / len(second_half)
            fatigue = first_rate - second_rate > 0.15
        else:
            fatigue = False

        # Effectiveness score (0–1)
        acceptance_rate = accepted / total if total > 0 else 0
        completion_rate = completed / max(accepted, 1)
        physio_score = max(0, (avg_improvement or 0) + 0.5)

        effectiveness = (
            acceptance_rate * 0.3
            + completion_rate * 0.3
            + min(physio_score, 1.0) * 0.4
        )

        return {
            "category": category,
            "total_offered": total,
            "acceptance_rate": round(acceptance_rate, 3),
            "completion_rate": round(completion_rate, 3),
            "avg_physiological_improvement": (
                round(avg_improvement, 3) if avg_improvement else None
            ),
            "avg_user_rating": round(avg_rating, 1) if avg_rating else None,
            "effectiveness_score": round(effectiveness, 3),
            "intervention_fatigue": fatigue,
            "status": "effective" if effectiveness > 0.5 else "underperforming",
        }

    def get_user_effectiveness_report(
        self,
        user_id: int,
    ) -> dict:
        """Full effectiveness report across all categories."""
        records = self._records.get(user_id, [])
        categories = set(r.category for r in records)

        per_category = {
            cat: self.get_category_effectiveness(user_id, cat)
            for cat in categories
        }

        # Best and worst categories
        scored = [
            (cat, data["effectiveness_score"])
            for cat, data in per_category.items()
            if data.get("effectiveness_score") is not None
        ]
        scored.sort(key=lambda x: x[1], reverse=True)

        fatigued = [
            cat for cat, data in per_category.items()
            if data.get("intervention_fatigue")
        ]

        return {
            "user_id": user_id,
            "total_interventions": len(records),
            "categories": per_category,
            "most_effective": scored[0][0] if scored else None,
            "least_effective": scored[-1][0] if scored else None,
            "fatigued_categories": fatigued,
            "assessed_at": datetime.utcnow().isoformat(),
        }

    def get_best_categories(
        self,
        user_id: int,
        top_n: int = 3,
    ) -> list[str]:
        """Get the top-N most effective categories for a user."""
        report = self.get_user_effectiveness_report(user_id)
        categories = report.get("categories", {})
        scored = [
            (cat, data.get("effectiveness_score", 0))
            for cat, data in categories.items()
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [cat for cat, _ in scored[:top_n]]

    def _prune(self, user_id: int) -> None:
        if len(self._records[user_id]) > self._max_records:
            self._records[user_id] = self._records[user_id][-self._max_records:]
