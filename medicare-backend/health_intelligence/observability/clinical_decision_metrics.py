"""Clinical Decision Metrics — Aggregated system quality metrics."""
import time


class ClinicalDecisionMetrics:
    def __init__(self):
        self._metrics = {
            "governance_checks": 0, "safety_violations": 0,
            "escalations": 0, "emergencies": 0,
            "human_reviews_triggered": 0, "confidence_caps_applied": 0,
            "calm_language_modifications": 0, "anxiety_reductions": 0,
        }

    def increment(self, metric: str, count: int = 1):
        if metric in self._metrics:
            self._metrics[metric] += count

    def get_metrics(self) -> dict:
        return {**self._metrics, "generated_at": time.time()}

    def get_safety_score(self) -> float:
        total = self._metrics["governance_checks"] or 1
        violations = self._metrics["safety_violations"]
        return round(max(0.0, 1.0 - violations / total), 3)
