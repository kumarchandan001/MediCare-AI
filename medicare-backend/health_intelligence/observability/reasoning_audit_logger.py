"""Reasoning Audit Logger — Tracks reasoning evolution for debugging and trust."""
import time
import logging

logger = logging.getLogger("clinical_audit")


class ReasoningAuditLogger:
    def __init__(self):
        self._log = []

    def log_reasoning_event(self, session_id: str, event_type: str, data: dict):
        entry = {
            "timestamp": time.time(),
            "session_id": session_id,
            "event_type": event_type,
            "data": data,
        }
        self._log.append(entry)
        if len(self._log) > 500:
            self._log = self._log[-500:]
        logger.info(f"[AUDIT] {session_id} | {event_type} | keys={list(data.keys())}")
        return entry

    def get_session_log(self, session_id: str, limit: int = 50) -> list:
        return [e for e in self._log if e["session_id"] == session_id][-limit:]

    def get_recent(self, limit: int = 20) -> list:
        return self._log[-limit:]
