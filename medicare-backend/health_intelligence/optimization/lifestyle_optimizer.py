"""
health_intelligence/optimization/lifestyle_optimizer.py
───────────────────────────────────────────────
Multi-factor lifestyle optimization — balances sleep,
stress, activity, and recovery for long-term wellness.

Optimizes:
  - Sleep timing and duration
  - Stress exposure windows
  - Activity balance (not too much, not too little)
  - Recovery quality
  - Hydration behaviour

Recommendations are:
  - Explainable
  - Adaptive (change over time)
  - Personalized (use baselines)
  - Context-aware (circadian, season)
"""

import logging
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)

# Optimal targets
OPTIMAL_TARGETS = {
    "sleep_hours": (7.0, 9.0),
    "stress_level": (15, 40),
    "active_minutes": (30, 60),
    "steps": (7000, 12000),
    "heart_rate_bpm": (55, 75),
    "recovery_score": (70, 95),
}


class LifestyleOptimizer:
    """
    Analyses current lifestyle metrics and generates
    explainable optimization recommendations.
    """

    def optimize(
        self,
        user_id: int,
        current_averages: dict[str, float],
        baselines: Optional[dict[str, float]] = None,
        trend_direction: str = "stable",
        circadian_phase: str = "unknown",
    ) -> dict:
        """
        Generate lifestyle optimization recommendations.
        """
        baselines = baselines or {}
        recommendations: list[dict] = []
        scores: dict[str, dict] = {}

        for metric, (low, high) in OPTIMAL_TARGETS.items():
            value = current_averages.get(metric)
            if value is None:
                continue

            personal_low = baselines.get(f"{metric}_low", low)
            personal_high = baselines.get(f"{metric}_high", high)

            # Score: how close to optimal? (0–1)
            if personal_low <= value <= personal_high:
                score = 1.0
                status = "optimal"
            elif value < personal_low:
                gap = personal_low - value
                range_size = personal_high - personal_low
                score = max(0, 1.0 - gap / max(range_size, 1))
                status = "below_optimal"
            else:
                gap = value - personal_high
                range_size = personal_high - personal_low
                score = max(0, 1.0 - gap / max(range_size, 1))
                status = "above_optimal"

            scores[metric] = {
                "value": round(value, 1),
                "optimal_range": (round(personal_low, 1), round(personal_high, 1)),
                "score": round(score, 3),
                "status": status,
            }

            # Generate recommendation if suboptimal
            if status != "optimal":
                rec = self._generate_recommendation(
                    metric, value, personal_low, personal_high, status,
                )
                if rec:
                    recommendations.append(rec)

        # Overall lifestyle score
        valid_scores = [s["score"] for s in scores.values()]
        overall = sum(valid_scores) / len(valid_scores) if valid_scores else 0.5

        # Trend modifier
        if trend_direction == "declining":
            recommendations.insert(0, {
                "metric": "overall",
                "priority": "high",
                "title": "Wellness Trend Alert",
                "message": "Your overall wellness trend is declining. Prioritize recovery and rest.",
                "category": "recovery_protocol",
            })
        elif trend_direction == "improving":
            recommendations.append({
                "metric": "overall",
                "priority": "low",
                "title": "Keep It Up",
                "message": "Your wellness trend is improving. Maintain your current habits!",
                "category": "encouragement",
            })

        # Sort by priority
        priority_order = {"high": 0, "moderate": 1, "low": 2}
        recommendations.sort(
            key=lambda r: priority_order.get(r.get("priority", "low"), 2),
        )

        return {
            "user_id": user_id,
            "overall_lifestyle_score": round(overall * 100, 1),
            "metric_scores": scores,
            "recommendations": recommendations[:6],
            "optimized_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def _generate_recommendation(
        metric: str,
        value: float,
        low: float,
        high: float,
        status: str,
    ) -> Optional[dict]:
        """Generate a recommendation for a suboptimal metric."""
        display = metric.replace("_", " ").title()

        if metric == "sleep_hours" and status == "below_optimal":
            return {
                "metric": metric,
                "priority": "high",
                "title": "Increase Sleep Duration",
                "message": (
                    f"You're averaging {value:.1f}h sleep. "
                    f"Aim for {low:.0f}–{high:.0f}h for optimal recovery."
                ),
                "category": "sleep_schedule",
                "target": f"{low:.0f}–{high:.0f} hours",
            }

        if metric == "stress_level" and status == "above_optimal":
            return {
                "metric": metric,
                "priority": "high",
                "title": "Reduce Stress Exposure",
                "message": (
                    f"Stress is elevated at {value:.0f}. "
                    "Consider adding stress-relief breaks throughout your day."
                ),
                "category": "stress_management",
                "target": f"Below {high:.0f}",
            }

        if metric == "active_minutes" and status == "below_optimal":
            return {
                "metric": metric,
                "priority": "moderate",
                "title": "Increase Daily Activity",
                "message": (
                    f"You're at {value:.0f} active minutes. "
                    f"Aim for {low:.0f}–{high:.0f} minutes daily."
                ),
                "category": "exercise",
                "target": f"{low:.0f}–{high:.0f} minutes",
            }

        if metric == "steps" and status == "below_optimal":
            return {
                "metric": metric,
                "priority": "moderate",
                "title": "Boost Step Count",
                "message": (
                    f"You're at {value:.0f} steps. "
                    f"Target {low:.0f}+ steps for cardiovascular benefit."
                ),
                "category": "movement_break",
                "target": f"{low:.0f}+ steps",
            }

        if metric == "heart_rate_bpm" and status == "above_optimal":
            return {
                "metric": metric,
                "priority": "moderate",
                "title": "Resting HR Elevated",
                "message": (
                    f"Resting HR is {value:.0f} bpm (typical: {low:.0f}–{high:.0f}). "
                    "This may indicate incomplete recovery or elevated stress."
                ),
                "category": "recovery_protocol",
                "target": f"{low:.0f}–{high:.0f} bpm",
            }

        # Generic fallback
        direction = "increase" if status == "below_optimal" else "reduce"
        return {
            "metric": metric,
            "priority": "low",
            "title": f"Optimize {display}",
            "message": (
                f"{display} is {status.replace('_', ' ')} "
                f"({value:.1f}). Consider adjusting to "
                f"reach {low:.1f}–{high:.1f}."
            ),
            "category": "lifestyle",
            "target": f"{low:.1f}–{high:.1f}",
        }
