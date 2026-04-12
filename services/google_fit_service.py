"""
services/google_fit_service.py
──────────────────────────────
Encapsulates all Google Fit OAuth 2.0 + Fitness API logic.

Hardened with:
  • Token encryption at rest (Fernet via GoogleFitToken helpers)
  • Auto-refresh pre-check before every API call
  • Data cleaning & biological validation on fetched values
  • Production-aware OAUTHLIB_INSECURE_TRANSPORT guarding
  • Configurable rate limiting (SYNC_COOLDOWN_SECONDS)
  • Structured error handling with typed exceptions
  • Google user-info fetch for connected-email display
"""

import os
import logging
from datetime import datetime, timedelta

import requests

logger = logging.getLogger(__name__)

# ── Google OAuth endpoints ────────────────────────────────────────────────────
GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL  = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_FIT_AGGREGATE_URL = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"

SCOPES = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/userinfo.email",       # for connected-email
]

# ── Configuration ─────────────────────────────────────────────────────────────
SYNC_COOLDOWN_SECONDS = 120   # minimum gap between syncs per user
MAX_STEPS_PER_DAY     = 200_000   # biological ceiling for data cleaning
MAX_HR_BPM            = 250       # biological ceiling
MIN_HR_BPM            = 25        # biological floor


def _client_id():
    return os.getenv("GOOGLE_CLIENT_ID", "")


def _client_secret():
    return os.getenv("GOOGLE_CLIENT_SECRET", "")


def _is_production() -> bool:
    return os.getenv("FLASK_ENV", "").lower() == "production"


# ═════════════════════════════════════════════════════════════════════════════
#  Typed Exceptions
# ═════════════════════════════════════════════════════════════════════════════

class GoogleFitError(Exception):
    """Base exception for Google Fit integration errors."""
    def __init__(self, message: str, error_type: str = "GOOGLE_FIT_ERROR"):
        self.message = message
        self.error_type = error_type
        super().__init__(message)

class NotConnectedError(GoogleFitError):
    def __init__(self):
        super().__init__("Google Fit not connected", "NOT_CONNECTED")

class TokenRevokedError(GoogleFitError):
    def __init__(self):
        super().__init__("Google Fit authorization revoked — please reconnect", "TOKEN_REVOKED")

class TokenRefreshError(GoogleFitError):
    def __init__(self, detail: str = ""):
        super().__init__(f"Token refresh failed: {detail}", "TOKEN_REFRESH_FAILED")

class RateLimitError(GoogleFitError):
    def __init__(self, wait_seconds: int):
        self.wait_seconds = wait_seconds
        super().__init__(
            f"Please wait {wait_seconds}s before syncing again",
            "RATE_LIMITED"
        )

class FitApiError(GoogleFitError):
    def __init__(self, data_type: str, status_code: int):
        super().__init__(
            f"Google Fit API error for {data_type} (HTTP {status_code})",
            "FIT_API_ERROR"
        )


# ═════════════════════════════════════════════════════════════════════════════
#  Production guard
# ═════════════════════════════════════════════════════════════════════════════

def check_production_safety():
    """
    Log a critical warning if OAUTHLIB_INSECURE_TRANSPORT=1 is set in production.
    This variable disables HTTPS enforcement and should be removed in prod.
    Does NOT block the flow — just logs loudly so ops can catch it.
    """
    if _is_production() and os.getenv("OAUTHLIB_INSECURE_TRANSPORT") == "1":
        logger.warning(
            "⚠️  OAUTHLIB_INSECURE_TRANSPORT=1 is set while FLASK_ENV=production. "
            "Remove this from .env before deploying to a public server."
        )


# ═════════════════════════════════════════════════════════════════════════════
#  OAuth helpers
# ═════════════════════════════════════════════════════════════════════════════

