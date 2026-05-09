from typing import List, Dict, Any

class AdaptiveQuestionEngine:
    def __init__(self):
        # Base mapping of symptoms to logical follow-up questions
        self.question_knowledge_base = {
            "fever": [
                {"id": "fever_duration", "text": "How long have you had the fever?", "type": "duration", "options": ["Less than 24 hours", "1-3 days", "More than 3 days"]},
                {"id": "fever_pattern", "text": "Is the fever constant or does it come and go?", "type": "pattern", "options": ["Constant", "Comes and goes"]},
                {"id": "fever_chills", "text": "Are you experiencing chills or night sweats?", "type": "associated", "options": ["Yes", "No"]}
            ],
            "cough": [
                {"id": "cough_type", "text": "Is your cough dry or are you coughing up mucus?", "type": "characteristic", "options": ["Dry", "Productive (mucus)"]},
                {"id": "cough_breathing", "text": "Are you experiencing any shortness of breath?", "type": "severity", "options": ["Yes", "No"]},
                {"id": "cough_chest", "text": "Do you feel any chest tightness?", "type": "associated", "options": ["Yes", "No"]}
            ],
            "headache": [
                {"id": "headache_onset", "text": "Did the headache start suddenly or gradually?", "type": "onset", "options": ["Suddenly", "Gradually"]},
                {"id": "headache_light", "text": "Are you sensitive to light or sound?", "type": "associated", "options": ["Yes", "No"]},
                {"id": "headache_nausea", "text": "Are you feeling nauseous?", "type": "associated", "options": ["Yes", "No"]}
            ]
        }

    def get_next_question(self, active_symptoms: List[str], asked_questions: List[str]) -> Dict[str, Any]:
        """
        Determines the next most informative question based on information gain optimization.
        For now, this implements a simplified heuristic to pick unasked questions for active symptoms.
        """
        if not active_symptoms:
            return {"id": "initial_symptom", "text": "What brings you in today? Please describe your main symptoms.", "type": "open"}

        for symptom in active_symptoms:
            if symptom in self.question_knowledge_base:
                available_questions = self.question_knowledge_base[symptom]
                for q in available_questions:
                    if q["id"] not in asked_questions:
                        # Return the highest value unasked question (simplified information gain optimization)
                        return q

        # If no specific follow-ups, ask a general context question to reduce fatigue
        return {"id": "general_worsening", "text": "Are your symptoms getting worse, staying the same, or improving?", "type": "progression", "options": ["Worsening", "Same", "Improving"]}
