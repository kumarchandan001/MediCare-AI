import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, update, or_

from core.database import get_db
from core.deps import get_current_user
from shared.response import success_response, error_response
from features.auth.models import User
from features.emergency.models import EmergencyContact
from features.emergency.schemas import (
    EmergencyContactCreate,
    EmergencyContactUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/emergency", tags=["Emergency"])


def _fmt(c: EmergencyContact) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "relationship": c.relationship,
        "is_primary": c.is_primary,
        "notes": c.notes,
        "created_at": str(c.created_at),
    }


@router.get("/contacts")
async def list_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyContact)
        .where(EmergencyContact.user_id == current_user.id)
        .order_by(
            EmergencyContact.is_primary.desc(),
            desc(EmergencyContact.created_at),
        )
    )
    contacts = result.scalars().all()
    primary = next((c for c in contacts if c.is_primary), None)

    return success_response(data={
        "contacts": [_fmt(c) for c in contacts],
        "count": len(contacts),
        "primary": _fmt(primary) if primary else None,
    })


@router.post("/contacts", status_code=201)
async def create_contact(
    data: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.is_primary:
        await db.execute(
            update(EmergencyContact)
            .where(EmergencyContact.user_id == current_user.id)
            .values(is_primary=False)
        )

    contact = EmergencyContact(
        user_id=current_user.id,
        **data.model_dump(),
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    return success_response(
        data=_fmt(contact),
        message="Contact added.",
        status_code=201,
    )


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: int,
    data: EmergencyContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyContact).where(and_(
            EmergencyContact.id == contact_id,
            EmergencyContact.user_id == current_user.id,
        ))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        return error_response("Contact not found.", status_code=404)

    if data.is_primary:
        await db.execute(
            update(EmergencyContact)
            .where(EmergencyContact.user_id == current_user.id)
            .values(is_primary=False)
        )

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(contact, field, value)

    await db.commit()
    return success_response(data={"id": contact_id}, message="Contact updated.")


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyContact).where(and_(
            EmergencyContact.id == contact_id,
            EmergencyContact.user_id == current_user.id,
        ))
    )
    contact = result.scalar_one_or_none()
    if not contact:
        return error_response("Contact not found.", status_code=404)

    await db.delete(contact)
    await db.commit()
    return success_response(data={"deleted": True}, message="Contact removed.")


@router.get("/alerts")
async def get_emergency_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get unread high-priority alerts."""
    from features.health.models import Alert

    result = await db.execute(
        select(Alert)
        .where(and_(
            Alert.user_id == current_user.id,
            Alert.is_read == False,
            or_(Alert.severity == "high", Alert.severity == "critical"),
        ))
        .order_by(desc(Alert.created_at))
        .limit(10)
    )
    alerts = result.scalars().all()

    return success_response(data={
        "alerts": [
            {
                "id": a.id,
                "title": a.title,
                "message": a.message,
                "severity": a.severity,
                "category": a.category,
                "created_at": str(a.created_at),
            }
            for a in alerts
        ],
        "count": len(alerts),
    })