def get_auth_url(redirect_uri: str, state: str | None = None) -> str:
    """
    Build the Google OAuth 2.0 consent URL.
    `state` should be a CSRF token stored in the session.
    """
    check_production_safety()
    params = {
        "client_id":     _client_id(),
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "scope":         " ".join(SCOPES),
        "access_type":   "offline",      # gives us a refresh_token
        "prompt":        "consent",       # always ask so refresh_token is returned
    }
    if state:
        params["state"] = state
    qs = "&".join(f"{k}={requests.utils.quote(str(v))}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{qs}"


def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """
    Exchange the authorization code returned by Google for
    access_token + refresh_token.

    Returns dict with:
        access_token, refresh_token, expires_in, scope, token_type
    Raises GoogleFitError on failure.
    """
    payload = {
        "code":          code,
        "client_id":     _client_id(),
        "client_secret": _client_secret(),
        "redirect_uri":  redirect_uri,
        "grant_type":    "authorization_code",
    }
    try:
        resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    except requests.RequestException as e:
        logger.error("Token exchange network error: %s", e)
        raise GoogleFitError(f"Network error during token exchange: {e}")
    if resp.status_code != 200:
        logger.error("Token exchange failed: %s %s", resp.status_code, resp.text)
        raise GoogleFitError(f"Token exchange failed ({resp.status_code})")
    return resp.json()


def refresh_access_token(refresh_token: str) -> dict:
    """
    Use a refresh_token to obtain a new access_token.

    Returns dict with:
        access_token, expires_in, scope, token_type
    Raises TokenRefreshError on failure.
    """
    payload = {
        "refresh_token": refresh_token,
        "client_id":     _client_id(),
        "client_secret": _client_secret(),
        "grant_type":    "refresh_token",
    }
    try:
        resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    except requests.RequestException as e:
        logger.error("Token refresh network error: %s", e)
        raise TokenRefreshError(str(e))
    if resp.status_code == 400:
        # 400 typically means token_revoked or invalid_grant
        raise TokenRevokedError()
    if resp.status_code != 200:
        logger.error("Token refresh failed: %s %s", resp.status_code, resp.text)
        raise TokenRefreshError(f"HTTP {resp.status_code}")
    return resp.json()


def fetch_google_email(access_token: str) -> str | None:
    """Fetch the Google account email using the userinfo endpoint."""
    try:
        resp = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("email")
    except Exception as e:
        logger.warning("Could not fetch Google email: %s", e)
    return None


# ═════════════════════════════════════════════════════════════════════════════
#  Token management (DB-backed, encrypted)
# ═════════════════════════════════════════════════════════════════════════════

def get_valid_access_token(user_id: int) -> str:
    """
    Return a valid (decrypted) access token for a user.
    Auto-refreshes if the current token is expired.
    Raises NotConnectedError / TokenRevokedError on failure.
    """
    from models import db
    from models.user import GoogleFitToken

    token_row = GoogleFitToken.query.filter_by(user_id=user_id).first()
    if not token_row:
        raise NotConnectedError()

    # Decrypt stored token
    access_token = GoogleFitToken.decrypt_token(token_row.access_token)

    if not token_row.is_expired:
        return access_token

    # ── Refresh ──
    if not token_row.refresh_token:
        raise TokenRevokedError()

    decrypted_refresh = GoogleFitToken.decrypt_token(token_row.refresh_token)
    try:
        new_tokens = refresh_access_token(decrypted_refresh)
    except TokenRevokedError:
        # Refresh token revoked — purge the row
        db.session.delete(token_row)
        db.session.commit()
        raise
    except TokenRefreshError:
        # Transient error — don't purge, just re-raise
        raise

    # Encrypt and store new access token
    token_row.access_token = GoogleFitToken.encrypt_token(new_tokens["access_token"])
    token_row.expires_at = datetime.utcnow() + timedelta(
        seconds=new_tokens.get("expires_in", 3600)
    )
    db.session.commit()
    logger.info("Refreshed Google Fit token for user %s", user_id)
    return new_tokens["access_token"]


# ═════════════════════════════════════════════════════════════════════════════
#  Google Fit data fetching
# ═════════════════════════════════════════════════════════════════════════════

def _epoch_millis(dt: datetime) -> int:
    """Convert a datetime to epoch milliseconds (Google Fit format)."""
    return int(dt.timestamp() * 1000)


def _time_range(last_sync: datetime | None):
    """
    Determine start/end for the Fit query.
    If last_sync is available and recent, use it; otherwise default to 7 days.
    """
    end = datetime.utcnow()
    if last_sync and (end - last_sync) < timedelta(days=30):
        start = last_sync
    else:
        start = end - timedelta(days=7)
    return start, end


def _aggregate_request(access_token: str, data_type: str,
                       start: datetime, end: datetime) -> dict:
    """
    Call the Google Fit aggregate endpoint for a single dataType.
    Returns the raw JSON response body.
    """
    body = {
        "aggregateBy": [{"dataTypeName": data_type}],
        "bucketByTime": {"durationMillis": 86400000},  # 1 day
        "startTimeMillis": _epoch_millis(start),
        "endTimeMillis":   _epoch_millis(end),
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type":  "application/json",
    }
    try:
        resp = requests.post(GOOGLE_FIT_AGGREGATE_URL, json=body,
                             headers=headers, timeout=20)
    except requests.ConnectionError as e:
        logger.error("Fit API connection error [%s]: %s", data_type, e)
        raise GoogleFitError(f"Network error fetching {data_type}")
    except requests.Timeout:
        logger.error("Fit API timeout [%s]", data_type)
        raise GoogleFitError(f"Timeout fetching {data_type}")

    if resp.status_code == 401:
        raise TokenRevokedError()
    if resp.status_code == 403:
        raise GoogleFitError(f"Access denied for {data_type} — check OAuth scopes")
    if resp.status_code != 200:
        logger.error("Fit API error [%s]: %s", data_type, resp.text)
        raise FitApiError(data_type, resp.status_code)

    try:
        return resp.json()
    except ValueError:
        raise GoogleFitError(f"Invalid JSON response from Google Fit for {data_type}")


# ── Data cleaning helpers ─────────────────────────────────────────────────────

def _clean_steps(raw_steps: int) -> int | None:
    """Validate and cap step counts to biologically plausible values."""
    if raw_steps <= 0:
        return None
    if raw_steps > MAX_STEPS_PER_DAY:
        logger.warning("Implausible step count %d — capping at %d", raw_steps, MAX_STEPS_PER_DAY)
        return MAX_STEPS_PER_DAY
    return raw_steps


def _clean_heart_rate(bpm: float) -> float | None:
    """Validate heart rate to biologically plausible range."""
    if bpm < MIN_HR_BPM or bpm > MAX_HR_BPM:
        logger.warning("Implausible HR value %.1f — discarding", bpm)
        return None
    return round(bpm, 1)


def fetch_steps(access_token: str, start: datetime, end: datetime) -> list[dict]:
    """
    Fetch daily aggregated step counts with data cleaning.
    Returns a list of dicts:  [{"date": date, "steps": int}, ...]
    """
    raw = _aggregate_request(access_token, "com.google.step_count.delta", start, end)
    results = []
    for bucket in raw.get("bucket", []):
        day_start_ms = int(bucket.get("startTimeMillis", 0))
        day_date = datetime.utcfromtimestamp(day_start_ms / 1000).date()
        steps = 0
        for dataset in bucket.get("dataset", []):
            for point in dataset.get("point", []):
                for val in point.get("value", []):
                    steps += val.get("intVal", 0)
        cleaned = _clean_steps(steps)
        if cleaned:
            results.append({"date": day_date, "steps": cleaned})
    return results


def fetch_heart_rate(access_token: str, start: datetime, end: datetime) -> list[dict]:
    """
    Fetch daily averaged heart-rate readings with data cleaning.
    Returns: [{"date": date, "bpm_avg": float, "bpm_max": float, "bpm_min": float}, ...]
    """
    raw = _aggregate_request(access_token, "com.google.heart_rate.bpm", start, end)
    results = []
    for bucket in raw.get("bucket", []):
        day_start_ms = int(bucket.get("startTimeMillis", 0))
        day_date = datetime.utcfromtimestamp(day_start_ms / 1000).date()
        bpms = []
        for dataset in bucket.get("dataset", []):
            for point in dataset.get("point", []):
                for val in point.get("value", []):
                    fp = val.get("fpVal", 0.0)
                    cleaned = _clean_heart_rate(fp) if fp > 0 else None
                    if cleaned is not None:
                        bpms.append(cleaned)
        if bpms:
            results.append({
                "date":    day_date,
                "bpm_avg": round(sum(bpms) / len(bpms), 1),
                "bpm_max": round(max(bpms), 1),
                "bpm_min": round(min(bpms), 1),
            })
    return results


# ═════════════════════════════════════════════════════════════════════════════
#  Sync orchestrator — maps Fit data → existing MediCare tables
# ═════════════════════════════════════════════════════════════════════════════

def sync_google_fit_data(user_id: int) -> dict:
    """
    Full sync pipeline:
      1. Rate-limit check.
      2. Obtain valid access token (auto-refresh if expired).
      3. Determine time range from last_sync.
      4. Fetch steps + heart-rate from Fit.
      5. Clean & validate data.
      6. Upsert into ActivityRecord / HealthMonitoring (duplicate-safe).
      7. Update last_sync + sync_count.

    Returns a summary dict for the API response.
    Raises typed GoogleFitError subclasses.
    """
    from models import db
    from models.user import GoogleFitToken
    from models.health_record import ActivityRecord, HealthMonitoring

    # ── Rate limit check ──────────────────────────────────────────────────
    token_row = GoogleFitToken.query.filter_by(user_id=user_id).first()
    if not token_row:
        raise NotConnectedError()

    if token_row.last_sync:
        elapsed = (datetime.utcnow() - token_row.last_sync).total_seconds()
        if elapsed < SYNC_COOLDOWN_SECONDS:
            raise RateLimitError(int(SYNC_COOLDOWN_SECONDS - elapsed))

    # ── Get valid token (auto-refresh) ────────────────────────────────────
    access_token = get_valid_access_token(user_id)

    # ── Determine time window ─────────────────────────────────────────────
    start, end = _time_range(token_row.last_sync)

    # ── Fetch data ────────────────────────────────────────────────────────
    steps_data = []
    hr_data = []
    errors = []

    try:
        steps_data = fetch_steps(access_token, start, end)
    except GoogleFitError as e:
        errors.append(f"Steps: {e.message}")
        logger.warning("Steps fetch failed for user %s: %s", user_id, e.message)

    try:
        hr_data = fetch_heart_rate(access_token, start, end)
    except GoogleFitError as e:
        errors.append(f"Heart rate: {e.message}")
        logger.warning("HR fetch failed for user %s: %s", user_id, e.message)

    # ── Upsert steps → ActivityRecord (duplicate-safe) ────────────────────
    steps_synced = 0
    steps_updated = 0
    for entry in steps_data:
        existing = ActivityRecord.query.filter_by(
            user_id=user_id,
            activity_type="Google Fit Steps",
            activity_date=entry["date"],
            source="google_fit",
        ).first()
        if existing:
            if existing.steps != entry["steps"]:
                existing.steps = entry["steps"]
                steps_updated += 1
        else:
            db.session.add(ActivityRecord(
                user_id=user_id,
                activity_type="Google Fit Steps",
                steps=entry["steps"],
                activity_date=entry["date"],
                notes="Auto-synced from Google Fit",
                source="google_fit",
            ))
            steps_synced += 1

    # ── Upsert heart rate → HealthMonitoring (duplicate-safe) ─────────────
    hr_synced = 0
    hr_updated = 0
    for entry in hr_data:
        day_start = datetime.combine(entry["date"], datetime.min.time())
        day_end = day_start + timedelta(days=1)
        existing = HealthMonitoring.query.filter(
            HealthMonitoring.user_id == user_id,
            HealthMonitoring.created_at >= day_start,
            HealthMonitoring.created_at < day_end,
            HealthMonitoring.source == "google_fit",
        ).first()
        if existing:
            if existing.heart_rate != int(entry["bpm_avg"]):
                existing.heart_rate = int(entry["bpm_avg"])
                hr_updated += 1
        else:
            db.session.add(HealthMonitoring(
                user_id=user_id,
                heart_rate=int(entry["bpm_avg"]),
                notes="Google Fit Sync",
                source="google_fit",
                created_at=day_start,
            ))
            hr_synced += 1

    # ── Update last_sync + sync_count ─────────────────────────────────────
    token_row.last_sync = datetime.utcnow()
    token_row.sync_count = (token_row.sync_count or 0) + 1
    db.session.commit()

    # Invalidate personalization cache so AI picks up new data
    try:
        from services.personalization_service import invalidate_user_cache
        invalidate_user_cache(user_id)
    except Exception:
        pass

    total_steps = steps_synced + steps_updated
    total_hr = hr_synced + hr_updated
    logger.info(
        "Google Fit sync #%d for user %s — %d step entries (%d new, %d updated), "
        "%d HR entries (%d new, %d updated)",
        token_row.sync_count, user_id,
        total_steps, steps_synced, steps_updated,
        total_hr, hr_synced, hr_updated,
    )

    return {
        "synced": True,
        "steps_entries": total_steps,
        "steps_new": steps_synced,
        "steps_updated": steps_updated,
        "heart_rate_entries": total_hr,
        "heart_rate_new": hr_synced,
        "heart_rate_updated": hr_updated,
        "time_range": {
            "start": start.isoformat(),
            "end":   end.isoformat(),
        },
        "last_sync":   token_row.last_sync.isoformat(),
        "sync_count":  token_row.sync_count,
        "errors": errors if errors else None,
    }
