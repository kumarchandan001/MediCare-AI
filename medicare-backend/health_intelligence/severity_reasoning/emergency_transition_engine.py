"""
emergency_transition_engine.py
──────────────────────────────
Manages logical transition from routine investigation to emergency escalation.

Safety-first design:
  - Requires multiple confirming signals before escalation
  - Never escalates on a single noisy wearable reading
  - Maintains calm, probabilistic language
"""

from typing import Any, Dict

# Minimum confirming signals to recommend emergency
MIN_CONFIRMING_SIGNALS = 2


class EmergencyTransitionEngine:

    def evaluate_transition(
        self,
        severity_level: str,
        triage_level: str,
        deterioration_score: float,
        escalation_likelihood: float,
        wearable_reliability: float = 0.7,
        has_red_flag_symptoms: bool = False,
    ) -> Dict[str, Any]:
        signals = self._count_signals(
            severity_level, triage_level, deterioration_score,
            escalation_likelihood, has_red_flag_symptoms,
        )

        # Only transition if enough confirming evidence
        should_transition = (
            signals >= MIN_CONFIRMING_SIGNALS
            and wearable_reliability > 0.4
        )

        confidence = min(0.85, signals * 0.2) if should_transition else 0.0

        return {
            "should_transition": should_transition,
            "transition_confidence": round(confidence, 3),
            "confirming_signals": signals,
            "wearable_reliability": round(wearable_reliability, 2),
            "recommendation": self._recommendation(should_transition, confidence),
            "explanation": self._explain(should_transition, signals, wearable_reliability),
        }

    @staticmethod
    def _count_signals(
        sev_level: str, triage: str, det: float, esc: float, red_flags: bool,
    ) -> int:
        count = 0
        if sev_level in ("severe", "critical"):
            count += 1
        if triage == "emergency_escalation":
            count += 1
        if det > 0.5:
            count += 1
        if esc > 0.5:
            count += 1
        if red_flags:
            count += 1
        return count

    @staticmethod
    def _recommendation(should_transition: bool, confidence: float) -> str:
        if not should_transition:
            return "Continue current level of monitoring."
        if confidence > 0.6:
            return "Multiple indicators suggest seeking prompt medical attention."
        return "Some concerning indicators are present. Consider medical evaluation."

    @staticmethod
    def _explain(should_transition: bool, signals: int, reliability: float) -> str:
        if not should_transition:
            return "Current indicators do not warrant emergency escalation."
        parts = [f"{signals} confirming signals detected."]
        if reliability < 0.5:
            parts.append("Wearable data reliability is limited, so interpretation should be cautious.")
        return " ".join(parts)
