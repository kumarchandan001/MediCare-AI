import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_

from core.database import get_db
from core.deps import get_current_user
from shared.response import success_response, error_response
from features.auth.models import User
from features.health.models import MedicationReminder
from features.health.medication_schemas import (
    MedicationCreateRequest,
    MedicationUpdateRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/medications", tags=["Medications"])


# ── GET /medications ──────────────────────
@router.get("")
async def list_medications(
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's medication reminders."""
    query = select(MedicationReminder).where(
        MedicationReminder.user_id == current_user.id
    )
    if active_only:
        query = query.where(MedicationReminder.is_active == True)
    query = query.order_by(desc(MedicationReminder.created_at))

    result = await db.execute(query)
    meds = result.scalars().all()
    active_count = sum(1 for m in meds if m.is_active)

    return success_response(
        data={
            "medications": [
                {
                    "id": m.id,
                    "medicine_name": m.medicine_name,
                    "dosage": m.dosage,
                    "reminder_time": m.reminder_time,
                    "frequency": m.frequency,
                    "instructions": m.instructions,
                    "is_active": m.is_active,
                    "created_at": str(m.created_at),
                }
                for m in meds
            ],
            "count": len(meds),
            "active": active_count,
        }
    )


# ── POST /medications ─────────────────────
@router.post("", status_code=201)
async def create_medication(
    data: MedicationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a new medication reminder."""
    med = MedicationReminder(
        user_id=current_user.id,
        **data.model_dump(exclude_none=True),
    )
    db.add(med)
    await db.commit()
    await db.refresh(med)

    return success_response(
        data={
            "id": med.id,
            "medicine_name": med.medicine_name,
            "dosage": med.dosage,
            "reminder_time": med.reminder_time,
            "frequency": med.frequency,
            "is_active": med.is_active,
            "created_at": str(med.created_at),
        },
        message="Medication added successfully.",
        status_code=201,
    )


# ── PATCH /medications/{id} ───────────────
@router.patch("/{med_id}")
async def update_medication(
    med_id: int,
    data: MedicationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update medication reminder."""
    result = await db.execute(
        select(MedicationReminder).where(
            and_(
                MedicationReminder.id == med_id,
                MedicationReminder.user_id == current_user.id,
            )
        )
    )
    med = result.scalar_one_or_none()
    if not med:
        return error_response("Medication not found.", status_code=404)

    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(med, field, value)

    await db.commit()
    return success_response(data={"id": med_id}, message="Medication updated.")


# ── DELETE /medications/{id} ──────────────
@router.delete("/{med_id}")
async def delete_medication(
    med_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete medication reminder."""
    result = await db.execute(
        select(MedicationReminder).where(
            and_(
                MedicationReminder.id == med_id,
                MedicationReminder.user_id == current_user.id,
            )
        )
    )
    med = result.scalar_one_or_none()
    if not med:
        return error_response("Medication not found.", status_code=404)

    await db.delete(med)
    await db.commit()
    return success_response(data={"deleted": True}, message="Medication removed.")


# ── PATCH /medications/{id}/toggle ────────
@router.patch("/{med_id}/toggle")
async def toggle_medication(
    med_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle medication active/inactive."""
    result = await db.execute(
        select(MedicationReminder).where(
            and_(
                MedicationReminder.id == med_id,
                MedicationReminder.user_id == current_user.id,
            )
        )
    )
    med = result.scalar_one_or_none()
    if not med:
        return error_response("Medication not found.", status_code=404)

    med.is_active = not med.is_active
    await db.commit()
    return success_response(
        data={"id": med_id, "is_active": med.is_active},
        message="Medication activated." if med.is_active else "Medication paused.",
    )
