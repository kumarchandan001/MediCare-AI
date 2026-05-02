import logging
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import io

from core.database import get_db
from core.deps import get_current_admin
from core.cache import cache
from shared.response import success_response, error_response
from features.auth.models import User
from features.admin import service
from features.admin.schemas import AdminUserUpdate, AppSettingUpdate, BroadcastRequest
from features.admin.models import AdminAuditLog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

CACHE_STATS = 5 * 60
CACHE_HEALTH = 15 * 60
CACHE_AI = 10 * 60


@router.get("/stats")
async def platform_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ck = "admin:platform_stats"
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)
    data = await service.get_platform_stats(db)
    await cache.set(ck, data, expire=CACHE_STATS)
    return success_response(data=data)


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=5, le=100),
    search: str = Query(""),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_users_list(db, page, per_page, search)
    return success_response(data=data)


@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_user_detail(db, user_id)
    if not data:
        return error_response("User not found.", status_code=404)
    return success_response(data=data)


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        return error_response("Cannot modify your own admin account.", status_code=400)
    ok = await service.update_user(db, user_id, body.model_dump(exclude_none=True))
    if not ok:
        return error_response("User not found.", status_code=404)
    await cache.delete("admin:platform_stats")
    return success_response(data={"updated": True}, message="User updated successfully.")


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        return error_response("Cannot delete your own account.", status_code=400)
    ok = await service.delete_user(db, user_id)
    if not ok:
        return error_response("User not found.", status_code=404)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="delete_user", target_type="user", target_id=user_id,
    )
    await cache.delete("admin:platform_stats")
    return success_response(data={"deleted": True}, message="User deleted.")


@router.get("/health-intelligence")
async def health_intelligence(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ck = "admin:health_intelligence"
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)
    data = await service.get_health_intelligence(db)
    await cache.set(ck, data, expire=CACHE_HEALTH)
    return success_response(data=data)


@router.get("/ai-monitor")
async def ai_monitor(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ck = "admin:ai_monitor"
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)
    data = await service.get_ai_monitor(db)
    await cache.set(ck, data, expire=CACHE_AI)
    return success_response(data=data)


@router.get("/system-health")
async def system_health(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_system_health(db)
    return success_response(data=data)


# ═══════════════════════════════════════════
#  NEW ENDPOINTS
# ═══════════════════════════════════════════


@router.get("/users/{user_id}/health")
async def user_health_data(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Full health data for one user."""
    data = await service.get_user_full_health(db, user_id)
    return success_response(data=data)


@router.post("/users/{user_id}/promote")
async def promote_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        return error_response("Cannot change your own role.", status_code=400)
    ok = await service.promote_to_admin(db, user_id)
    if not ok:
        return error_response("User not found.", 404)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="promote_admin", target_type="user", target_id=user_id,
        details=f"User {user_id} promoted to admin",
    )
    await cache.delete("admin:platform_stats")
    return success_response(data={"promoted": True}, message="User promoted to admin.")


@router.post("/users/{user_id}/demote")
async def demote_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        return error_response("Cannot demote yourself.", status_code=400)
    ok = await service.demote_from_admin(db, user_id)
    if not ok:
        return error_response("User not found.", 404)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="demote_admin", target_type="user", target_id=user_id,
        details=f"User {user_id} demoted from admin",
    )
    return success_response(data={"demoted": True}, message="Admin demoted to user.")


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ok = await service.admin_reset_user_password(db, user_id)
    if not ok:
        return error_response("Failed to send reset email.", 400)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="reset_user_password", target_type="user", target_id=user_id,
    )
    return success_response(data={"sent": True}, message="Password reset email sent.")


@router.get("/predictions")
async def all_predictions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=5, le=100),
    search: str = Query(""),
    disease: str = Query(""),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_all_predictions(db, page, per_page, search, disease)
    return success_response(data=data)


@router.get("/alerts")
async def all_alerts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20),
    severity: str = Query(""),
    is_unread: bool = Query(False),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_all_alerts(db, page, per_page, severity, is_unread)
    return success_response(data=data)


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ok = await service.resolve_alert(db, alert_id)
    if not ok:
        return error_response("Alert not found.", 404)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="resolve_alert", target_type="alert", target_id=alert_id,
    )
    return success_response(data={"resolved": True})


@router.delete("/alerts/{alert_id}")
async def delete_alert(
    alert_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ok = await service.delete_alert(db, alert_id)
    if not ok:
        return error_response("Alert not found.", 404)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="delete_alert", target_type="alert", target_id=alert_id,
    )
    return success_response(data={"deleted": True})


@router.post("/cache/clear")
async def clear_cache(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    count = await service.clear_all_cache()
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="clear_cache", details=f"Cleared {count} cache keys",
    )
    return success_response(data={"keys_cleared": count}, message=f"Cleared {count} cache keys.")


@router.get("/audit-log")
async def get_audit_log(
    page: int = Query(1, ge=1),
    per_page: int = Query(50),
    action: str = Query(""),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    data = await service.get_audit_log(db, page, per_page, action)
    return success_response(data=data)


@router.get("/settings")
async def get_settings(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    await service.seed_default_settings(db)
    settings = await service.get_all_settings(db)
    return success_response(data={
        "settings": [
            {
                "key":        s.key,
                "value":      s.value,
                "value_type": s.value_type,
                "description": s.description,
                "is_public":  s.is_public,
                "updated_at": str(s.updated_at) if s.updated_at else None,
            }
            for s in settings
        ]
    })


@router.patch("/settings/{key}")
async def update_setting(
    key: str,
    body: AppSettingUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    ok = await service.update_setting(db, key, body.value, admin.id)
    if not ok:
        return error_response("Setting not found.", 404)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="update_setting", target_type="setting",
        details=f"Set {key} = {body.value}",
    )
    await cache.delete("admin:platform_stats")
    return success_response(data={"updated": True}, message=f"Setting '{key}' updated.")


@router.post("/broadcast")
async def broadcast(
    body: BroadcastRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    count = await service.broadcast_message(
        db, admin_id=admin.id, title=body.title, message=body.message, severity=body.severity,
    )
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="broadcast_message", details=f"Sent to {count} users: {body.title}",
    )
    return success_response(data={"sent_to": count}, message=f"Broadcast sent to {count} users.")


@router.get("/export/users")
async def export_users(
    token: str = Query(..., description="JWT access token"),
    db: AsyncSession = Depends(get_db),
):
    """Download users CSV. Accepts token as query param for browser downloads."""
    from core.security import decode_token
    from sqlalchemy import select

    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        return error_response("Invalid or expired token.", status_code=401)

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_admin:
        return error_response("Admin access required.", status_code=403)

    csv_data = await service.export_users_csv(db)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="export_users", details="Downloaded users CSV",
    )
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"},
    )


@router.get("/export/predictions")
async def export_predictions(
    token: str = Query(..., description="JWT access token"),
    db: AsyncSession = Depends(get_db),
):
    """Download predictions CSV. Accepts token as query param for browser downloads."""
    from core.security import decode_token
    from sqlalchemy import select

    payload = decode_token(token)
    if not payload or not payload.get("sub"):
        return error_response("Invalid or expired token.", status_code=401)

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_admin:
        return error_response("Admin access required.", status_code=403)

    csv_data = await service.export_predictions_csv(db)
    await service.write_audit_log(
        db, admin_id=admin.id, admin_email=admin.email,
        action="export_predictions", details="Downloaded predictions CSV",
    )
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions.csv"},
    )

