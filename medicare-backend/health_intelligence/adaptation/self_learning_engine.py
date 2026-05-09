"""
health_intelligence/adaptation/self_learning_engine.py
───────────────────────────────────────────────
Self-learning engine — evolves the system's
understanding of the user over time.

Learns:
  - Successful intervention styles
  - Preferred coaching tone
  - Effective recovery pathways
  - Motivational triggers
  - Behavioral adaptation speed
"""

import logging
from collections import defaultdict
from datetime import datetime

log = logging.getLogger(__name__)


class SelfLearningEngine:
    """
    Continuously evolves personalisation by tracking
    what works and what doesn't for each user.
    """

    def __init__(self):
        # user_id → learning_dimension → accumulated knowledge
        self._knowledge: dict[int, dict[str, dict]] = defaultdict(
            lambda: defaultdict(dict),
        )

    def learn_from_intervention(
        self,
        user_id: int,
        category: str,
        style: str,
        accepted: bool,
        improvement: float = 0.0,
    ) -> None:
        """Learn from an intervention outcome."""
        k = self._knowledge[user_id]

        # Track style preferences
        if "preferred_styles" not in k:
            k["preferred_styles"] = defaultdict(lambda: {"success": 0, "total": 0})
        k["preferred_styles"][style]["total"] += 1
        if accepted and improvement > 0:
            k["preferred_styles"][style]["success"] += 1

        # Track category effectiveness
        if "category_effectiveness" not in k:
            k["category_effectiveness"] = defaultdict(lambda: {"total_improvement": 0, "count": 0})
        k["category_effectiveness"][category]["count"] += 1
        k["category_effectiveness"][category]["total_improvement"] += improvement

    def learn_from_coaching(
        self,
        user_id: int,
        personality: str,
        engagement_level: float,
    ) -> None:
        """Learn coaching tone preferences."""
        k = self._knowledge[user_id]
        if "coaching_preference" not in k:
            k["coaching_preference"] = defaultdict(lambda: {"engagement_sum": 0, "count": 0})
        k["coaching_preference"][personality]["count"] += 1
        k["coaching_preference"][personality]["engagement_sum"] += engagement_level

    def learn_recovery_pathway(
        self,
        user_id: int,
        pathway: str,
        success: bool,
        recovery_speed: float = 0.5,
    ) -> None:
        """Learn which recovery pathways work best."""
        k = self._knowledge[user_id]
        if "recovery_pathways" not in k:
            k["recovery_pathways"] = defaultdict(lambda: {"success": 0, "total": 0, "avg_speed": 0.5})
        p = k["recovery_pathways"][pathway]
        p["total"] += 1
        if success:
            p["success"] += 1
        # EMA for speed
        p["avg_speed"] = p["avg_speed"] * 0.8 + recovery_speed * 0.2

    def get_preferred_style(self, user_id: int) -> str:
        """Get the user's most effective intervention style."""
        k = self._knowledge.get(user_id, {})
        styles = k.get("preferred_styles", {})
        if not styles:
            return "gentle_progressive"

        best = max(
            styles.items(),
            key=lambda x: x[1].get("success", 0) / max(x[1].get("total", 1), 1),
        )
        return best[0]

    def get_preferred_coaching(self, user_id: int) -> str:
        """Get the user's most engaging coaching personality."""
        k = self._knowledge.get(user_id, {})
        coaching = k.get("coaching_preference", {})
        if not coaching:
            return "supportive"

        best = max(
            coaching.items(),
            key=lambda x: x[1].get("engagement_sum", 0) / max(x[1].get("count", 1), 1),
        )
        return best[0]

    def get_learning_report(self, user_id: int) -> dict:
        """Get comprehensive learning report."""
        k = self._knowledge.get(user_id, {})

        # Style preferences
        styles = k.get("preferred_styles", {})
        style_report = {}
        for style, stats in styles.items():
            total = stats.get("total", 0)
            success = stats.get("success", 0)
            style_report[style] = {
                "success_rate": round(success / max(total, 1), 3),
                "total": total,
            }

        # Category effectiveness
        cats = k.get("category_effectiveness", {})
        cat_report = {}
        for cat, stats in cats.items():
            count = stats.get("count", 0)
            total_imp = stats.get("total_improvement", 0)
            cat_report[cat] = {
                "avg_improvement": round(total_imp / max(count, 1), 3),
                "count": count,
            }

        return {
            "user_id": user_id,
            "preferred_style": self.get_preferred_style(user_id),
            "preferred_coaching": self.get_preferred_coaching(user_id),
            "style_effectiveness": style_report,
            "category_effectiveness": cat_report,
            "learning_depth": sum(
                v.get("total", 0) if isinstance(v, dict)
                else sum(sv.get("total", 0) for sv in v.values()) if isinstance(v, defaultdict)
                else 0
                for v in k.values()
            ),
        }
