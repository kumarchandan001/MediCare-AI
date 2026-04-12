"""
utils/rate_limiter.py
─────────────────────
Simple in-memory IP-based rate limiting for sensitive routes (e.g. login).
For a multi-worker production environment, this should be backed by Redis 
or Flask-Limiter, but this provides a baseline protection against brute-force attacks.
"""

from datetime import datetime, timedelta

# Store failed attempts: { 'ip_address': {'count': int, 'lockout_until': datetime} }
_failed_attempts = {}

# Configuration
MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

def check_rate_limit(ip_address: str) -> tuple[bool, int]:
    """
    Check if the IP is allowed to attempt a sensitive action.
    Returns: (is_allowed: bool, retry_after_seconds: int)
    """
    now = datetime.utcnow()
    record = _failed_attempts.get(ip_address)

    if not record:
        return True, 0

    # If currently locked out
    if record['lockout_until'] and now < record['lockout_until']:
        remaining = (record['lockout_until'] - now).total_seconds()
        return False, int(remaining)

    # If lockout expired, clear and allow
    if record['lockout_until'] and now >= record['lockout_until']:
        _failed_attempts.pop(ip_address, None)
        return True, 0

    # If max attempts reached but no lockout set (shouldn't happen, but safeguard)
    if record['count'] >= MAX_ATTEMPTS:
        lockout_end = now + timedelta(minutes=LOCKOUT_MINUTES)
        record['lockout_until'] = lockout_end
        return False, LOCKOUT_MINUTES * 60

    return True, 0

def record_failed_attempt(ip_address: str) -> None:
    """Record a failed login attempt from an IP address."""
    now = datetime.utcnow()
    record = _failed_attempts.get(ip_address)

    if not record:
        record = {'count': 0, 'lockout_until': None}
        _failed_attempts[ip_address] = record

    record['count'] += 1

    if record['count'] >= MAX_ATTEMPTS:
        record['lockout_until'] = now + timedelta(minutes=LOCKOUT_MINUTES)

def clear_attempts(ip_address: str) -> None:
    """Clear failed attempts for an IP (e.g. after successful login)."""
    _failed_attempts.pop(ip_address, None)
