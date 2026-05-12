"""Contradiction Trace Engine — Logs contradiction events."""
import time


class ContradictionTraceEngine:
    def __init__(self):
        self._traces = []

    def log_contradiction(self, session_id: str, contradiction_type: str, condition: str, impact: float):
        entry = {"timestamp": time.time(), "session_id": session_id,
                 "type": contradiction_type, "condition": condition, "impact": impact}
        self._traces.append(entry)
        if len(self._traces) > 300:
            self._traces = self._traces[-300:]
        return entry

    def get_contradiction_history(self, session_id: str) -> list:
        return [t for t in self._traces if t["session_id"] == session_id]

    def get_metrics(self) -> dict:
        types = {}
        for t in self._traces:
            types[t["type"]] = types.get(t["type"], 0) + 1
        return {"total": len(self._traces), "by_type": types}
