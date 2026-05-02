import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from shared.response import error_response

logger = logging.getLogger(__name__)


def register_error_handlers(app: FastAPI):
    """Register global error handlers."""

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        fields = {}
        for error in exc.errors():
            field = ".".join(
                str(loc) for loc in error["loc"] if loc != "body"
            )
            fields[field] = error["msg"]
        return error_response(
            message=f"Validation failed: {', '.join(fields.keys())}",
            error_type="VALIDATION_ERROR",
            status_code=422,
            details={"fields": fields},
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_error_handler(request: Request, exc: SQLAlchemyError):
        logger.error(f"Database error: {exc}", exc_info=True)
        return error_response(
            message="Database error occurred.",
            error_type="DATABASE_ERROR",
            status_code=500,
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Exception):
        return error_response(
            message=f"Endpoint not found: {request.url.path}",
            error_type="NOT_FOUND",
            status_code=404,
        )

    @app.exception_handler(405)
    async def method_not_allowed(request: Request, exc: Exception):
        return error_response(
            message="Method not allowed.",
            error_type="METHOD_NOT_ALLOWED",
            status_code=405,
        )

    @app.exception_handler(Exception)
    async def generic_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error: {exc}", exc_info=True)
        return error_response(
            message="Internal server error. Our team has been notified.",
            error_type="SERVER_ERROR",
            status_code=500,
        )
