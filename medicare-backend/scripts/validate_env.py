#!/usr/bin/env python3
"""
scripts/validate_env.py
───────────────────────
Pre-flight environment validation for production deployment.

Run before starting the Uvicorn server to catch misconfigurations early.
Usage:
    python scripts/validate_env.py

Exits with code 0 if all checks pass, 1 if any fail.
"""

import os
import sys
import asyncio


def check_required_env_vars() -> list[str]:
    """Verify all required environment variables are set."""
    required = [
        "DATABASE_URL",
        "REDIS_URL",
        "JWT_SECRET_KEY",
        "SECRET_KEY",
    ]
    production_required = [
        "GEMINI_API_KEY",
    ]

    errors = []
    app_env = os.getenv("APP_ENV", "development")

    for var in required:
        val = os.getenv(var, "")
        if not val:
            errors.append(f"Missing required env var: {var}")

    # Check insecure defaults
    jwt_secret = os.getenv("JWT_SECRET_KEY", "")
    if jwt_secret in ("jwt-secret-change-in-production", ""):
        if app_env == "production":
            errors.append("JWT_SECRET_KEY is using insecure default in production!")

    secret_key = os.getenv("SECRET_KEY", "")
    if secret_key in ("change-this-in-production", ""):
        if app_env == "production":
            errors.append("SECRET_KEY is using insecure default in production!")

    if app_env == "production":
        for var in production_required:
            if not os.getenv(var, ""):
                errors.append(f"Missing production env var: {var}")

    return errors


async def check_postgres() -> list[str]:
    """Verify PostgreSQL is reachable."""
    errors = []
    db_url = os.getenv("DATABASE_URL", "")
    if not db_url:
        errors.append("DATABASE_URL not set — skipping DB check")
        return errors

    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        # Convert sync URL to async
        async_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
        engine = create_async_engine(async_url, echo=False)
        async with engine.connect() as conn:
            await conn.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
        await engine.dispose()
        print("  ✓ PostgreSQL connection OK")
    except Exception as e:
        errors.append(f"PostgreSQL connection failed: {e}")

    return errors


async def check_redis() -> list[str]:
    """Verify Redis is reachable."""
    errors = []
    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        errors.append("REDIS_URL not set — skipping Redis check")
        return errors

    try:
        import redis.asyncio as aioredis
        client = aioredis.from_url(redis_url)
        await client.ping()
        await client.aclose()
        print("  ✓ Redis connection OK")
    except ImportError:
        print("  ⚠ redis package not installed — skipping Redis check")
    except Exception as e:
        errors.append(f"Redis connection failed: {e}")

    return errors


def check_websocket_config() -> list[str]:
    """Verify WebSocket endpoint configuration."""
    errors = []
    backend_url = os.getenv("BACKEND_URL", "")
    if not backend_url:
        errors.append("BACKEND_URL not set — WebSocket clients may fail to connect")
    return errors


async def main():
    print("=" * 60)
    print("  MediCare AI — Production Environment Validation")
    print("=" * 60)

    app_env = os.getenv("APP_ENV", "development")
    print(f"\n  Environment: {app_env}")
    print()

    all_errors: list[str] = []

    # 1. Required environment variables
    print("  [1/4] Checking environment variables...")
    all_errors.extend(check_required_env_vars())

    # 2. PostgreSQL
    print("  [2/4] Checking PostgreSQL...")
    all_errors.extend(await check_postgres())

    # 3. Redis
    print("  [3/4] Checking Redis...")
    all_errors.extend(await check_redis())

    # 4. WebSocket config
    print("  [4/4] Checking WebSocket config...")
    all_errors.extend(check_websocket_config())

    print()
    if all_errors:
        print("  ❌ VALIDATION FAILED:")
        for err in all_errors:
            print(f"     • {err}")
        print()
        sys.exit(1)
    else:
        print("  ✅ All checks passed — ready for deployment!")
        print()
        sys.exit(0)


if __name__ == "__main__":
    # Load .env if present
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    asyncio.run(main())
