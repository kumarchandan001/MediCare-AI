"""
Emotional Safety Engine — Central Coordinator for Calm UX

Orchestrates calm language, escalation tone, anxiety reduction,
and cognitive load balancing into a unified emotional safety pipeline.
"""
import time
from .calm_language_controller import CalmLanguageController
from .escalation_tone_moderator import EscalationToneModerator
from .anxiety_reduction_layer import AnxietyReductionLayer
from .cognitive_load_balancer import CognitiveLoadBalancer


class EmotionalSafetyEngine:
    def __init__(self):
        self.calm_lang = CalmLanguageController()
        self.tone_mod = EscalationToneModerator()
        self.anxiety = AnxietyReductionLayer()
        self.cog_load = CognitiveLoadBalancer()

    def apply_emotional_safety(self, narrative_text: str, escalation_level: str = "routine",
                               output_data: dict = None) -> dict:
        # 1. Calm language
        calm_result = self.calm_lang.apply_calm_language(narrative_text)
        text = calm_result["calm_text"]

        # 2. Anxiety reduction
        anxiety_result = self.anxiety.reduce_anxiety(text)
        text = anxiety_result["reduced_text"]

        # 3. Escalation tone moderation
        tone_result = self.tone_mod.moderate_escalation_tone(escalation_level)

        # 4. Cognitive load balancing
        load_result = None
        if output_data:
            load_result = self.cog_load.balance_output(output_data)

        # Overall safety score
        calm_score = self.calm_lang.validate_tone(text)["score"]
        anxiety_score = 1.0 - anxiety_result["residual_anxiety_score"]
        load_score = 1.0 - (load_result["cognitive_load_score"] if load_result else 0.3)

        overall = round((calm_score * 0.35 + anxiety_score * 0.35 + load_score * 0.3), 3)

        return {
            "generated_at": time.time(),
            "safe_narrative": text,
            "escalation_message": tone_result["moderated_message"],
            "calm_language": calm_result,
            "anxiety_reduction": anxiety_result,
            "tone_moderation": tone_result,
            "cognitive_load": load_result,
            "emotional_safety_score": overall,
            "is_emotionally_safe": overall > 0.6,
            "summary": f"Emotional safety score: {overall:.0%}. {'Safe.' if overall > 0.6 else 'Needs attention.'}",
        }
