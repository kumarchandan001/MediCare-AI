import logging
import json
import re
import sys
from datetime import datetime
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from core.config import settings

# ── PII Sanitization ──────────────────────────────────────────────
SENSITIVE_KEYS = {"password", "token", "authorization", "cookie", "session", "refresh_token"}
PII_KEYS = {"email", "phone", "ssn", "credit_card"}

def sanitize_dict(data: dict) -> dict:
    """Mask sensitive fields in dictionaries before logging."""
    sanitized = {}
    for key, value in data.items():
        k_lower = key.lower()
        if any(sensitive in k_lower for sensitive in SENSITIVE_KEYS):
            sanitized[key] = "***MASKED***"
        elif any(pii in k_lower for pii in PII_KEYS):
            sanitized[key] = "***PII_MASKED***"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_dict(value)
        else:
            sanitized[key] = value
    return sanitized

# ── Structured JSON Formatter ─────────────────────────────────────
class JSONLogFormatter(logging.Formatter):
    """
    Formats logs as JSON for safe aggregation in production (e.g. Datadog, ELK).
    """
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "environment": settings.APP_ENV,
        }
        
        # Add exception traceback if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        # Handle custom extra fields
        if hasattr(record, "request_id"):
            log_record["request_id"] = record.request_id
        if hasattr(record, "path"):
            log_record["path"] = record.path
            
        return json.dumps(log_record)

def setup_logging():
    """
    Initialize environment-aware logging.
    DEBUG suppressed in production.
    Uses JSON in production, colored text locally.
    """
    log_level = logging.INFO if settings.APP_ENV == "production" else logging.DEBUG
    
    root_logger = logging.getLogger()
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    root_logger.setLevel(log_level)
    
    console_handler = logging.StreamHandler(sys.stdout)
    if settings.APP_ENV == "production":
        console_handler.setFormatter(JSONLogFormatter())
    else:
        # Standard human-readable format for development
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        )
        console_handler.setFormatter(formatter)
        
    root_logger.addHandler(console_handler)
    
    # Suppress verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# ── Request Logging Middleware ────────────────────────────────────
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger = logging.getLogger("api.request")
        
        # Avoid logging noisy endpoints like healthchecks
        if request.url.path in ["/", "/health", "/metrics"]:
            return await call_next(request)

        # Extract safely masked headers
        headers = sanitize_dict(dict(request.headers))
        
        logger.info(
            f"Incoming request: {request.method} {request.url.path}",
            extra={"path": request.url.path, "method": request.method, "headers": headers}
        )
        
        response = await call_next(request)
        
        logger.info(
            f"Outgoing response: {response.status_code}",
            extra={"path": request.url.path, "status_code": response.status_code}
        )
        
        return response
