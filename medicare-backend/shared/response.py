from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from typing import Any, Optional
import uuid


def success_response(
    data: Any,
    message: Optional[str] = None,
    status_code: int = 200,
) -> JSONResponse:
    body: dict = {
        "status": "success",
        "code": status_code,
        "data": data,
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "2.0.0",
            "request_id": str(uuid.uuid4())[:8],
        },
    }
    if message:
        body["message"] = message
    return JSONResponse(content=body, status_code=status_code)


def error_response(
    message: str,
    error_type: str = "API_ERROR",
    status_code: int = 400,
    details: Optional[dict] = None,
) -> JSONResponse:
    body: dict = {
        "status": "error",
        "code": status_code,
        "error": {
            "type": error_type,
            "message": message,
        },
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": "2.0.0",
            "request_id": str(uuid.uuid4())[:8],
        },
    }
    if details:
        body["error"]["details"] = details
    return JSONResponse(content=body, status_code=status_code)
