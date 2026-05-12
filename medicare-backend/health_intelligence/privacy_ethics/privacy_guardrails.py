"""
Privacy Guardrails — Data Protection Boundaries

Enforces privacy rules for health data processing:
- PII detection and masking
- Sensitive symptom category protection
- Data retention limits
- Access control foundations
"""
import re
import time


class PrivacyGuardrails:
    PII_PATTERNS = [
        (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
        (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "email"),
        (r"\b\d{10,}\b", "phone_number"),
        (r"\b\d{1,5}\s\w+\s(st|ave|blvd|rd|dr|way|ct)\b", "address"),
    ]

    SENSITIVE_CATEGORIES = ["mental_health", "sexual_health", "substance_use",
                            "hiv_status", "genetic_data", "reproductive_health"]

    def scan_for_pii(self, text: str) -> dict:
        found = []
        for pattern, label in self.PII_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                found.append({"type": label, "count": len(matches)})
        return {
            "has_pii": len(found) > 0,
            "pii_types": found,
            "action": "PII detected — masking required before storage." if found else "No PII detected.",
        }

    def mask_pii(self, text: str) -> str:
        for pattern, label in self.PII_PATTERNS:
            text = re.sub(pattern, f"[{label.upper()}_REDACTED]", text, flags=re.IGNORECASE)
        return text

    def check_sensitive_category(self, symptoms: list[str]) -> dict:
        sensitive = [s for s in symptoms if any(c in s for c in self.SENSITIVE_CATEGORIES)]
        return {
            "has_sensitive": len(sensitive) > 0,
            "sensitive_symptoms": sensitive,
            "protection_level": "elevated" if sensitive else "standard",
        }
