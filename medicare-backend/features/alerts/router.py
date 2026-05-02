from fastapi import APIRouter, Depends
from core.deps import get_current_user
from shared.response import success_response

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/")
async def get_alerts(user=Depends(get_current_user)):
    return success_response(data={"message": "Alerts endpoint ready"})


@router.patch("/{alert_id}/read")
async def mark_alert_read(alert_id: str, user=Depends(get_current_user)):
    return success_response(data={"message": f"Alert {alert_id} marked as read"})
