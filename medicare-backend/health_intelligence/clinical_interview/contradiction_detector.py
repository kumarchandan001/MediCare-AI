from typing import List, Dict

class ContradictionDetector:
    def __init__(self):
        pass

    def detect_contradictions(self, active_symptoms: List[str], wearable_data: Dict) -> List[Dict]:
        """
        Detects contradictions between reported symptoms and objective wearable data.
        """
        contradictions = []
        if "severe_fatigue" in active_symptoms and wearable_data.get("activity_level") == "high":
            contradictions.append({
                "type": "wearable_symptom_mismatch",
                "description": "Reported severe fatigue but wearable indicates high activity."
            })
        return contradictions
