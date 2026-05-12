"""
Escalation Tone Moderator — Emotionally Safe Escalation

Ensures escalation messages convey urgency without causing panic.
"""
import time


class EscalationToneModerator:
    TONE_TEMPLATES = {
        "routine": "Your clinical picture is being monitored steadily. No immediate concerns.",
        "watchful": "Some observations suggest a bit closer attention may be helpful. This is a normal precaution.",
        "elevated": "The investigation has identified patterns that suggest consulting a healthcare professional would be beneficial.",
        "urgent": "Based on the evolving evidence, timely professional medical evaluation is recommended. This is a precautionary step to ensure your safety.",
        "emergency": "Your symptoms suggest immediate medical attention may be needed. Please contact a healthcare provider or emergency services.",
    }

    TONE_EMOTIONAL_SAFETY = {
        "routine": {"anxiety_risk": "none", "reassurance": True, "action_urgency": "none"},
        "watchful": {"anxiety_risk": "low", "reassurance": True, "action_urgency": "low"},
        "elevated": {"anxiety_risk": "moderate", "reassurance": True, "action_urgency": "moderate"},
        "urgent": {"anxiety_risk": "moderate", "reassurance": True, "action_urgency": "high"},
        "emergency": {"anxiety_risk": "high", "reassurance": False, "action_urgency": "immediate"},
    }

    def moderate_escalation_tone(self, escalation_level: str, custom_message: str = "") -> dict:
        template = self.TONE_TEMPLATES.get(escalation_level, self.TONE_TEMPLATES["routine"])
        safety = self.TONE_EMOTIONAL_SAFETY.get(escalation_level, self.TONE_EMOTIONAL_SAFETY["routine"])

        # Use template if no custom message, otherwise validate custom
        message = custom_message if custom_message else template

        # Validate custom messages for fear language
        if custom_message:
            fear_words = ["panic", "dying", "fatal", "terrifying", "hopeless"]
            found = [w for w in fear_words if w in custom_message.lower()]
            if found:
                message = template  # Fall back to safe template

        return {
            "generated_at": time.time(),
            "escalation_level": escalation_level,
            "moderated_message": message,
            "emotional_safety": safety,
            "summary": f"Escalation ({escalation_level}): {message}",
        }
