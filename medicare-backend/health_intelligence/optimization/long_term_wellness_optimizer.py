"""
health_intelligence/optimization/long_term_wellness_optimizer.py
───────────────────────────────────────────────
Focuses on sustainable, long-term wellness evolution
rather than short-term symptom suppression.

Optimises:
  - Resilience growth over weeks
  - Sleep consistency improvement
  - Stress stabilisation trends
  - Sustainable habit formation
  - Recovery capacity expansion

Uses rolling window analysis to detect whether
interventions are producing lasting improvement.
"""

import logging
import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


class LongTermWellnessOptimizer:
    """
    Optimises for long-term wellness evolution by
    tracking multi-week trends and habit sustainability.
    """

    def __init__(self):
        # user_id → metric → weekly averages
        self._weekly_data: dict[int, dict[str, list[float]]] = defaultdict(
            lambda: defaultdict(list),
        )
        self._max_weeks = 24

    def record_weekly(
        self,
        user_id: int,
        weekly_averages: dict[str, float],
    ) -> None:
        """Record a week's averages for long-term tracking."""
        for metric, value in weekly_averages.items():
            self._weekly_data[user_id][metric].append(value)
            if len(self._weekly_data[user_id][metric]) > self._max_weeks:
                self._weekly_data[user_id][metric] = (
                    self._weekly_data[user_id][metric][-self._max_weeks:]
                )

    def analyse_trends(self, user_id: int) -> dict:
        """
        Analyse long-term wellness trends across all metrics.
        """
        data = self._weekly_data.get(user_id, {})
        trends: dict[str, dict] = {}

        for metric, values in data.items():
            if len(values) < 3:
                continue

            # Linear trend (simple slope)
            n = len(values)
            x_mean = (n - 1) / 2
            y_mean = sum(values) / n
            numerator = sum(
                (i - x_mean) * (v - y_mean) for i, v in enumerate(values)
            )
            denominator = sum((i - x_mean) ** 2 for i in range(n))
            slope = numerator / max(denominator, 0.001)

            # Recent trend (last 4 weeks)
            recent = values[-4:]
            recent_slope = (recent[-1] - recent[0]) / max(len(recent) - 1, 1)

            # Consistency (lower variance = more consistent)
            variance = sum((v - y_mean) ** 2 for v in values) / n
            consistency = max(0, 1.0 - math.sqrt(variance) / max(y_mean, 1))

            # Determine if improving (depends on metric direction)
            is_lower_better = metric in (
                "stress_level", "fatigue", "burnout_risk",
            )
            if is_lower_better:
                improving = slope < -0.1
                declining = slope > 0.1
            else:
                improving = slope > 0.1
                declining = slope < -0.1

            trends[metric] = {
                "current_value": round(values[-1], 2),
                "overall_slope": round(slope, 4),
                "recent_slope": round(recent_slope, 4),
                "consistency": round(consistency, 3),
                "direction": "improving" if improving else "declining" if declining else "stable",
                "weeks_tracked": n,
                "recommendation": self._trend_recommendation(
                    metric, slope, consistency, is_lower_better,
                ),
            }

        return {
            "user_id": user_id,
            "trends": trends,
            "overall_wellness_direction": self._overall_direction(trends),
            "analysed_at": datetime.utcnow().isoformat(),
        }

    def identify_sustainable_habits(self, user_id: int) -> list[dict]:
        """
        Identify habits that have been consistently maintained
        and are producing lasting improvement.
        """
        data = self._weekly_data.get(user_id, {})
        habits: list[dict] = []

        for metric, values in data.items():
            if len(values) < 6:
                continue

            # Check if last 6 weeks are consistently better than first 6
            first_half = values[:len(values) // 2]
            second_half = values[len(values) // 2:]

            first_avg = sum(first_half) / len(first_half)
            second_avg = sum(second_half) / len(second_half)

            is_lower_better = metric in ("stress_level", "fatigue", "burnout_risk")
            if is_lower_better:
                improved = second_avg < first_avg * 0.9
            else:
                improved = second_avg > first_avg * 1.1

            # Check consistency in second half
            variance = sum(
                (v - second_avg) ** 2 for v in second_half
            ) / len(second_half)
            consistent = math.sqrt(variance) < abs(second_avg) * 0.2

            if improved and consistent:
                habits.append({
                    "metric": metric,
                    "improvement_pct": round(
                        abs(second_avg - first_avg) / max(abs(first_avg), 1) * 100, 1,
                    ),
                    "consistency": round(1.0 - math.sqrt(variance) / max(abs(second_avg), 1), 3),
                    "weeks_sustained": len(second_half),
                    "status": "sustainable",
                })

        return habits

    @staticmethod
    def _trend_recommendation(
        metric: str,
        slope: float,
        consistency: float,
        is_lower_better: bool,
    ) -> str:
        display = metric.replace("_", " ").title()

        if consistency > 0.7:
            if (is_lower_better and slope < -0.1) or (not is_lower_better and slope > 0.1):
                return f"{display} is improving consistently. Maintain current approach."
            elif abs(slope) < 0.1:
                return f"{display} is stable and consistent. Good foundation."

        if consistency < 0.4:
            return f"{display} is inconsistent. Focus on building routine stability."

        if (is_lower_better and slope > 0.2) or (not is_lower_better and slope < -0.2):
            return f"{display} is trending in the wrong direction. Intervention may help."

        return f"{display} is within normal variation."

    @staticmethod
    def _overall_direction(trends: dict) -> str:
        improving = sum(
            1 for t in trends.values() if t["direction"] == "improving"
        )
        declining = sum(
            1 for t in trends.values() if t["direction"] == "declining"
        )
        if improving > declining + 1:
            return "improving"
        if declining > improving + 1:
            return "declining"
        return "stable"
