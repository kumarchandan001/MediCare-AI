"""Explainability Trace Logger — Traces reasoning chain generation."""
import time


class ExplainabilityTraceLogger:
    def __init__(self):
        self._traces = []

    def log_trace(self, session_id: str, detail_level: str, step_count: int, summary: str):
        entry = {"timestamp": time.time(), "session_id": session_id,
                 "detail_level": detail_level, "step_count": step_count, "summary": summary[:200]}
        self._traces.append(entry)
        if len(self._traces) > 300:
            self._traces = self._traces[-300:]
        return entry

    def get_traces(self, session_id: str) -> list:
        return [t for t in self._traces if t["session_id"] == session_id]
