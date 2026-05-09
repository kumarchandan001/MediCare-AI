"""
health_intelligence/analytics/behavioral_patterns.py
───────────────────────────────────────────────
Behavioral Pattern Analysis — mines correlations between
lifestyle behaviors and health outcomes.

Examples:
  "Late-night sleep correlates with fatigue spikes."
  "Reduced activity correlates with stress increase."
  "Low hydration precedes headache symptoms."

Features:
  - Pairwise metric correlation analysis
  - Temporal lag correlation (X predicts Y next day)
  - Symptom-behavior association mining
"""

import logging
import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.history.wearable_timeline import WearableTimeline
from health_intelligence.history.symptom_timeline import SymptomTimeline
from health_intelligence.history.health_history_manager import HealthHistoryManager

log = logging.getLogger(__name__)


class BehavioralPatternAnalyzer:
    """
    Mines correlations between lifestyle metrics and
    health outcomes from longitudinal data.
    """

    def __init__(self):
        self._wearable_tl = WearableTimeline()
        self._symptom_tl = SymptomTimeline()
        self._history = HealthHistoryManager()

    async def analyze_patterns(
        self,
        db: AsyncSession,
        user_id: int,
        days: int = 30,
    ) -> dict:
        """
        Run full behavioral pattern analysis.

        Returns:
          {
            "correlations": [...],
            "symptom_associations": [...],
            "insights": [...],
          }
        """
        daily = await self._wearable_tl.get_daily_aggregates(
            db, user_id, days=days,
        )

        correlations = self._compute_correlations(daily)
        lag_correlations = self._compute_lag_correlations(daily)
        symptom_assoc = await self._symptom_behavior_associations(
            db, user_id, daily, days,
        )
        insights = self._generate_insights(
            correlations, lag_correlations, symptom_assoc,
        )

        return {
            "correlations": correlations,
            "lag_correlations": lag_correlations,
            "symptom_associations": symptom_assoc,
            "insights": insights,
            "days_analyzed": len(daily),
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    # ── Same-day correlations ────────────────────────────────

    def _compute_correlations(
        self,
        daily: list[dict],
    ) -> list[dict]:
        """
        Compute pairwise Pearson correlations between
        wearable metrics from daily aggregates.
        """
        metrics = [
            "heart_rate_bpm", "sleep_hours", "steps",
            "stress_level", "active_minutes",
        ]

        results: list[dict] = []
        for i, m_a in enumerate(metrics):
            for m_b in metrics[i + 1:]:
                corr = self._pearson(daily, m_a, m_b)
                if corr is not None and abs(corr["r"]) >= 0.3:
                    results.append(corr)

        results.sort(key=lambda x: abs(x["r"]), reverse=True)
        return results[:10]

    # ── Lag correlations (X today → Y tomorrow) ──────────────

    def _compute_lag_correlations(
        self,
        daily: list[dict],
    ) -> list[dict]:
        """
        Check if today's metric X predicts tomorrow's metric Y.
        """
        pairs = [
            ("sleep_hours", "stress_level", "Poor sleep → next-day stress"),
            ("stress_level", "sleep_hours", "High stress → next-day poor sleep"),
            ("steps", "sleep_hours", "Activity → next-day sleep quality"),
            ("stress_level", "heart_rate_bpm", "Stress → next-day elevated HR"),
            ("sleep_hours", "steps", "Sleep → next-day activity level"),
        ]

        results: list[dict] = []
        for m_a, m_b, label in pairs:
            corr = self._pearson_lagged(daily, m_a, m_b, lag=1)
            if corr is not None and abs(corr) >= 0.25:
                direction = "positive" if corr > 0 else "negative"
                results.append({
                    "predictor": m_a,
                    "outcome": m_b,
                    "lag_days": 1,
                    "r": round(corr, 3),
                    "direction": direction,
                    "strength": (
                        "strong" if abs(corr) >= 0.6 else
                        "moderate" if abs(corr) >= 0.4 else
                        "weak"
                    ),
                    "label": label,
                })

        results.sort(key=lambda x: abs(x["r"]), reverse=True)
        return results

    # ── Symptom-behavior associations ────────────────────────

    async def _symptom_behavior_associations(
        self,
        db: AsyncSession,
        user_id: int,
        daily: list[dict],
        days: int,
    ) -> list[dict]:
        """
        Find associations between wearable behaviors and
        reported symptoms.
        """
        symptom_freqs = await self._symptom_tl.get_weighted_symptom_frequencies(
            db, user_id, days=days,
        )

        if not symptom_freqs or len(daily) < 5:
            return []

        # Get symptom history with dates
        symptom_history = await self._history.get_symptom_history(
            db, user_id, days=days,
        )

        # Map symptom dates
        symptom_dates: dict[str, set[str]] = defaultdict(set)
        for entry in symptom_history:
            date_key = entry.recorded_at.strftime("%Y-%m-%d")
            symptom_dates[entry.symptom_name].add(date_key)

        # Daily date map
        daily_dates = {d["date"]: d for d in daily}

        associations: list[dict] = []
        top_symptoms = [s["symptom"] for s in symptom_freqs[:5]]

        for symptom in top_symptoms:
            s_dates = symptom_dates.get(symptom, set())
            if len(s_dates) < 2:
                continue

            for metric in ["sleep_hours", "stress_level", "steps"]:
                symptom_day_vals = []
                no_symptom_day_vals = []

                for date_str, day_data in daily_dates.items():
                    val = day_data.get(metric)
                    if val is None:
                        continue
                    if date_str in s_dates:
                        symptom_day_vals.append(val)
                    else:
                        no_symptom_day_vals.append(val)

                if len(symptom_day_vals) >= 2 and len(no_symptom_day_vals) >= 2:
                    avg_with = sum(symptom_day_vals) / len(symptom_day_vals)
                    avg_without = sum(no_symptom_day_vals) / len(no_symptom_day_vals)

                    if avg_without != 0:
                        diff_pct = (
                            (avg_with - avg_without) / abs(avg_without) * 100
                        )
                        if abs(diff_pct) >= 15:
                            display_sym = symptom.replace("_", " ").title()
                            display_met = metric.replace("_", " ").title()
                            direction = "higher" if diff_pct > 0 else "lower"

                            associations.append({
                                "symptom": symptom,
                                "metric": metric,
                                "avg_with_symptom": round(avg_with, 1),
                                "avg_without_symptom": round(avg_without, 1),
                                "difference_pct": round(diff_pct, 1),
                                "message": (
                                    f"On days with {display_sym}, "
                                    f"{display_met} tends to be "
                                    f"{abs(diff_pct):.0f}% {direction}."
                                ),
                            })

        associations.sort(
            key=lambda x: abs(x["difference_pct"]), reverse=True,
        )
        return associations[:10]

    # ── Insight generation ───────────────────────────────────

    @staticmethod
    def _generate_insights(
        correlations: list[dict],
        lag_correlations: list[dict],
        symptom_associations: list[dict],
    ) -> list[str]:
        """Generate human-readable behavioral insights."""
        insights: list[str] = []

        for corr in correlations[:3]:
            a = corr["metric_a"].replace("_", " ").title()
            b = corr["metric_b"].replace("_", " ").title()
            r = corr["r"]
            if r > 0:
                insights.append(
                    f"{a} and {b} tend to move together "
                    f"(correlation: {r:.2f})."
                )
            else:
                insights.append(
                    f"When {a} increases, {b} tends to decrease "
                    f"(correlation: {r:.2f})."
                )

        for lag in lag_correlations[:2]:
            pred = lag["predictor"].replace("_", " ").title()
            out = lag["outcome"].replace("_", " ").title()
            insights.append(
                f"Today's {pred} appears to influence tomorrow's "
                f"{out} ({lag['strength']} {lag['direction']} correlation)."
            )

        for assoc in symptom_associations[:2]:
            insights.append(assoc["message"])

        return insights

    # ── Statistical helpers ──────────────────────────────────

    @staticmethod
    def _pearson(
        daily: list[dict],
        field_a: str,
        field_b: str,
    ) -> Optional[dict]:
        """Compute Pearson correlation between two daily metrics."""
        pairs = []
        for d in daily:
            a = d.get(field_a)
            b = d.get(field_b)
            if a is not None and b is not None:
                pairs.append((float(a), float(b)))

        if len(pairs) < 5:
            return None

        n = len(pairs)
        sum_a = sum(x for x, _ in pairs)
        sum_b = sum(y for _, y in pairs)
        sum_ab = sum(x * y for x, y in pairs)
        sum_a2 = sum(x * x for x, _ in pairs)
        sum_b2 = sum(y * y for _, y in pairs)

        denom = math.sqrt(
            (n * sum_a2 - sum_a ** 2) * (n * sum_b2 - sum_b ** 2)
        )
        if denom == 0:
            return None

        r = (n * sum_ab - sum_a * sum_b) / denom

        return {
            "metric_a": field_a,
            "metric_b": field_b,
            "r": round(r, 3),
            "strength": (
                "strong" if abs(r) >= 0.6 else
                "moderate" if abs(r) >= 0.4 else
                "weak"
            ),
            "data_points": n,
        }

    @staticmethod
    def _pearson_lagged(
        daily: list[dict],
        field_a: str,
        field_b: str,
        lag: int = 1,
    ) -> Optional[float]:
        """Pearson correlation with a time lag (a[t] vs b[t+lag])."""
        if len(daily) < lag + 5:
            return None

        pairs = []
        for i in range(len(daily) - lag):
            a = daily[i].get(field_a)
            b = daily[i + lag].get(field_b)
            if a is not None and b is not None:
                pairs.append((float(a), float(b)))

        if len(pairs) < 5:
            return None

        n = len(pairs)
        sum_a = sum(x for x, _ in pairs)
        sum_b = sum(y for _, y in pairs)
        sum_ab = sum(x * y for x, y in pairs)
        sum_a2 = sum(x * x for x, _ in pairs)
        sum_b2 = sum(y * y for _, y in pairs)

        denom = math.sqrt(
            (n * sum_a2 - sum_a ** 2) * (n * sum_b2 - sum_b ** 2)
        )
        if denom == 0:
            return None

        return (n * sum_ab - sum_a * sum_b) / denom
