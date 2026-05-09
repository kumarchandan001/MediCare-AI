from typing import List

class SafetyEscalationEngine:
    def __init__(self):
        self.red_flag_symptoms = ["chest_pain", "shortness_of_breath", "severe_bleeding", "loss_of_consciousness"]

    def check_escalation(self, active_symptoms: List[str]) -> dict:
        for symptom in active_symptoms:
            if symptom in self.red_flag_symptoms:
                return {
                    "is_escalated": True,
                    "reason": f"High risk symptom detected: {symptom.replace('_', ' ')}",
                    "action": "Immediate medical attention recommended."
                }
        return {"is_escalated": False}
