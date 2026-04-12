"""
utils/api_response.py
─────────────────────
Standardized API response builder for the /api/v1/ layer.

Every V1 endpoint uses these helpers so all JSON responses share a
consistent envelope:

    Success:
    {
        "status":  "success",
        "code":    200,
        "data":    { ... },
        "meta":    { "timestamp": "...", "version": "1.0", "request_id": "..." }
    }

    Error:
    {
        "status":  "error",
        "code":    400,
        "error":   { "type": "VALIDATION_ERROR", "message": "...", "details": [...] },
        "meta":    { "timestamp": "...", "version": "1.0", "request_id": "..." }
    }
"""

import uuid
from datetime import datetime, timezone
from flask import jsonify, make_response

API_VERSION = "1.0"


def _meta(extra: dict | None = None) -> dict:
    """Build the meta block included in every response."""
    m = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": API_VERSION,
        "request_id": uuid.uuid4().hex[:12],
    }
    if extra:
        m.update(extra)
    return m


# ── Success responses ─────────────────────────────────────────────────────────

def success(data=None, code: int = 200, message: str | None = None,
            pagination: dict | None = None):
    """Return a standard success JSON response."""
    # Inject legacy 'success' flag into data for backward compatibility
    # with existing template JS that checks `d.success` after auto-unwrap.
    if isinstance(data, dict) and 'success' not in data:
        data['success'] = True
    body = {
        "status": "success",
        "code": code,
        "data": data,
        "meta": _meta(),
    }
    if message:
        body["message"] = message
    if pagination:
        body["meta"]["pagination"] = pagination
    return make_response(jsonify(body), code)


def created(data=None, message: str | None = "Resource created successfully"):
    """201 Created."""
    return success(data, code=201, message=message)


def no_content():
    """204 No Content (body-less)."""
    return make_response("", 204)


# ── Error responses ───────────────────────────────────────────────────────────

def error(message: str, code: int = 400,
          error_type: str = "API_ERROR", details=None):
    """Return a standard error JSON response."""
    body = {
        "status": "error",
        "code": code,
        "error": {
            "type": error_type,
            "message": message,
        },
        "meta": _meta(),
    }
    if details:
        body["error"]["details"] = details
    return make_response(jsonify(body), code)


def validation_error(message: str = "Validation failed", fields=None):
    """422 Unprocessable Entity — field-level validation failures."""
    return error(message, code=422, error_type="VALIDATION_ERROR", details=fields)


def not_found(resource: str = "Resource"):
    """404 Not Found."""
    return error(f"{resource} not found", code=404, error_type="NOT_FOUND")


def unauthorized(message: str = "Authentication required"):
    """401 Unauthorized."""
    return error(message, code=401, error_type="UNAUTHORIZED")


def forbidden(message: str = "You do not have permission to access this resource"):
    """403 Forbidden."""
    return error(message, code=403, error_type="FORBIDDEN")


def server_error(message: str = "An internal server error occurred", exc=None):
    """500 Internal Server Error."""
    details = None
    if exc:
        details = {"exception": str(exc)}
    return error(message, code=500, error_type="SERVER_ERROR", details=details)
