"""Escalation Audit Engine — Tracks escalation decisions."""
import time
import logging

logger = logging.getLogger("escalation_audit")


class EscalationAuditEngine:
    def __init__(self):
        self._log = []

    def log_escalation(self, session_id: str, level: str, reasons: list, is_emergency: bool = False):
        entry = {
            "timestamp": time.time(), "session_id": session_id,
            "level": level, "reasons": reasons, "is_emergency": is_emergency,
        }
        self._log.append(entry)
        if len(self._log) > 200:
            self._log = self._log[-200:]
        logger.info(f"[ESCALATION] {session_id} | level={level} | emergency={is_emergency}")
        return entry

    def get_escalation_history(self, session_id: str) -> list:
        return [e for e in self._log if e["session_id"] == session_id]

    def get_escalation_metrics(self) -> dict:
        total = len(self._log)
        emergencies = sum(1 for e in self._log if e["is_emergency"])
        levels = {}
        for e in self._log:
            levels[e["level"]] = levels.get(e["level"], 0) + 1
        return {"total": total, "emergencies": emergencies, "by_level": levels}
