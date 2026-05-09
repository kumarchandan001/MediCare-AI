from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from core.config import settings


def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode("utf-8"), hashed.encode("utf-8")
    )


def create_access_token(
    subject: str, expires_delta: Optional[timedelta] = None
) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MIN)
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════
# PRODUCTION HARDENING UTILITIES
# ═══════════════════════════════════════════════════════════════════

import re
import logging
import secrets
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from fastapi import Request, Response

log = logging.getLogger(__name__)


# ── Security Headers Middleware ──────────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds OWASP-recommended security headers to every response.
    Healthcare-grade protection against clickjacking, MIME sniffing, and XSS.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(self), payment=()"
        )

        if settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

        return response


# ── Rate Limiting (In-Memory, Redis-upgradable) ─────────────────
class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window rate limiter with burst protection.
    Production upgrade: Replace _store with Redis INCR/EXPIRE for multi-worker.
    """

    def __init__(self, app, requests_per_minute: int = 60,
                 burst_limit: int = 20):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.burst = burst_limit
        self._store: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/", "/health", "/metrics"]:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = datetime.now(timezone.utc).timestamp()
        window_start = now - 60.0

        self._store[client_ip] = [
            ts for ts in self._store[client_ip] if ts > window_start
        ]

        if len(self._store[client_ip]) >= self.rpm:
            log.warning("Rate limit exceeded for IP: %s", client_ip)
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Too many requests. Please try again later.",
                    "error_type": "RATE_LIMIT_EXCEEDED",
                },
                headers={"Retry-After": "60"},
            )

        burst_window = now - 5.0
        recent = [ts for ts in self._store[client_ip] if ts > burst_window]
        if len(recent) >= self.burst:
            log.warning("Burst limit exceeded for IP: %s", client_ip)
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Request rate too high. Please slow down.",
                    "error_type": "BURST_LIMIT_EXCEEDED",
                },
                headers={"Retry-After": "5"},
            )

        self._store[client_ip].append(now)
        return await call_next(request)


# ── Auth Endpoint Rate Limiting ─────────────────────────────────
class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Stricter rate limiting for authentication endpoints.
    Prevents brute-force login and credential stuffing attacks.
    """

    AUTH_PATHS = {
        "/api/v1/auth/login", "/api/v1/auth/signup",
        "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password",
    }

    def __init__(self, app, max_attempts: int = 10):
        super().__init__(app)
        self.max_attempts = max_attempts
        self._store: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path not in self.AUTH_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = datetime.now(timezone.utc).timestamp()
        window_start = now - 900.0  # 15-minute window

        self._store[client_ip] = [
            ts for ts in self._store[client_ip] if ts > window_start
        ]

        if len(self._store[client_ip]) >= self.max_attempts:
            log.warning("Auth rate limit exceeded for IP: %s", client_ip)
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Too many authentication attempts. Please wait 15 minutes.",
                    "error_type": "AUTH_RATE_LIMIT",
                },
                headers={"Retry-After": "900"},
            )

        self._store[client_ip].append(now)
        return await call_next(request)


# ── Request Sanitization ────────────────────────────────────────
_DANGEROUS_PATTERNS = [
    re.compile(r"<script[\s>]", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),
]


def sanitize_input(value: str) -> str:
    """Strip potentially dangerous input patterns (XSS prevention)."""
    if not isinstance(value, str):
        return value
    for pattern in _DANGEROUS_PATTERNS:
        value = pattern.sub("", value)
    return value.strip()


# ── CSRF Token Helpers ──────────────────────────────────────────
def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    return secrets.token_urlsafe(32)


def verify_csrf_token(token: str, expected: str) -> bool:
    """Constant-time comparison to prevent timing attacks."""
    return secrets.compare_digest(token, expected)
