"""Uncertainty Monitoring Engine — Tracks uncertainty patterns over time."""
import time


class UncertaintyMonitoringEngine:
    def __init__(self):
        self._history = []

    def record_uncertainty(self, session_id: str, level: str, score: float, source_count: int):
        entry = {"timestamp": time.time(), "session_id": session_id,
                 "level": level, "score": score, "source_count": source_count}
        self._history.append(entry)
        if len(self._history) > 300:
            self._history = self._history[-300:]
        return entry

    def get_trend(self, session_id: str) -> dict:
        entries = [e for e in self._history if e["session_id"] == session_id]
        if len(entries) < 2:
            return {"trend": "insufficient_data", "entries": len(entries)}
        scores = [e["score"] for e in entries[-5:]]
        avg = sum(scores) / len(scores)
        trend = "increasing" if scores[-1] > scores[0] + 0.05 else "decreasing" if scores[-1] < scores[0] - 0.05 else "stable"
        return {"trend": trend, "avg_score": round(avg, 3), "entries": len(entries)}
