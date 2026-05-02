import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from features.auth.models import OAuthToken

logger = logging.getLogger(__name__)

# Constants
GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_FIT_SCOPES = [
    "https://www.googleapis.com/auth/fitness.activity.read",
    "https://www.googleapis.com/auth/fitness.body.read",
    "https://www.googleapis.com/auth/fitness.sleep.read",
]

def generate_auth_url(user_id: int) -> str:
    """Generate the Google OAuth consent URL."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    redirect_uri = getattr(settings, "GOOGLE_REDIRECT_URI", "")
    
    if not client_id or not redirect_uri:
        logger.warning("Google OAuth credentials missing in configuration.")
        return ""
        
    scope = " ".join(GOOGLE_FIT_SCOPES)
    return (
        f"{GOOGLE_OAUTH_URL}?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state={user_id}"  # Use state to pass back user_id
    )

async def exchange_code_for_token(db: AsyncSession, code: str, user_id: int) -> Optional[OAuthToken]:
    """Exchange authorization code for access and refresh tokens."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "")
    redirect_uri = getattr(settings, "GOOGLE_REDIRECT_URI", "")
    
    if not all([client_id, client_secret, redirect_uri]):
        logger.error("Missing Google credentials for token exchange.")
        return None

    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        
    if response.status_code != 200:
        logger.error(f"Failed to exchange token: {response.text}")
        return None
        
    token_data = response.json()
    
    # Calculate expiry
    expires_in = token_data.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    # Check if token exists
    result = await db.execute(
        select(OAuthToken).where(
            OAuthToken.user_id == user_id, 
            OAuthToken.provider == "google"
        )
    )
    existing_token = result.scalar_one_or_none()
    
    if existing_token:
        existing_token.access_token = token_data["access_token"]
        # Only update refresh token if a new one is provided
        if "refresh_token" in token_data:
            existing_token.refresh_token = token_data["refresh_token"]
        existing_token.expires_at = expires_at
        token = existing_token
    else:
        token = OAuthToken(
            user_id=user_id,
            provider="google",
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            expires_at=expires_at
        )
        db.add(token)
        
    await db.commit()
    await db.refresh(token)
    return token

async def refresh_token_if_needed(db: AsyncSession, user_id: int) -> Optional[str]:
    """
    Get the access token, refreshing it if it expires in less than 5 minutes.
    Returns the valid access token string, or None if unavailable/failed.
    """
    result = await db.execute(
        select(OAuthToken).where(
            OAuthToken.user_id == user_id, 
            OAuthToken.provider == "google"
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        return None
        
    # 5-minute buffer
    buffer_time = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    # Ensure expires_at is timezone-aware for comparison
    expires_at = token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
        
    if expires_at > buffer_time:
        return token.access_token
        
    if not token.refresh_token:
        logger.warning(f"Token expired for user {user_id} and no refresh token available.")
        return None
        
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "")
    
    if not client_id or not client_secret:
        return None
        
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": token.refresh_token,
        "grant_type": "refresh_token"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(GOOGLE_TOKEN_URL, data=data)
        
    if response.status_code != 200:
        logger.error(f"Failed to refresh token: {response.text}")
        return None
        
    token_data = response.json()
    expires_in = token_data.get("expires_in", 3600)
    new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    token.access_token = token_data["access_token"]
    if "refresh_token" in token_data:
        token.refresh_token = token_data["refresh_token"]
    token.expires_at = new_expires_at
    
    await db.commit()
    return token.access_token
