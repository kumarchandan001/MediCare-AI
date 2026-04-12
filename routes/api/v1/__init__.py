"""
routes/api/v1/__init__.py
─────────────────────────
Blueprint registration hub for all V1 API endpoints.

Creates the api_v1 blueprint and imports all route modules so their
decorators are registered on this blueprint.
"""

from flask import Blueprint

api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")

# Import all route modules so their @api_v1.route() decorators register
from routes.api.v1 import health   # noqa: F401, E402
from routes.api.v1 import user     # noqa: F401, E402
from routes.api.v1 import prediction  # noqa: F401, E402
from routes.api.v1 import alerts   # noqa: F401, E402
from routes.api.v1 import habits   # noqa: F401, E402
from routes.api.v1 import admin    # noqa: F401, E402
from routes.api.v1 import auth     # noqa: F401, E402
from routes.api.v1 import google_fit  # noqa: F401, E402  — Google Fit sync
