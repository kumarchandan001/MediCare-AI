"""Longitudinal Data Protection — Cross-session data safety."""
import time


class LongitudinalDataProtection:
    MAX_SESSION_RETENTION_DAYS = 365
    MAX_SNAPSHOTS = 100

    def evaluate_retention(self, session_count: int, oldest_session_age_days: float) -> dict:
        needs_cleanup = (session_count > self.MAX_SNAPSHOTS or
                         oldest_session_age_days > self.MAX_SESSION_RETENTION_DAYS)
        return {
            "generated_at": time.time(),
            "session_count": session_count,
            "oldest_age_days": oldest_session_age_days,
            "needs_cleanup": needs_cleanup,
            "max_sessions": self.MAX_SNAPSHOTS,
            "max_retention_days": self.MAX_SESSION_RETENTION_DAYS,
            "action": "Data cleanup recommended." if needs_cleanup else "Retention within limits.",
        }

    def anonymize_session(self, session_data: dict) -> dict:
        """Strip identifiable information from session data."""
        safe = dict(session_data)
        for key in ["user_id", "name", "email", "phone", "address", "ip_address"]:
            safe.pop(key, None)
        safe["anonymized"] = True
        safe["anonymized_at"] = time.time()
        return safe
