"""
health_intelligence/governance/human_alignment.py
───────────────────────────────────────────────
Ensures the autonomous wellness ecosystem remains
human-aligned, psychologically safe, and non-addictive.
(Refinement 7)

Priorities:
  - Wellbeing preservation over optimisation
  - Healthy autonomy boundaries
  - Calm interaction pacing
  - Emotionally supportive guidance
  - Low-pressure, sustainable engagement
  - Non-addictive notification patterns
"""

import logging
from dataclasses import dataclass
from datetime import datetime

log = logging.getLogger(__name__)


@dataclass
class AlignmentCheck:
    """Result of a human alignment check."""
    dimension: str
    aligned: bool
    score: float  # 0–1
    recommendation: str


class HumanAlignment:
    """
    Ensures the wellness ecosystem prioritises
    human wellbeing over system optimisation.
    """

    # Calm pacing thresholds
    MAX_ACTIONS_PER_HOUR = 3
    MAX_URGENT_NOTIFICATIONS_PER_DAY = 2
    CALM_PERIOD_HOURS = (22, 7)  # 10 PM → 7 AM (no notifications)

    def __init__(self):
        self._action_counts: dict[int, list[str]] = {}

    def check_alignment(
        self,
        user_id: int,
        orchestration_report: dict,
    ) -> dict:
        """Run full human alignment assessment."""
        checks: list[AlignmentCheck] = []

        checks.append(self._check_wellbeing_preservation(orchestration_report))
        checks.append(self._check_calm_pacing(orchestration_report))
        checks.append(self._check_emotional_safety(orchestration_report))
        checks.append(self._check_sustainable_engagement(orchestration_report))
        checks.append(self._check_user_autonomy(orchestration_report))

        overall_score = sum(c.score for c in checks) / max(len(checks), 1)
        all_aligned = all(c.aligned for c in checks)

        return {
            "aligned": all_aligned,
            "overall_score": round(overall_score, 3),
            "checks": [
                {
                    "dimension": c.dimension,
                    "aligned": c.aligned,
                    "score": round(c.score, 3),
                    "recommendation": c.recommendation,
                }
                for c in checks
            ],
            "human_alignment_status": (
                "fully_aligned" if all_aligned
                else "partially_aligned" if overall_score > 0.6
                else "misaligned"
            ),
        }

    def _check_wellbeing_preservation(self, report: dict) -> AlignmentCheck:
        """Ensure wellbeing is prioritised over performance."""
        budget = report.get("energy_budget", {})
        overload = budget.get("behavioral_overload_risk", 0)

        if overload > 0.7:
            return AlignmentCheck(
                dimension="wellbeing_preservation",
                aligned=False,
                score=0.3,
                recommendation=(
                    "System is pushing too hard. Reduce intervention "
                    "volume and prioritise rest."
                ),
            )
        return AlignmentCheck(
            dimension="wellbeing_preservation",
            aligned=True,
            score=max(0.5, 1.0 - overload),
            recommendation="Wellbeing preservation is maintained.",
        )

    def _check_calm_pacing(self, report: dict) -> AlignmentCheck:
        """Ensure interactions are calmly paced."""
        delivered = report.get("interventions_delivered", 0)

        if delivered > self.MAX_ACTIONS_PER_HOUR:
            return AlignmentCheck(
                dimension="calm_pacing",
                aligned=False,
                score=0.3,
                recommendation=(
                    "Too many interactions in a short period. "
                    "Implement longer cooldown periods."
                ),
            )
        return AlignmentCheck(
            dimension="calm_pacing",
            aligned=True,
            score=1.0 - delivered * 0.15,
            recommendation="Interaction pacing is calm and sustainable.",
        )

    def _check_emotional_safety(self, report: dict) -> AlignmentCheck:
        """Ensure emotional safety in all communications."""
        # Check for fear/pressure language in delivery
        delivered = report.get("delivery_results", [])
        pressure_words = [
            "must", "urgent", "danger", "failure",
            "you need to", "immediately",
        ]
        pressure_count = 0
        for item in delivered:
            desc = str(item.get("intervention", {}).get("description", "")).lower()
            for word in pressure_words:
                if word in desc:
                    pressure_count += 1

        if pressure_count > 2:
            return AlignmentCheck(
                dimension="emotional_safety",
                aligned=False,
                score=0.4,
                recommendation=(
                    "Multiple pressure-inducing phrases detected. "
                    "Reframe communications to be supportive."
                ),
            )
        return AlignmentCheck(
            dimension="emotional_safety",
            aligned=True,
            score=max(0.6, 1.0 - pressure_count * 0.15),
            recommendation="Communications are emotionally supportive.",
        )

    def _check_sustainable_engagement(self, report: dict) -> AlignmentCheck:
        """Ensure engagement isn't addictive."""
        budget = report.get("energy_budget", {})
        high_load_days = budget.get("consecutive_high_load_days", 0)

        if high_load_days > 3:
            return AlignmentCheck(
                dimension="sustainable_engagement",
                aligned=False,
                score=0.3,
                recommendation=(
                    "User has been under high cognitive load for "
                    f"{high_load_days} days. Reduce system activity."
                ),
            )
        return AlignmentCheck(
            dimension="sustainable_engagement",
            aligned=True,
            score=max(0.5, 1.0 - high_load_days * 0.1),
            recommendation="Engagement levels are sustainable.",
        )

    def _check_user_autonomy(self, report: dict) -> AlignmentCheck:
        """Ensure user retains control and autonomy."""
        # Check if there's explainability
        explainability = report.get("explainability", {})
        has_explanation = explainability.get("total_traces", 0) > 0

        if not has_explanation:
            return AlignmentCheck(
                dimension="user_autonomy",
                aligned=False,
                score=0.5,
                recommendation=(
                    "Decisions are being made without explanation. "
                    "Users need to understand why actions were taken."
                ),
            )
        return AlignmentCheck(
            dimension="user_autonomy",
            aligned=True,
            score=0.9,
            recommendation=(
                "User can understand and override all system decisions."
            ),
        )
