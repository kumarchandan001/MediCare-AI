"""
routes/api/v1/google_fit.py
───────────────────────────
V1 API endpoints for Google Fit wearable data integration.

  GET /api/v1/google-fit/sync   → fetch latest data from Google Fit and store
  GET /api/v1/google-fit/status → check connection & last sync time + email
"""

import traceback
from flask import session

from routes.api.v1 import api_v1
from utils.api_response import success, error, server_error
from utils.auth import login_required


def _uid():
    return session["user_id"]


# ═════════════════════════════════════════════════════════════════════════════
#  Sync
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route("/google-fit/sync", methods=["GET"])
@login_required
def v1_google_fit_sync():
    """
    Trigger a full Google Fit data sync for the logged-in user.

    Pipeline:
      1. Rate-limit check (configurable cooldown).
      2. Validate token (auto-refresh if expired).
      3. Determine time range from last_sync timestamp.
      4. Fetch aggregated steps + heart-rate from Google Fit.
      5. Clean & validate biological plausibility.
      6. Upsert into ActivityRecord / HealthMonitoring (duplicate-safe).
      7. Update last_sync + sync_count.
    """
    try:
        from services.google_fit_service import (
            sync_google_fit_data,
            NotConnectedError, TokenRevokedError, TokenRefreshError,
            RateLimitError, FitApiError, GoogleFitError,
        )
        result = sync_google_fit_data(_uid())
        return success(result, message="Google Fit sync complete")

    except NotConnectedError:
        return error(
            "Google Fit not connected. Please connect first.",
            code=400, error_type="NOT_CONNECTED"
        )
    except TokenRevokedError:
        return error(
            "Google Fit authorization was revoked. Please reconnect.",
            code=401, error_type="TOKEN_REVOKED"
        )
    except TokenRefreshError as e:
        return error(
            f"Token refresh failed: {e.message}",
            code=401, error_type="TOKEN_REFRESH_FAILED"
        )
    except RateLimitError as e:
        return error(
            e.message,
            code=429, error_type="RATE_LIMITED",
            details={"wait_seconds": e.wait_seconds}
        )
    except FitApiError as e:
        return error(e.message, code=502, error_type="FIT_API_ERROR")
    except GoogleFitError as e:
        return error(e.message, code=400, error_type=e.error_type)
    except Exception as e:
        traceback.print_exc()
        return server_error("Google Fit sync failed unexpectedly", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Status
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route("/google-fit/status", methods=["GET"])
@login_required
def v1_google_fit_status():
    """
    Return the Google Fit connection status for the current user.
    Includes: connected flag, email, last sync time, sync count.
    """
    try:
        from models.user import GoogleFitToken

        token = GoogleFitToken.query.filter_by(user_id=_uid()).first()
        if token and token.is_connected:
            return success({
                "connected":    True,
                "google_email": token.google_email,
                "last_sync":    token.last_sync.isoformat() + "Z" if token.last_sync else None,
                "sync_count":   token.sync_count or 0,
                "expired":      token.is_expired,
            })
        return success({
            "connected": False,
            "google_email": None,
            "last_sync": None,
            "sync_count": 0,
            "expired": None,
        })
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to check Google Fit status", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Final Check Verification
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route("/google-fit/final-check", methods=["GET"])
@login_required
def v1_google_fit_final_check():
    """
    Final verification endpoint to confirm Google Fit integration.
    """
    import logging
    from datetime import datetime, timedelta
    from flask import jsonify
    from models.user import GoogleFitToken
    from models.health_record import ActivityRecord, HealthMonitoring
    from services.google_fit_service import (
        get_valid_access_token, fetch_steps, fetch_heart_rate
    )

    logger = logging.getLogger(__name__)
    user_id = session["user_id"]

    try:
        # 1. CONNECTION CHECK
        token_row = GoogleFitToken.query.filter_by(user_id=user_id).first()
        if not token_row or not token_row.is_connected:
            return jsonify({
                "status": "partial", 
                "message": "Connected but no data available from Google Fit (Not Connected)"
            })

        # 2. TOKEN VALIDATION
        try:
            access_token = get_valid_access_token(user_id)
            token_valid = True
        except Exception as e:
            logger.error("Final check token validation failed: %s", e)
            return jsonify({"status": "error", "message": f"Token validation failed: {str(e)}"})

        # 3. GOOGLE FIT API CALL
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=7)  # Check last 7 days to be safe
        
        steps_data = []
        hr_data = []
        
        try:
            steps_data = fetch_steps(access_token, start_time, end_time)
            hr_data = fetch_heart_rate(access_token, start_time, end_time)
        except Exception as e:
            logger.error("Failed to fetch from Google Fit API during final check: %s", e)
            return jsonify({"status": "error", "message": f"API Fetch Failed: {str(e)}"})

        total_steps = sum(item.get("steps", 0) for item in steps_data) if steps_data else 0
        avg_heart_rate = None
        if hr_data:
            valid_hrs = [item.get("bpm_avg") for item in hr_data if item.get("bpm_avg") is not None]
            if valid_hrs:
                avg_heart_rate = sum(valid_hrs) / len(valid_hrs)

        # 4. AUTO-SYNC CHECK
        db_steps = ActivityRecord.query.filter_by(user_id=user_id, source="google_fit").all()
        db_hrs = HealthMonitoring.query.filter_by(user_id=user_id, source="google_fit").all()
        auto_update_working = len(db_steps) > 0 or len(db_hrs) > 0

        # LOGGING
        logger.info(f"Final Check [User {user_id}]: steps={total_steps}, hr={avg_heart_rate}, "
                    f"db_steps_count={len(db_steps)}, db_hr_count={len(db_hrs)}")

        if total_steps == 0 and not hr_data:
            return jsonify({
                "status": "partial",
                "message": "Connected but no data available from Google Fit"
            })

        return jsonify({
            "status": "success",
            "google_fit_connected": True,
            "token_valid": token_valid,
            "steps_synced": bool(total_steps > 0),
            "heart_rate_synced": bool(hr_data),
            "total_steps": total_steps,
            "avg_heart_rate": round(avg_heart_rate, 1) if avg_heart_rate else None,
            "last_sync_time": token_row.last_sync.isoformat() + "Z" if token_row.last_sync else None,
            "auto_update_working": auto_update_working
        })

    except Exception as e:
        logger.error(f"Final check error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        })
