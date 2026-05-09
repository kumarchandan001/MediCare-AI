from typing import Dict, Any

class SymptomClarificationEngine:
    def __init__(self):
        pass

    def extract_symptoms(self, user_text: str) -> list[str]:
        """
        Simple NLP extraction of symptoms from free text.
        """
        text = user_text.lower()
        extracted = []
        if "fever" in text or "hot" in text:
            extracted.append("fever")
        if "cough" in text:
            extracted.append("cough")
        if "headache" in text or "head hurts" in text:
            extracted.append("headache")
        if "chest pain" in text:
            extracted.append("chest_pain")
        return extracted
