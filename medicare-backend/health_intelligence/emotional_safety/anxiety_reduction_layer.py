"""
Anxiety Reduction Layer — Filters Fear-Heavy Phrasing

Intercepts AI output and reduces anxiety-inducing language patterns.
"""
import time
import re


class AnxietyReductionLayer:
    ANXIETY_PATTERNS = [
        {"pattern": r"you (might|could|may) (have|be developing) (cancer|tumor|malignant)",
         "replacement": "some patterns are being investigated further. Professional evaluation is recommended."},
        {"pattern": r"(worst|bad) case scenario",
         "replacement": "in a more complex scenario"},
        {"pattern": r"don't (delay|wait|hesitate)",
         "replacement": "timely attention is recommended"},
        {"pattern": r"(immediately|urgently) (go|visit|call)",
         "replacement": "consider contacting a healthcare provider"},
        {"pattern": r"this (can|could) (kill|be lethal|be deadly)",
         "replacement": "this warrants professional medical evaluation"},
    ]

    def reduce_anxiety(self, text: str) -> dict:
        original = text
        reductions = []

        for item in self.ANXIETY_PATTERNS:
            if re.search(item["pattern"], text, re.IGNORECASE):
                text = re.sub(item["pattern"], item["replacement"], text, flags=re.IGNORECASE)
                reductions.append({"pattern": item["pattern"], "replacement": item["replacement"]})

        anxiety_score = self._score_anxiety(text)

        return {
            "generated_at": time.time(),
            "original_text": original,
            "reduced_text": text,
            "reductions_made": len(reductions),
            "reductions": reductions,
            "residual_anxiety_score": anxiety_score,
            "is_safe": anxiety_score < 0.3,
        }

    def _score_anxiety(self, text: str) -> float:
        triggers = ["die", "death", "fatal", "kill", "worst case", "emergency",
                     "panic", "terrif", "horrif", "catastroph", "hopeless"]
        text_lower = text.lower()
        count = sum(1 for t in triggers if t in text_lower)
        return min(1.0, count * 0.15)
