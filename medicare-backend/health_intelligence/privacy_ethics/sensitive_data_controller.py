"""Sensitive Data Controller — Controls data exposure and storage."""
import time


class SensitiveDataController:
    def filter_for_display(self, data: dict, access_level: str = "user") -> dict:
        """Filter output based on access level."""
        filtered = dict(data)
        if access_level == "user":
            # Remove internal AI metadata
            for key in ["raw_confidence", "internal_scores", "model_weights", "debug_data"]:
                filtered.pop(key, None)
            # Remove hypothesis internals
            if "hypotheses" in filtered:
                filtered["hypotheses"] = [
                    {k: v for k, v in h.items() if k not in ("internal_score", "model_weight", "debug")}
                    for h in filtered["hypotheses"]
                ]
        return {"filtered_data": filtered, "access_level": access_level, "generated_at": time.time()}

    def classify_sensitivity(self, symptom: str) -> str:
        high_sensitivity = ["mental_health", "sexual", "substance", "hiv", "genetic", "reproductive"]
        if any(s in symptom.lower() for s in high_sensitivity):
            return "high"
        return "standard"
