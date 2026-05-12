"""
Calm Language Controller — Transforms Alarming Text to Calm Text

Replaces fear-heavy phrases with measured, supportive alternatives.
Enforces a calm communication standard across all AI outputs.
"""
import re
import time


class CalmLanguageController:
    REPLACEMENTS = [
        (r"\bdangerous\b", "requires attention"),
        (r"\bfatal\b", "serious"),
        (r"\blife.?threatening\b", "clinically significant"),
        (r"\byou could die\b", "this warrants prompt medical evaluation"),
        (r"\bemergency room\b", "prompt medical evaluation"),
        (r"\bpanic\b", "concern"),
        (r"\bterrifying\b", "concerning"),
        (r"\bscary\b", "notable"),
        (r"\balarming\b", "noteworthy"),
        (r"\bworry\b", "attention"),
        (r"\bfrighten\b", "concern"),
        (r"\bdire\b", "important"),
        (r"\bcatastroph\w+\b", "significant"),
        (r"\bcritical condition\b", "elevated clinical concern"),
        (r"\bgrave\b", "significant"),
        (r"\bhopeless\b", "complex"),
        (r"\bsuffer(ing)?\b", "experiencing"),
    ]

    def apply_calm_language(self, text: str) -> dict:
        original = text
        modifications = []

        for pattern, replacement in self.REPLACEMENTS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
                modifications.append({"original": matches[0] if matches else pattern,
                                       "replacement": replacement})

        return {
            "generated_at": time.time(),
            "original_text": original,
            "calm_text": text,
            "modifications_made": len(modifications),
            "modifications": modifications,
            "was_modified": len(modifications) > 0,
        }

    def validate_tone(self, text: str) -> dict:
        """Check if text already meets calm language standards."""
        fear_words = ["dangerous", "fatal", "life-threatening", "panic", "terrifying",
                      "scary", "alarming", "catastrophic", "dire", "hopeless"]
        found = [w for w in fear_words if w in text.lower()]
        return {
            "is_calm": len(found) == 0,
            "fear_words_found": found,
            "score": max(0.0, 1.0 - len(found) * 0.15),
        }
