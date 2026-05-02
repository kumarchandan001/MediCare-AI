"""
features/google_fit/router.py
──────────────────────────────────────────
Google Fit integration endpoints:

  GET   /google-fit/status       — Connection status + last sync
  GET   /google-fit/auth-url     — OAuth2 URL for frontend redirect
  GET   /google-fit/callback     — Google redirect with auth code
  POST  /google-fit/complete-auth— Save tokens from OAuth callback
  POST  /google-fit/sync         — Manual sync (1-30 days)
  PATCH /google-fit/auto-sync    — Toggle auto-sync on/off
  DELETE/google-fit/disconnect   — Revoke token + clear connection
  GET   /google-fit/history      — Sync history (last 10)

GOOGLE CLOUD CONSOLE SETUP:
  1. Go to: console.cloud.google.com
  2. Create project: "MediCare AI"
  3. Enable: Fitness API
  4. Create OAuth2 credentials (Web app)
  5. Redirect URI: http://localhost:8000/api/v1/google-fit/callback
  6. Copy GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to .env
  7. Generate encryption key:
     python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import secrets
import logging
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from core.deps import get_current_user
from core.config import settings
from features.auth.models import User
from features.google_fit import service, sync_engine
from features.google_fit.models import GoogleFitSync
from shared.response import success_response, error_response

log = logging.getLogger(__name__)
router = APIRouter(prefix="/google-fit", tags=["Google Fit"])


# ── GET /google-fit/status ────────────────
@router.get("/status")
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get Google Fit connection status."""
    status = await service.get_connection_status(db, current_user.id)
    return success_response(data=status)


# ── GET /google-fit/auth-url ──────────────
@router.get("/auth-url")
async def get_auth_url(
    current_user: User = Depends(get_current_user),
):
    """Get the Google OAuth2 URL to redirect user."""
    state = secrets.token_urlsafe(16)
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/google-fit/callback"
    url = service.build_auth_url(state=state, redirect_uri=redirect_uri)
    return success_response(data={
        "auth_url": url,
        "state": state,
        "redirect_uri": redirect_uri,
    })


# ── GET /google-fit/callback ──────────────
@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Google OAuth2 callback.
    Exchanges code for tokens and redirects user back to frontend.
    """
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/google-fit/callback"

    try:
        tokens = await service.exchange_code_for_tokens(
            code=code, redirect_uri=redirect_uri,
        )
        frontend_url = (
            f"{settings.FRONTEND_URL}/profile?google_fit=success"
            f"&access_token={tokens['access_token']}"
            f"&refresh_token={tokens.get('refresh_token', '')}"
            f"&expires_in={tokens.get('expires_in', 3600)}"
        )
        return RedirectResponse(url=frontend_url)
    except Exception as e:
        log.error(f"OAuth callback failed: {e}")
        frontend_url = (
            f"{settings.FRONTEND_URL}/profile?google_fit=error"
            f"&message={str(e)}"
        )
        return RedirectResponse(url=frontend_url)


# ── POST /google-fit/complete-auth ────────
@router.post("/complete-auth")
async def complete_auth(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Frontend calls this with tokens from OAuth callback to save them securely.
    Body: { access_token, refresh_token, expires_in }
    """
    access_token = body.get("access_token")
    refresh_token = body.get("refresh_token", "")
    expires_in = body.get("expires_in", 3600)

    if not access_token:
        return error_response("Missing access_token.", "VALIDATION_ERROR", 400)

    await service.save_tokens(
        db=db,
        user_id=current_user.id,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )

    # Trigger initial sync (last 7 days)
    try:
        summary = await sync_engine.run_sync(
            db=db, user_id=current_user.id, days_back=7, sync_type="initial",
        )
        return success_response(
            data={"connected": True, "initial_sync": summary},
            message="Google Fit connected. Initial data synced.",
        )
    except Exception as e:
        log.warning(f"Initial sync failed: {e}")
        return success_response(
            data={"connected": True, "initial_sync": None},
            message="Google Fit connected. Sync will run soon.",
        )


# ── POST /google-fit/sync ─────────────────
@router.post("/sync")
async def manual_sync(
    days_back: int = Query(default=1, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger a manual sync. days_back: how many days to fetch (1-30)."""
    status = await service.get_connection_status(db, current_user.id)
    if not status.get("connected"):
        return error_response("Google Fit is not connected.", "NOT_CONNECTED", 400)

    try:
        summary = await sync_engine.run_sync(
            db=db, user_id=current_user.id, days_back=days_back, sync_type="manual",
        )
        return success_response(
            data=summary,
            message=f"Synced {days_back} day(s) from Google Fit.",
        )
    except PermissionError as e:
        return error_response(str(e), "AUTH_ERROR", 401)
    except Exception as e:
        log.error(f"Manual sync error: {e}")
        return error_response("Sync failed. Please try again.", "SYNC_ERROR", 500)


# ── PATCH /google-fit/auto-sync ───────────
@router.patch("/auto-sync")
async def toggle_auto_sync_endpoint(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle auto-sync. Body: { enabled: bool }"""
    enabled = body.get("enabled", False)
    await service.toggle_auto_sync(db, current_user.id, enabled)
    return success_response(
        data={"auto_sync": enabled},
        message=f"Auto-sync {'enabled' if enabled else 'disabled'}.",
    )


# ── DELETE /google-fit/disconnect ─────────
@router.delete("/disconnect")
async def disconnect(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke Google Fit access and clear tokens."""
    ok = await service.disconnect_google_fit(db, current_user.id)
    if not ok:
        return error_response("User not found.", "NOT_FOUND", 404)
    return success_response(
        data={"connected": False},
        message="Google Fit disconnected.",
    )


# ── GET /google-fit/history ───────────────
@router.get("/history")
async def sync_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get last 10 sync operations."""
    result = await db.execute(
        select(GoogleFitSync)
        .where(GoogleFitSync.user_id == current_user.id)
        .order_by(desc(GoogleFitSync.started_at))
        .limit(10)
    )
    syncs = result.scalars().all()
    return success_response(data={
        "history": [
            {
                "id": s.id,
                "sync_type": s.sync_type,
                "status": s.status,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "vitals": s.vitals_synced,
                "activities": s.activities_synced,
                "total_steps": s.total_steps,
                "avg_hr": s.avg_heart_rate,
                "error": s.error_message,
            }
            for s in syncs
        ]
    })
