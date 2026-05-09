"""
health_intelligence/coaching/health_coach_engine.py
───────────────────────────────────────────────
Top-level coaching engine — translates interventions
into adaptive, personality-aware, psychologically-safe
wellness coaching messages.

Orchestrates:
  - Personality selection
  - Message formatting
  - Psychological safety filtering
  - Notification pacing
  - Escalation messaging
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.coaching.coach_personalities import (
    CoachPersonalitySelector, CoachingPersonality,
)
from health_intelligence.coaching.psychological_safety import (
    PsychologicalSafetyLayer,
)

log = logging.getLogger(__name__)


class HealthCoachEngine:
    """
    Generates adaptive, safe, personality-aware coaching
    for users based on their current state.
    """

    def __init__(self):
        self._personality = CoachPersonalitySelector()
        self._safety = PsychologicalSafetyLayer()

    def generate_coaching(
        self,
        user_id: int,
        interventions: list[dict],
        stress_level: float = 40,
        fatigue_level: float = 30,
        physiological_state: str = "normal",
        recovery_state: Optional[str] = None,
        needs_escalation: bool = False,
        max_messages: int = 3,
    ) -> dict:
        """
        Generate coaching messages for a set of interventions.
        """
        # 1. Select personality
        engagement = self._personality.get_engagement_score(user_id)
        personality = self._personality.select_personality(
            stress_level, fatigue_level,
            physiological_state, recovery_state,
            engagement,
        )

        # 2. Format messages
        messages: list[dict] = []
        for intervention in interventions[:max_messages]:
            raw = self._personality.format_coaching_message(
                personality,
                intervention.get("title", ""),
                intervention.get("description", ""),
                context_note=intervention.get("rationale", ""),
            )

            # 3. Safety filter
            safe = self._safety.sanitize_message(raw)
            safe = self._safety.frame_positive(safe)

            messages.append({
                "intervention_id": intervention.get("intervention_id", ""),
                "category": intervention.get("category", ""),
                "message": safe,
                "priority": intervention.get("priority", "moderate"),
            })

        # 4. Notification pacing
        msg_texts = [m["message"] for m in messages]
        paced = self._safety.apply_notification_pacing(
            user_id, msg_texts, max_messages,
        )
        # Trim messages to paced count
        messages = messages[:len(paced)]

        # 5. Escalation message if needed
        escalation = None
        if needs_escalation:
            esc_raw = self._personality.format_escalation_message(personality)
            esc_safe = self._safety.sanitize_message(esc_raw)
            escalation = {
                "message": esc_safe,
                "urgency": "high",
                "note": (
                    "This recommendation is based on your wellness patterns. "
                    "A healthcare professional can provide personalized clinical guidance."
                ),
            }

        # Record engagement
        self._personality.record_engagement(user_id)

        return {
            "personality": personality.name,
            "tone": personality.tone,
            "coaching_messages": messages,
            "escalation": escalation,
            "message_count": len(messages),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def generate_daily_insight(
        self,
        user_id: int,
        wellness_score: Optional[float] = None,
        trend: str = "stable",
        top_concern: Optional[str] = None,
    ) -> str:
        """
        Generate a single daily wellness insight message.
        """
        parts: list[str] = []

        if wellness_score is not None:
            if wellness_score >= 75:
                parts.append(f"Your wellness score is strong at {wellness_score:.0f}.")
            elif wellness_score >= 50:
                parts.append(f"Your wellness score is {wellness_score:.0f} — room to grow.")
            else:
                parts.append(
                    f"Your wellness score is at {wellness_score:.0f}. "
                    "Let's focus on small improvements today."
                )

        if trend == "improving":
            parts.append("Your overall trend is heading in a positive direction!")
        elif trend == "declining":
            parts.append("Your trend has shifted — a good day to prioritize self-care.")

        if top_concern:
            display = top_concern.replace("_", " ")
            parts.append(
                f"Today's focus area: {display}. "
                "Small, consistent steps make a difference."
            )

        raw = " ".join(parts) if parts else "Keep up the good work today!"
        return self._safety.sanitize_message(raw)

    @property
    def safety_layer(self) -> PsychologicalSafetyLayer:
        return self._safety
