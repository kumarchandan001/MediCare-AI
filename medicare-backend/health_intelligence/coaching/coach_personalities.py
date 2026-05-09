"""
health_intelligence/coaching/coach_personalities.py
───────────────────────────────────────────────
Adaptive coaching personality system — adjusts
communication style based on user state.

Personalities:
  - Supportive: Gentle, empathetic (for high stress/fatigue)
  - Motivational: Energizing, action-oriented (stable state)
  - Recovery-focused: Calm, protective (recovery periods)
  - Low-friction: Minimal, non-intrusive (engagement fatigue)

Selection is automatic based on:
  - Current stress level
  - Engagement history
  - Physiological state
  - Recovery condition
  - Behavioral consistency
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class CoachingPersonality:
    """A coaching personality profile."""
    name: str
    tone: str
    message_length: str       # brief | moderate | detailed
    emoji_level: str          # none | light | moderate
    urgency_framing: str      # gentle | balanced | direct
    encouragement_level: str  # high | moderate | low


PERSONALITIES = {
    "supportive": CoachingPersonality(
        name="supportive",
        tone="warm, empathetic, understanding",
        message_length="moderate",
        emoji_level="light",
        urgency_framing="gentle",
        encouragement_level="high",
    ),
    "motivational": CoachingPersonality(
        name="motivational",
        tone="energizing, positive, action-oriented",
        message_length="brief",
        emoji_level="moderate",
        urgency_framing="balanced",
        encouragement_level="high",
    ),
    "recovery_focused": CoachingPersonality(
        name="recovery_focused",
        tone="calm, protective, reassuring",
        message_length="moderate",
        emoji_level="light",
        urgency_framing="gentle",
        encouragement_level="moderate",
    ),
    "low_friction": CoachingPersonality(
        name="low_friction",
        tone="minimal, non-intrusive, respectful",
        message_length="brief",
        emoji_level="none",
        urgency_framing="gentle",
        encouragement_level="low",
    ),
}

# Message templates per personality
TEMPLATES = {
    "supportive": {
        "greeting": "Taking care of yourself matters, and it's okay to take it slow.",
        "intervention_intro": "Here's a gentle suggestion that might help:",
        "encouragement": "You're doing great — every small step counts.",
        "recovery": "Your body is working hard to recover. Give it the rest it needs.",
        "escalation": "It might be worth checking in with a healthcare professional for extra support.",
    },
    "motivational": {
        "greeting": "Let's make today a win for your wellness!",
        "intervention_intro": "Here's something you can do right now:",
        "encouragement": "Consistency builds results. Keep it up!",
        "recovery": "Recovery is part of the process. You'll come back stronger.",
        "escalation": "Consider connecting with a healthcare professional to level up your plan.",
    },
    "recovery_focused": {
        "greeting": "Rest and recovery are your top priority right now.",
        "intervention_intro": "When you're ready, this gentle step could support your recovery:",
        "encouragement": "Healing takes time. You're on the right path.",
        "recovery": "Your body is telling you it needs more rest. Listen to it.",
        "escalation": "A healthcare professional can help ensure your recovery stays on track.",
    },
    "low_friction": {
        "greeting": "",
        "intervention_intro": "Quick tip:",
        "encouragement": "",
        "recovery": "Rest when you can.",
        "escalation": "Consider a professional check-in.",
    },
}


class CoachPersonalitySelector:
    """
    Selects and applies the appropriate coaching personality
    based on user state.
    """

    def __init__(self):
        # user_id → engagement count
        self._engagement: dict[int, int] = {}

    def select_personality(
        self,
        stress_level: float = 40,
        fatigue_level: float = 30,
        physiological_state: str = "normal",
        recovery_state: Optional[str] = None,
        engagement_score: float = 0.5,
    ) -> CoachingPersonality:
        """
        Automatically select the best coaching personality.
        """
        # High stress or fatigued → supportive
        if stress_level > 65 or fatigue_level > 60:
            return PERSONALITIES["supportive"]

        # In recovery → recovery-focused
        if (
            recovery_state in ("recovering", "declining")
            or physiological_state in ("fatigued", "abnormal")
        ):
            return PERSONALITIES["recovery_focused"]

        # Low engagement → low friction
        if engagement_score < 0.3:
            return PERSONALITIES["low_friction"]

        # Default → motivational
        return PERSONALITIES["motivational"]

    def format_coaching_message(
        self,
        personality: CoachingPersonality,
        intervention_title: str,
        intervention_description: str,
        context_note: str = "",
    ) -> str:
        """
        Format an intervention as a coaching message
        using the selected personality.
        """
        templates = TEMPLATES.get(personality.name, TEMPLATES["supportive"])

        parts: list[str] = []

        # Greeting (skip for low-friction)
        greeting = templates.get("greeting", "")
        if greeting:
            parts.append(greeting)

        # Context
        if context_note:
            parts.append(context_note)

        # Intervention
        intro = templates.get("intervention_intro", "Suggestion:")
        parts.append(f"{intro} **{intervention_title}** — {intervention_description}")

        # Encouragement
        encouragement = templates.get("encouragement", "")
        if encouragement and personality.encouragement_level != "low":
            parts.append(encouragement)

        return " ".join(filter(None, parts))

    def format_escalation_message(
        self,
        personality: CoachingPersonality,
    ) -> str:
        """Format an escalation-to-professional message."""
        templates = TEMPLATES.get(personality.name, TEMPLATES["supportive"])
        return templates.get("escalation", "Consider consulting a healthcare professional.")

    def record_engagement(self, user_id: int) -> None:
        """Record a user engagement event."""
        self._engagement[user_id] = self._engagement.get(user_id, 0) + 1

    def get_engagement_score(self, user_id: int) -> float:
        """Get normalized engagement score."""
        count = self._engagement.get(user_id, 0)
        return min(1.0, count / 20)
