"""
features/google_fit/service.py
Google Fit OAuth2 + token management.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from features.auth.models import User

log = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
GOOGLE_FIT_SCOPES = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.heart_rate.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
    "https://www.googleapis.com/auth/fitness.body.read",
    "https://www.googleapis.com/auth/fitness.nutrition.read",
    "https://www.googleapis.com/auth/fitness.oxygen_saturation.read",
    "https://www.googleapis.com/auth/fitness.blood_glucose.read",
    "https://www.googleapis.com/auth/fitness.blood_pressure.read",
    "https://www.googleapis.com/auth/fitness.body_temperature.read",
]


def _get_fernet() -> Fernet:
    key = getattr(settings, "GOOGLE_FIT_ENCRYPTION_KEY", None)
    if not key:
        import base64, hashlib
        key = base64.urlsafe_b64encode(
            hashlib.sha256(b"medicare-dev-key").digest()
        ).decode()
    return Fernet(key.encode() if isinstance(key, str) else key)


def _encrypt(value: str) -> str:
    return _get_fernet().encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    return _get_fernet().decrypt(value.encode()).decode()


def build_auth_url(state: str, redirect_uri: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GOOGLE_FIT_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "refresh_token": refresh_token,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


async def save_tokens(
    db: AsyncSession, user_id: int,
    access_token: str, refresh_token: str,
    expires_in: int, scopes: str = "",
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError(f"User {user_id} not found")

    user.google_access_token = _encrypt(access_token)
    user.google_refresh_token = _encrypt(refresh_token)
    user.google_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
    user.google_fit_connected = True
    user.google_fit_scopes = scopes
    await db.commit()
    log.info(f"Saved Google Fit tokens for user {user_id}")


async def get_valid_access_token(db: AsyncSession, user_id: int) -> Optional[str]:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.google_fit_connected or not user.google_access_token:
        return None

    now = datetime.now(timezone.utc)
    if user.google_token_expiry and now >= user.google_token_expiry:
        log.info(f"Refreshing Google Fit token for user {user_id}")
        try:
            refresh_tok = _decrypt(user.google_refresh_token)
            new_tokens = await refresh_access_token(refresh_tok)
            user.google_access_token = _encrypt(new_tokens["access_token"])
            user.google_token_expiry = now + timedelta(
                seconds=new_tokens.get("expires_in", 3600) - 60
            )
            await db.commit()
            return new_tokens["access_token"]
        except Exception as e:
            log.error(f"Token refresh failed for user {user_id}: {e}")
            user.google_fit_connected = False
            await db.commit()
            return None

    return _decrypt(user.google_access_token)


async def disconnect_google_fit(db: AsyncSession, user_id: int) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False

    if user.google_access_token:
        try:
            token = _decrypt(user.google_access_token)
            async with httpx.AsyncClient() as client:
                await client.post(GOOGLE_REVOKE_URL, params={"token": token}, timeout=10)
        except Exception as e:
            log.warning(f"Token revoke failed: {e}")

    user.google_fit_connected = False
    user.google_access_token = None
    user.google_refresh_token = None
    user.google_token_expiry = None
    user.google_fit_last_sync = None
    user.google_fit_scopes = None
    await db.commit()
    log.info(f"Disconnected Google Fit for user {user_id}")
    return True


async def get_connection_status(db: AsyncSession, user_id: int) -> dict:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return {"connected": False}

    return {
        "connected": user.google_fit_connected,
        "last_sync": user.google_fit_last_sync.isoformat() if user.google_fit_last_sync else None,
        "auto_sync": user.google_fit_auto_sync,
        "scopes": user.google_fit_scopes,
        "token_valid": (
            user.google_token_expiry is not None
            and datetime.now(timezone.utc) < user.google_token_expiry
        ) if user.google_fit_connected else False,
    }


async def toggle_auto_sync(db: AsyncSession, user_id: int, enabled: bool) -> bool:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return False
    user.google_fit_auto_sync = enabled
    await db.commit()
    return True
