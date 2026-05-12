"""
Escalation Boundary Manager — Safe Escalation Triggers

Determines when investigation requires escalation and manages
boundary conditions between routine monitoring and urgent care referral.
Includes emergency override for critical patterns.
"""
import time


class EscalationBoundaryManager:
    EMERGENCY_SYMPTOMS = {
        "chest_pain", "difficulty_breathing", "severe_chest_pressure",
        "sudden_numbness", "sudden_confusion", "loss_of_consciousness",
        "severe_bleeding", "anaphylaxis", "seizure", "stroke_symptoms",
        "cardiac_arrest", "respiratory_failure",
    }

    ESCALATION_THRESHOLDS = {
        "routine": {"severity_max": 0.3, "deterioration_max": 0.2},
        "watchful": {"severity_max": 0.5, "deterioration_max": 0.4},
        "elevated": {"severity_max": 0.7, "deterioration_max": 0.6},
        "urgent": {"severity_max": 0.85, "deterioration_max": 0.75},
        "emergency": {"severity_max": 1.0, "deterioration_max": 1.0},
    }

    def evaluate_escalation(
        self,
        observations: list[dict],
        severity_score: float = 0.0,
        deterioration_score: float = 0.0,
        contradiction_count: int = 0,
        reasoning_stability: float = 0.7,
        unresolved_duration_hours: float = 0,
    ) -> dict:
        symptom_set = {o.get("symptom", "") for o in observations}

        # Emergency override — bypass normal reasoning
        emergency_matches = symptom_set & self.EMERGENCY_SYMPTOMS
        if emergency_matches:
            return {
                "generated_at": time.time(),
                "escalation_level": "emergency",
                "is_emergency": True,
                "emergency_symptoms": list(emergency_matches),
                "action": "Immediate professional medical evaluation is strongly recommended.",
                "bypass_reasoning": True,
                "summary": (f"Emergency symptoms detected: {', '.join(s.replace('_', ' ') for s in emergency_matches)}. "
                            f"Please seek immediate medical attention."),
            }

        # Normal escalation assessment
        level = "routine"
        reasons = []

        if severity_score > 0.7 or deterioration_score > 0.6:
            level = "urgent"
            reasons.append("severity and/or deterioration signals are elevated")
        elif severity_score > 0.5 or deterioration_score > 0.4:
            level = "elevated"
            reasons.append("clinical signals suggest closer monitoring")
        elif severity_score > 0.3 or deterioration_score > 0.2:
            level = "watchful"
            reasons.append("some signals warrant observation")

        # Instability boost
        if reasoning_stability < 0.3 and level in ("routine", "watchful"):
            level = "elevated"
            reasons.append("reasoning instability suggests cautious escalation")

        # Contradiction pressure
        if contradiction_count > 3 and level in ("routine", "watchful"):
            level = "elevated"
            reasons.append("multiple contradictions warrant careful review")

        # Persistent unresolved symptoms
        if unresolved_duration_hours > 72 and level == "routine":
            level = "watchful"
            reasons.append("symptoms have persisted for extended duration")

        actions = {
            "routine": "Continue monitoring at a comfortable pace.",
            "watchful": "Slightly closer attention is recommended. No immediate concern.",
            "elevated": "Consider scheduling a medical consultation for professional input.",
            "urgent": "Timely professional medical evaluation is recommended.",
        }

        return {
            "generated_at": time.time(),
            "escalation_level": level,
            "is_emergency": False,
            "reasons": reasons,
            "action": actions.get(level, actions["routine"]),
            "bypass_reasoning": False,
            "severity_score": severity_score,
            "deterioration_score": deterioration_score,
            "summary": f"Escalation level: {level}. {actions.get(level, '')}",
        }
