"""
deterioration_detector.py
─────────────────────────
Detects clinical worsening patterns with velocity and trajectory modeling.

Responsibilities:
  - Score deterioration severity
  - Detect acute vs chronic worsening
  - Compute worsening velocity
  - Flag specific deterioration categories (respiratory, cardiac, neurological, etc.)
"""

from typing import Any, Dict, List

# Safety: never report deterioration certainty above this
MAX_DETERIORATION_CONFIDENCE = 0.88


class DeteriorationDetector:

    # Category → symptom keywords that indicate worsening in that domain
    DOMAIN_SIGNALS: Dict[str, List[str]] = {
        "respiratory": ["worsening_cough", "increasing_shortness_of_breath", "declining_spo2", "productive_cough"],
        "cardiovascular": ["chest_pain_increasing", "heart_rate_rising", "palpitations_worsening"],
        "neurological": ["worsening_headache", "increasing_dizziness", "confusion"],
        "fatigue": ["escalating_fatigue", "exhaustion_worsening", "activity_decline"],
        "inflammatory": ["persistent_fever", "spreading_pain", "swelling_increasing"],
    }

    def __init__(self) -> None:
        self._history: Dict[str, List[Dict[str, Any]]] = {}

    def record_state(
        self,
        session_id: str,
        severity: float,
        active_symptoms: List[str],
        wearable: Dict[str, Any] | None = None,
    ) -> None:
        self._history.setdefault(session_id, []).append({
            "severity": severity,
            "symptoms": list(active_symptoms),
            "wearable": wearable or {},
        })

    def detect(self, session_id: str) -> Dict[str, Any]:
        history = self._history.get(session_id, [])
        if len(history) < 2:
            return {
                "is_deteriorating": False,
                "score": 0.0,
                "velocity": 0.0,
                "type": "none",
                "domains": [],
                "explanation": "Not enough data to assess deterioration.",
            }

        recent = history[-1]
        prev = history[-2]

        severity_delta = recent["severity"] - prev["severity"]
        symptom_delta = len(recent["symptoms"]) - len(prev["symptoms"])
        velocity = self._compute_velocity(history)

        # Domain-specific worsening
        domains = self._detect_domain_worsening(recent["symptoms"], prev["symptoms"])

        # Wearable worsening signals
        wearable_worsening = self._wearable_worsening(recent.get("wearable", {}), prev.get("wearable", {}))

        raw_score = (
            max(0, severity_delta) * 0.4
            + max(0, symptom_delta) * 0.05
            + velocity * 0.3
            + wearable_worsening * 0.25
        )
        score = min(MAX_DETERIORATION_CONFIDENCE, raw_score)

        det_type = "acute" if velocity > 0.15 else "chronic" if score > 0.1 else "none"
        is_det = score > 0.08

        return {
            "is_deteriorating": is_det,
            "score": round(score, 3),
            "velocity": round(velocity, 4),
            "type": det_type,
            "domains": domains,
            "severity_delta": round(severity_delta, 3),
            "symptom_delta": symptom_delta,
            "explanation": self._explain(is_det, det_type, domains, velocity),
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _compute_velocity(history: List[Dict[str, Any]]) -> float:
        if len(history) < 3:
            return abs(history[-1]["severity"] - history[-2]["severity"])
        recent_deltas = [
            history[i]["severity"] - history[i - 1]["severity"]
            for i in range(max(1, len(history) - 4), len(history))
        ]
        return max(0, sum(recent_deltas) / len(recent_deltas))

    def _detect_domain_worsening(self, current: List[str], previous: List[str]) -> List[str]:
        new_symptoms = set(current) - set(previous)
        domains = []
        for domain, signals in self.DOMAIN_SIGNALS.items():
            if new_symptoms & set(signals):
                domains.append(domain)
        return domains

    @staticmethod
    def _wearable_worsening(current: Dict[str, Any], previous: Dict[str, Any]) -> float:
        score = 0.0
        if current.get("spo2") and previous.get("spo2"):
            if current["spo2"] < previous["spo2"]:
                score += min(0.3, (previous["spo2"] - current["spo2"]) * 0.03)
        if current.get("heart_rate") and previous.get("heart_rate"):
            if current["heart_rate"] > previous["heart_rate"]:
                score += min(0.2, (current["heart_rate"] - previous["heart_rate"]) * 0.005)
        return min(0.5, score)

    @staticmethod
    def _explain(is_det: bool, det_type: str, domains: List[str], velocity: float) -> str:
        if not is_det:
            return "No significant deterioration detected at this time."
        parts = []
        if det_type == "acute":
            parts.append("Rapid clinical changes detected.")
        else:
            parts.append("A gradual worsening trend has been observed.")
        if domains:
            parts.append(f"Areas of concern: {', '.join(domains)}.")
        return " ".join(parts)
