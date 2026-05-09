from typing import List, Dict

class UncertaintyReductionEngine:
    def __init__(self):
        pass

    def calculate_uncertainty(self, active_symptoms: List[str], answered_questions: Dict) -> float:
        """
        Calculates remaining ambiguity in the current investigation.
        Returns a float between 0.0 (certain) and 1.0 (highly uncertain).
        """
        if not active_symptoms:
            return 1.0
        
        # Simple logic: uncertainty drops as more questions are answered
        base_uncertainty = 1.0
        reduction_per_answer = 0.15
        
        current_uncertainty = base_uncertainty - (len(answered_questions) * reduction_per_answer)
        return max(0.1, min(1.0, current_uncertainty))

    def evaluate_completeness(self, uncertainty: float) -> float:
        return 1.0 - uncertainty
