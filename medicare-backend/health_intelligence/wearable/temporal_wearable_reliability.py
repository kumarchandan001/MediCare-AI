"""
temporal_wearable_reliability.py
────────────────────────────────
Models wearable data trust over time.

Responsibilities:
  - Score wearable confidence based on consistency
  - Filter noisy / anomalous signals
  - Suppress transient spikes that would over-trigger escalation
  - Provide a temporal trust score that other engines consume
"""

from typing import Any, Dict, List

# Minimum readings needed before high trust
MIN_READINGS_FOR_HIGH_TRUST = 5
ANOMALY_THRESHOLD_SPO2 = 6  # drop of > 6% in one reading = suspect
ANOMALY_THRESHOLD_HR = 30   # jump of > 30 bpm in one reading = suspect


class TemporalWearableReliability:

    def __init__(self) -> None:
        self._readings: Dict[str, List[Dict[str, Any]]] = {}

    def record_reading(self, session_id: str, wearable: Dict[str, Any]) -> None:
        self._readings.setdefault(session_id, []).append(dict(wearable))

    def assess_reliability(self, session_id: str) -> Dict[str, Any]:
        readings = self._readings.get(session_id, [])
        if not readings:
            return {
                "trust_score": 0.3,
                "is_reliable": False,
                "anomalies_detected": 0,
                "reading_count": 0,
                "explanation": "No wearable data has been recorded yet. Trust is low by default.",
            }

        anomalies = self._detect_anomalies(readings)
        consistency = self._consistency_score(readings)
        reading_count = len(readings)

        # Trust builds with more consistent readings
        base_trust = min(0.9, reading_count / (MIN_READINGS_FOR_HIGH_TRUST * 2))
        anomaly_penalty = len(anomalies) * 0.1
        trust = max(0.1, min(0.95, base_trust * consistency - anomaly_penalty))

        return {
            "trust_score": round(trust, 3),
            "is_reliable": trust > 0.5,
            "anomalies_detected": len(anomalies),
            "anomaly_details": anomalies[:5],
            "consistency": round(consistency, 3),
            "reading_count": reading_count,
            "explanation": self._explain(trust, len(anomalies), reading_count),
        }

    def get_filtered_latest(self, session_id: str) -> Dict[str, Any]:
        """Return the latest wearable reading with anomalies suppressed."""
        readings = self._readings.get(session_id, [])
        if not readings:
            return {}
        latest = dict(readings[-1])

        # If this reading looks anomalous compared to recent history, use median instead
        if len(readings) >= 3:
            for key in ("spo2", "heart_rate", "temperature"):
                if key in latest:
                    recent_vals = [r[key] for r in readings[-5:] if key in r]
                    if recent_vals:
                        median = sorted(recent_vals)[len(recent_vals) // 2]
                        if key == "spo2" and abs(latest[key] - median) > ANOMALY_THRESHOLD_SPO2:
                            latest[key] = median
                        elif key == "heart_rate" and abs(latest[key] - median) > ANOMALY_THRESHOLD_HR:
                            latest[key] = median
        return latest

    # ── internals ────────────────────────────────

    @staticmethod
    def _detect_anomalies(readings: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        anomalies = []
        for i in range(1, len(readings)):
            prev, curr = readings[i - 1], readings[i]
            if "spo2" in prev and "spo2" in curr:
                if abs(curr["spo2"] - prev["spo2"]) > ANOMALY_THRESHOLD_SPO2:
                    anomalies.append({"type": "spo2_spike", "reading": str(i)})
            if "heart_rate" in prev and "heart_rate" in curr:
                if abs(curr["heart_rate"] - prev["heart_rate"]) > ANOMALY_THRESHOLD_HR:
                    anomalies.append({"type": "hr_spike", "reading": str(i)})
        return anomalies

    @staticmethod
    def _consistency_score(readings: List[Dict[str, Any]]) -> float:
        """How consistent are the wearable readings?"""
        if len(readings) < 2:
            return 0.5
        spo2_vals = [r["spo2"] for r in readings if "spo2" in r]
        hr_vals = [r["heart_rate"] for r in readings if "heart_rate" in r]

        scores = []
        for vals in (spo2_vals, hr_vals):
            if len(vals) >= 2:
                mean = sum(vals) / len(vals)
                variance = sum((v - mean) ** 2 for v in vals) / len(vals)
                std = variance ** 0.5
                # Low std = high consistency
                scores.append(max(0.1, 1.0 - std / (mean + 1)))
        return sum(scores) / len(scores) if scores else 0.5

    @staticmethod
    def _explain(trust: float, anomalies: int, count: int) -> str:
        if count < MIN_READINGS_FOR_HIGH_TRUST:
            return "Limited wearable history. Trust will improve with more consistent readings."
        if anomalies > 2:
            return "Multiple anomalous readings detected. Wearable data is being treated with caution."
        if trust > 0.7:
            return "Wearable data appears consistent and reliable."
        return "Wearable data shows moderate reliability."
