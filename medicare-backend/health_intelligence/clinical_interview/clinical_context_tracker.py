from typing import Dict, Any

class ClinicalContextTracker:
    def __init__(self):
        pass

    def enrich_context(self, user_id: str) -> Dict[str, Any]:
        """
        Retrieves age, wearable data, chronic conditions, etc.
        """
        # Mocked for now
        return {
            "age": 35,
            "gender": "male",
            "chronic_conditions": [],
            "recent_sleep_quality": "poor",
            "wearable_heart_rate": "normal"
        }
