"""
health_intelligence/intervention/adaptive_intervention_planner.py
───────────────────────────────────────────────
Maps causal root causes to specific, contextual
interventions, adapted to user state and history.

Selects interventions based on:
  - Causal root cause
  - User physiological state
  - Behavioral friction profile
  - Intervention effectiveness history
  - Circadian phase
  - Current stress / fatigue levels
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from health_intelligence.intervention.behavioral_friction import (
    BehavioralFrictionEstimator, InterventionFriction,
)
from health_intelligence.intervention.intervention_feedback import (
    InterventionFeedbackTracker,
)

log = logging.getLogger(__name__)


@dataclass
class PlannedIntervention:
    """A single planned intervention."""
    intervention_id: str
    category: str
    title: str
    description: str
    rationale: str            # why this was chosen
    root_cause: str           # causal root
    priority: str             # high | moderate | low
    friction: Optional[InterventionFriction] = None
    confidence: float = 0.5
    time_minutes: int = 10


# Intervention catalog: root_cause → list of interventions
INTERVENTION_CATALOG = {
    "sleep_quality": [
        {"category": "sleep_hygiene", "title": "Improve Sleep Hygiene",
         "description": "Reduce screen time 30 min before bed, darken room, cool temperature.",
         "time": 15, "priority": "high"},
        {"category": "breathing", "title": "Pre-Sleep Breathing",
         "description": "5-minute box breathing to activate parasympathetic response.",
         "time": 5, "priority": "moderate"},
        {"category": "screen_reduction", "title": "Evening Screen Reduction",
         "description": "Enable blue-light filter and reduce stimulating content.",
         "time": 0, "priority": "moderate"},
    ],
    "stress_level": [
        {"category": "breathing", "title": "Stress Reset Breathing",
         "description": "2-minute deep breathing to lower acute stress.",
         "time": 2, "priority": "high"},
        {"category": "movement_break", "title": "Active Stress Break",
         "description": "5-minute walk or stretch to break the stress cycle.",
         "time": 5, "priority": "moderate"},
        {"category": "meditation", "title": "Guided Calm Session",
         "description": "10-minute guided meditation for stress relief.",
         "time": 10, "priority": "moderate"},
    ],
    "physical_activity": [
        {"category": "movement_break", "title": "Movement Nudge",
         "description": "Stand up and take a 3-minute stretch break.",
         "time": 3, "priority": "moderate"},
        {"category": "exercise", "title": "Light Exercise Session",
         "description": "15-minute walk or light workout.",
         "time": 15, "priority": "moderate"},
    ],
    "recovery_quality": [
        {"category": "hydration", "title": "Hydration Boost",
         "description": "Drink a full glass of water to support recovery.",
         "time": 1, "priority": "moderate"},
        {"category": "recovery_protocol", "title": "Active Recovery",
         "description": "Light stretching followed by 10-minute rest period.",
         "time": 15, "priority": "high"},
    ],
    "fatigue": [
        {"category": "hydration", "title": "Hydrate for Energy",
         "description": "Mild dehydration worsens fatigue — drink water now.",
         "time": 1, "priority": "high"},
        {"category": "movement_break", "title": "Gentle Energy Boost",
         "description": "3-minute gentle movement to combat fatigue.",
         "time": 3, "priority": "moderate"},
        {"category": "sleep_schedule", "title": "Prioritize Tonight's Sleep",
         "description": "Aim for 8+ hours tonight to address fatigue accumulation.",
         "time": 0, "priority": "high"},
    ],
    "burnout_risk": [
        {"category": "stress_management", "title": "Burnout Prevention Plan",
         "description": "Set work boundaries, schedule recovery blocks.",
         "time": 15, "priority": "high"},
        {"category": "social", "title": "Social Connection",
         "description": "Reach out to a friend or family member for support.",
         "time": 15, "priority": "moderate"},
    ],
}


class AdaptiveInterventionPlanner:
    """
    Plans interventions adapted to user state, friction
    profile, and historical effectiveness.
    """

    def __init__(self):
        self._friction = BehavioralFrictionEstimator()
        self._feedback = InterventionFeedbackTracker()
        self._counter = 0

    def plan_interventions(
        self,
        user_id: int,
        root_causes: list[str],
        stress_level: float = 40,
        fatigue_level: float = 30,
        current_state: str = "normal",
        engagement_score: float = 0.5,
        max_interventions: int = 5,
    ) -> list[dict]:
        """
        Plan interventions for identified root causes,
        ranked by adherence probability and priority.
        """
        candidates: list[dict] = []

        for root in root_causes:
            catalog = INTERVENTION_CATALOG.get(root, [])

            for item in catalog:
                self._counter += 1
                iid = f"int-{user_id}-{self._counter}"

                # Estimate friction
                friction = self._friction.estimate_friction(
                    user_id, iid, item["category"],
                    stress_level, fatigue_level,
                    current_state, engagement_score,
                )

                # Check historical effectiveness
                eff = self._feedback.get_category_effectiveness(
                    user_id, item["category"],
                )
                eff_score = eff.get("effectiveness_score", 0.5) if eff.get("status") != "no_data" else 0.5

                # Skip fatigued categories
                if eff.get("intervention_fatigue"):
                    continue

                # Compute combined score
                combined = (
                    friction.adherence_probability * 0.4
                    + eff_score * 0.3
                    + ({"high": 0.3, "moderate": 0.2, "low": 0.1}.get(item["priority"], 0.1))
                )

                planned = PlannedIntervention(
                    intervention_id=iid,
                    category=item["category"],
                    title=item["title"],
                    description=item["description"],
                    rationale=f"Addresses root cause: {root.replace('_', ' ')}",
                    root_cause=root,
                    priority=item["priority"],
                    friction=friction,
                    confidence=round(combined, 3),
                    time_minutes=item.get("time", 10),
                )

                candidates.append({
                    "intervention_id": planned.intervention_id,
                    "category": planned.category,
                    "title": planned.title,
                    "description": planned.description,
                    "rationale": planned.rationale,
                    "root_cause": planned.root_cause,
                    "priority": planned.priority,
                    "confidence": planned.confidence,
                    "time_minutes": planned.time_minutes,
                    "friction_score": friction.friction_score,
                    "adherence_probability": friction.adherence_probability,
                    "friction_recommendation": friction.recommendation,
                })

        # Sort by combined confidence (highest first)
        candidates.sort(key=lambda c: c["confidence"], reverse=True)
        return candidates[:max_interventions]

    @property
    def friction_estimator(self) -> BehavioralFrictionEstimator:
        return self._friction

    @property
    def feedback_tracker(self) -> InterventionFeedbackTracker:
        return self._feedback
