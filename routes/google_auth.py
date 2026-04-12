"""
routes/google_auth.py
─────────────────────
Blueprint for the Google Fit OAuth 2.0 flow:

  GET  /auth/google           → redirect user to Google consent screen
  GET  /auth/google/callback  → exchange code → store tokens → redirect to dash
  GET  /auth/google/status    → JSON: connection status + email + last sync
  POST /auth/google/disconnect → revoke + delete tokens
"""

import os
import secrets
import logging
from datetime import datetime, timedelta

from flask import (
    Blueprint, redirect, request, session,
    url_for, flash, jsonify,
)

from utils.auth import login_required
from services.google_fit_service import (
    get_auth_url, exchange_code_for_tokens, fetch_google_email,
    GoogleFitError,
)

logger = logging.getLogger(__name__)

google_auth_bp = Blueprint("google_auth", __name__)


# ═════════════════════════════════════════════════════════════════════════════
#  1. Initiate OAuth
# ═════════════════════════════════════════════════════════════════════════════

@google_auth_bp.route("/auth/google")
@login_required
def google_auth_redirect():
    """
    Redirect the user to Google's OAuth consent screen.
    Stores a CSRF `state` param in the session for verification on callback.
    """
    logger.info("Google OAuth route triggered for user %s", session.get("user_id"))

    # ── Validate credentials are configured ────────────────────────────
    import os
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if not client_id or client_id.startswith("YOUR_"):
        logger.error("Google OAuth not configured — GOOGLE_CLIENT_ID is missing or placeholder")
        session["gfit_msg"] = {
            "type": "warning",
            "text": "Google Fit is not configured yet. Set GOOGLE_CLIENT_ID and "
                    "GOOGLE_CLIENT_SECRET in your .env file with credentials from "
                    "console.cloud.google.com/apis/credentials"
        }
        return redirect(url_for("home"))

    state = secrets.token_urlsafe(32)
    session["google_oauth_state"] = state

    callback_url = url_for("google_auth.google_auth_callback", _external=True)
    auth_url = get_auth_url(redirect_uri=callback_url, state=state)
    logger.info("Redirecting to Google OAuth: %s", auth_url[:80])
    return redirect(auth_url)


# ═════════════════════════════════════════════════════════════════════════════
#  2. OAuth Callback
# ═════════════════════════════════════════════════════════════════════════════

@google_auth_bp.route("/auth/google/callback")
@login_required
def google_auth_callback():
    """
    Google redirects here after the user consents (or denies).
    We exchange the code for tokens, fetch the user's email, and persist.
    """
    # ── Error from Google (user denied, etc.) ─────────────────────────────
    error = request.args.get("error")
    if error:
        logger.warning("Google OAuth error: %s", error)
        if "invalid_client" in error or "unauthorized_client" in error:
            session["gfit_msg"] = {
                "type": "error",
                "text": "Google Fit credentials are invalid. Check GOOGLE_CLIENT_ID "
                        "and GOOGLE_CLIENT_SECRET in .env"
            }
        else:
            session["gfit_msg"] = {"type": "warning", "text": "Google Fit authorization was denied."}
        return redirect(url_for("home"))

    # ── CSRF state check ──────────────────────────────────────────────────
    state = request.args.get("state", "")
    expected = session.pop("google_oauth_state", None)
    if not expected or state != expected:
        logger.warning("OAuth state mismatch — possible CSRF")
        session["gfit_msg"] = {"type": "error", "text": "Authorization failed (state mismatch). Please try again."}
        return redirect(url_for("home"))

    # ── Exchange code for tokens ──────────────────────────────────────────
    code = request.args.get("code")
    if not code:
        session["gfit_msg"] = {"type": "error", "text": "No authorization code received from Google."}
        return redirect(url_for("home"))

    callback_url = url_for("google_auth.google_auth_callback", _external=True)
    try:
        token_data = exchange_code_for_tokens(code, redirect_uri=callback_url)
    except GoogleFitError as exc:
        logger.error("Token exchange error: %s", exc.message)
        session["gfit_msg"] = {"type": "error", "text": "Failed to connect Google Fit. Please try again."}
        return redirect(url_for("home"))

    # ── Fetch connected Google email ──────────────────────────────────────
    google_email = fetch_google_email(token_data["access_token"])

    # ── Persist tokens (encrypted) ────────────────────────────────────────
    from models import db
    from models.user import GoogleFitToken

    user_id = session["user_id"]
    expires_at = datetime.utcnow() + timedelta(
        seconds=token_data.get("expires_in", 3600)
    )

    encrypted_access  = GoogleFitToken.encrypt_token(token_data["access_token"])
    encrypted_refresh = GoogleFitToken.encrypt_token(
        token_data.get("refresh_token", "")
    )

    token_row = GoogleFitToken.query.filter_by(user_id=user_id).first()
    if token_row:
        token_row.access_token  = encrypted_access
        # Only update refresh_token if Google actually returned one
        if token_data.get("refresh_token"):
            token_row.refresh_token = encrypted_refresh
        token_row.expires_at    = expires_at
        token_row.scopes        = token_data.get("scope", "")
        token_row.google_email  = google_email or token_row.google_email
    else:
        token_row = GoogleFitToken(
            user_id       = user_id,
            access_token  = encrypted_access,
            refresh_token = encrypted_refresh if token_data.get("refresh_token") else None,
            expires_at    = expires_at,
            scopes        = token_data.get("scope", ""),
            google_email  = google_email,
        )
        db.session.add(token_row)

    db.session.commit()
    email_display = f" ({google_email})" if google_email else ""
    logger.info("Google Fit connected for user %s%s", user_id, email_display)
    session["gfit_msg"] = {"type": "success", "text": f"Google Fit connected successfully{email_display}! ✅"}
    return redirect(url_for("home"))


# ═════════════════════════════════════════════════════════════════════════════
#  3. Connection Status (JSON)
# ═════════════════════════════════════════════════════════════════════════════

@google_auth_bp.route("/auth/google/status")
@login_required
def google_auth_status():
    """Return JSON describing whether the current user is connected."""
    from models.user import GoogleFitToken

    user_id = session["user_id"]
    token_row = GoogleFitToken.query.filter_by(user_id=user_id).first()

    if token_row and token_row.is_connected:
        return jsonify({
            "connected":    True,
            "google_email": token_row.google_email,
            "last_sync":    token_row.last_sync.isoformat() + "Z" if token_row.last_sync else None,
            "sync_count":   token_row.sync_count or 0,
        })
    return jsonify({"connected": False, "google_email": None, "last_sync": None})


# ═════════════════════════════════════════════════════════════════════════════
#  4. Disconnect
# ═════════════════════════════════════════════════════════════════════════════

@google_auth_bp.route("/auth/google/disconnect", methods=["POST"])
@login_required
def google_auth_disconnect():
    """Revoke the user's Google Fit access and delete stored tokens."""
    from models import db
    from models.user import GoogleFitToken

    user_id = session["user_id"]
    token_row = GoogleFitToken.query.filter_by(user_id=user_id).first()

    if token_row:
        # Best-effort revoke at Google's end
        try:
            import requests as req
            decrypted = GoogleFitToken.decrypt_token(token_row.access_token)
            req.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": decrypted},
                timeout=10,
            )
        except Exception:
            pass  # Non-critical; we'll delete locally regardless

        db.session.delete(token_row)
        db.session.commit()
        logger.info("Google Fit disconnected for user %s", user_id)

    return jsonify({"disconnected": True})
