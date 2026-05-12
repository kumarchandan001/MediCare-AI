"""
monitoring_recommendation_engine.py
───────────────────────────────────
Generates intelligent continuous monitoring recommendations.

Responsibilities:
  - What to monitor
  - How frequently
  - What changes to watch for
  - When to re-engage the clinical system
"""

from typing import Any, Dict, List


class MonitoringRecommendationEngine:

    def generate(
        self,
        triage_level: str,
        trajectory: str,
        active_symptoms: List[str],
        recovery_quality: float = 0.0,
        deterioration_domains: List[str] | None = None,
    ) -> Dict[str, Any]:
        deterioration_domains = deterioration_domains or []

        what = self._what_to_monitor(active_symptoms, deterioration_domains)
        frequency = self._frequency(triage_level, trajectory)
        watch_for = self._watch_for(trajectory, recovery_quality)
        re_engage = self._re_engage_triggers(triage_level, trajectory)

        return {
            "what_to_monitor": what,
            "frequency": frequency,
            "watch_for": watch_for,
            "re_engage_triggers": re_engage,
            "explanation": self._explain(triage_level, trajectory),
        }

    @staticmethod
    def _what_to_monitor(symptoms: List[str], domains: List[str]) -> List[str]:
        items = [s.replace("_", " ").title() for s in symptoms[:5]]
        if "respiratory" in domains:
            items.append("Breathing rate and ease")
        if "cardiovascular" in domains:
            items.append("Heart rate and chest sensations")
        if not items:
            items.append("General wellbeing and energy levels")
        return items

    @staticmethod
    def _frequency(triage: str, trajectory: str) -> str:
        if triage == "emergency_escalation":
            return "Continuous — seek immediate care"
        if triage == "urgent_evaluation":
            return "Every 2-4 hours"
        if trajectory == "deteriorating":
            return "Every 4-6 hours"
        if trajectory == "fluctuating":
            return "Every 6-8 hours"
        return "Once or twice daily"

    @staticmethod
    def _watch_for(trajectory: str, recovery_quality: float) -> List[str]:
        items = []
        if trajectory in ("deteriorating", "fluctuating"):
            items.append("Any sudden worsening of symptoms")
            items.append("New symptoms appearing")
        if recovery_quality > 0 and recovery_quality < 0.3:
            items.append("Symptoms returning after improvement")
        items.append("Changes in energy or ability to perform daily activities")
        return items

    @staticmethod
    def _re_engage_triggers(triage: str, trajectory: str) -> List[str]:
        triggers = []
        if triage in ("urgent_evaluation", "emergency_escalation"):
            triggers.append("Any worsening of current symptoms")
        triggers.append("New or unexpected symptoms")
        triggers.append("Symptoms persisting beyond expected timeline")
        if trajectory == "improving":
            triggers.append("Symptoms returning after a period of improvement")
        return triggers

    @staticmethod
    def _explain(triage: str, trajectory: str) -> str:
        if triage == "emergency_escalation":
            return "Given the current indicators, continuous monitoring and immediate care are recommended."
        if trajectory == "improving":
            return "Things appear to be improving. Routine monitoring will help confirm continued recovery."
        return "Regular monitoring will help track your progress and detect any changes early."
