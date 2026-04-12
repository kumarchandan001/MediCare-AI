"""
utils/api_validators.py
───────────────────────
Schema-based JSON request validation for the /api/v1/ layer.

Separate from utils/validators.py (which handles form-level validation).
This module validates incoming API request bodies against simple schemas.

Usage:
    schema = {
        "heart_rate":   {"type": int,   "required": False, "min": 30, "max": 250},
        "sleep_hours":  {"type": float, "required": False, "min": 0,  "max": 24},
        "notes":        {"type": str,   "required": False, "max_length": 500},
    }
    cleaned, errors = validate_api_request(request.json, schema)
"""

from flask import request as flask_request


def validate_api_request(data: dict | None, schema: dict) -> tuple[dict, list]:
    """
    Validate `data` against `schema`.

    Returns:
        (cleaned_data, errors)
        If errors is non-empty, the request should be rejected.
    """
    if data is None:
        data = {}

    errors = []
    cleaned = {}

    for field, rules in schema.items():
        value = data.get(field)
        required = rules.get("required", False)
        field_type = rules.get("type", str)

        # Required check
        if required and (value is None or value == ""):
            errors.append({"field": field, "message": f"{field} is required"})
            continue

        if value is None or value == "":
            continue

        # Type coercion
        try:
            if field_type in (int, float):
                value = field_type(value)
            elif field_type == str:
                value = str(value).strip()
            elif field_type == bool:
                if isinstance(value, str):
                    value = value.lower() in ("true", "1", "yes")
                else:
                    value = bool(value)
            elif field_type == list:
                if not isinstance(value, list):
                    errors.append({"field": field, "message": f"{field} must be a list"})
                    continue
        except (ValueError, TypeError):
            errors.append({"field": field, "message": f"{field} must be of type {field_type.__name__}"})
            continue

        # Range checks (numeric)
        if field_type in (int, float):
            if "min" in rules and value < rules["min"]:
                errors.append({
                    "field": field,
                    "message": f"{field} must be at least {rules['min']}"
                })
                continue
            if "max" in rules and value > rules["max"]:
                errors.append({
                    "field": field,
                    "message": f"{field} must be at most {rules['max']}"
                })
                continue

        # String length check
        if field_type == str:
            if "max_length" in rules and len(value) > rules["max_length"]:
                errors.append({
                    "field": field,
                    "message": f"{field} must be at most {rules['max_length']} characters"
                })
                continue

        # Choices check
        if "choices" in rules and value not in rules["choices"]:
            errors.append({
                "field": field,
                "message": f"{field} must be one of: {rules['choices']}"
            })
            continue

        cleaned[field] = value

    return cleaned, errors


def validate_pagination(args: dict) -> dict:
    """
    Extract and validate pagination parameters from query args.

    Returns:
        {"page": int, "per_page": int}  (defaults: page=1, per_page=20)
    """
    try:
        page = max(1, int(args.get("page", 1)))
    except (ValueError, TypeError):
        page = 1

    try:
        per_page = min(100, max(1, int(args.get("per_page", 20))))
    except (ValueError, TypeError):
        per_page = 20

    return {"page": page, "per_page": per_page}


def require_json() -> bool:
    """
    Check that the current request has a JSON content type.
    Returns True if valid, False if not.
    """
    return flask_request.is_json
