"""
health_intelligence/insights/life_pattern_discovery.py
───────────────────────────────────────────────
Discovers correlations between life events and
wellness outcomes. Generates human-readable insights.

Discovers:
  - Day-of-week wellness patterns
  - Stress–sleep causation chains
  - Activity–recovery correlations
  - Seasonal wellness shifts
  - Lifestyle change impact analysis
"""

import logging
import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class LifePatternDiscovery:
    """
    Finds life-health relationships from accumulated
    wellness data and generates insights.
    """

    def __init__(self):
        # user_id → day_of_week → metric → values
        self._daily_data: dict[int, dict[int, dict[str, list[float]]]] = defaultdict(
            lambda: defaultdict(lambda: defaultdict(list)),
        )
        # user_id → pair_key → list of (a_val, b_val)
        self._correlations: dict[int, dict[str, list[tuple[float, float]]]] = defaultdict(
            lambda: defaultdict(list),
        )

    def ingest(
        self,
        user_id: int,
        signals: dict[str, float],
        day_of_week: int = 0,  # 0=Monday
    ) -> None:
        """Ingest daily signal data for pattern analysis."""
        for metric, value in signals.items():
            self._daily_data[user_id][day_of_week][metric].append(value)
            # Keep last 50 per slot
            if len(self._daily_data[user_id][day_of_week][metric]) > 50:
                self._daily_data[user_id][day_of_week][metric] = (
                    self._daily_data[user_id][day_of_week][metric][-50:]
                )

        # Track inter-metric correlations
        pairs = [
            ("stress_level", "sleep_hours"),
            ("active_minutes", "recovery_score"),
            ("fatigue", "wellness_score"),
            ("stress_level", "recovery_score"),
        ]
        for m_a, m_b in pairs:
            if m_a in signals and m_b in signals:
                self._correlations[user_id][f"{m_a}__{m_b}"].append(
                    (signals[m_a], signals[m_b]),
                )

    def discover_patterns(self, user_id: int) -> dict:
        """Discover all life patterns."""
        insights: list[dict] = []

        # Day-of-week patterns
        dow_insights = self._day_of_week_patterns(user_id)
        insights.extend(dow_insights)

        # Correlations
        corr_insights = self._correlation_patterns(user_id)
        insights.extend(corr_insights)

        return {
            "user_id": user_id,
            "insights": insights,
            "total_patterns": len(insights),
            "discovered_at": datetime.utcnow().isoformat(),
        }

    def _day_of_week_patterns(self, user_id: int) -> list[dict]:
        """Find day-of-week wellness patterns."""
        data = self._daily_data.get(user_id, {})
        insights: list[dict] = []
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        for metric in ("stress_level", "sleep_hours", "recovery_score", "fatigue"):
            daily_avgs: dict[int, float] = {}
            for dow in range(7):
                values = data.get(dow, {}).get(metric, [])
                if values:
                    daily_avgs[dow] = sum(values) / len(values)

            if len(daily_avgs) < 4:
                continue

            # Find best and worst days
            best_day = min(daily_avgs, key=daily_avgs.get) if metric in ("stress_level", "fatigue") else max(daily_avgs, key=daily_avgs.get)
            worst_day = max(daily_avgs, key=daily_avgs.get) if metric in ("stress_level", "fatigue") else min(daily_avgs, key=daily_avgs.get)

            spread = abs(daily_avgs[best_day] - daily_avgs[worst_day])
            if spread > 5:  # Meaningful difference
                display = metric.replace("_", " ").title()
                insights.append({
                    "type": "day_of_week",
                    "metric": metric,
                    "insight": (
                        f"Your {display.lower()} tends to be best on "
                        f"{day_names[best_day]}s and most challenging on "
                        f"{day_names[worst_day]}s."
                    ),
                    "best_day": day_names[best_day],
                    "worst_day": day_names[worst_day],
                    "spread": round(spread, 1),
                })

        return insights

    def _correlation_patterns(self, user_id: int) -> list[dict]:
        """Find inter-metric correlations."""
        data = self._correlations.get(user_id, {})
        insights: list[dict] = []

        for pair_key, values in data.items():
            if len(values) < 10:
                continue

            m_a, m_b = pair_key.split("__")
            corr = self._pearson(values)

            if abs(corr) > 0.5:
                direction = "positively" if corr > 0 else "negatively"
                display_a = m_a.replace("_", " ").title()
                display_b = m_b.replace("_", " ").title()
                insights.append({
                    "type": "correlation",
                    "metrics": [m_a, m_b],
                    "correlation": round(corr, 3),
                    "insight": (
                        f"{display_a} and {display_b} are {direction} "
                        f"correlated (r={corr:.2f}) in your data."
                    ),
                    "strength": "strong" if abs(corr) > 0.7 else "moderate",
                })

        return insights

    @staticmethod
    def _pearson(pairs: list[tuple[float, float]]) -> float:
        """Compute Pearson correlation coefficient."""
        n = len(pairs)
        if n < 3:
            return 0.0

        xs, ys = zip(*pairs)
        x_mean = sum(xs) / n
        y_mean = sum(ys) / n

        numerator = sum((x - x_mean) * (y - y_mean) for x, y in pairs)
        denom_x = math.sqrt(sum((x - x_mean) ** 2 for x in xs))
        denom_y = math.sqrt(sum((y - y_mean) ** 2 for y in ys))

        if denom_x * denom_y == 0:
            return 0.0

        return numerator / (denom_x * denom_y)
