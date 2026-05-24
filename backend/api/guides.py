"""Guides router — assignments, permit wallet, confirm assignment."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.auth import get_current_user, require_role
from models.base import get_db
from models.models import (
    GuideAssignment, Booking, Permit, PermitStatus, User, AuditEvent
)
from schemas import GuideAssignmentDetailOut, PermitDetailOut, GuideConfirmRequest

router = APIRouter(prefix="/guides", tags=["guides"])


@router.get("/assignments", response_model=list[GuideAssignmentDetailOut])
async def get_my_assignments(
    current_user: User = Depends(require_role("guide", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Return all assignments for the authenticated guide."""
    result = await db.execute(
        select(GuideAssignment)
        .options(
            selectinload(GuideAssignment.booking).selectinload(Booking.traveler)
        )
        .where(GuideAssignment.guide_id == current_user.id)
        .order_by(GuideAssignment.created_at.desc())
    )
    return result.scalars().all()


@router.get("/permits", response_model=list[PermitDetailOut])
async def get_permit_wallet(
    current_user: User = Depends(require_role("guide", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Return all active permits linked to the guide's assignments.
    This is the guide's 'permit wallet' — used for on-site verification.
    """
    # Get booking IDs where this guide is assigned
    assignments_result = await db.execute(
        select(GuideAssignment.booking_id).where(
            GuideAssignment.guide_id == current_user.id
        )
    )
    booking_ids = [row[0] for row in assignments_result.all()]

    if not booking_ids:
        return []

    # Fetch active permits for those bookings
    permits_result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.booking).selectinload(Booking.traveler))
        .where(
            Permit.booking_id.in_(booking_ids),
            Permit.status.in_([PermitStatus.APPROVED, PermitStatus.GOVERNMENT_REVIEW]),
        )
        .order_by(Permit.valid_from.desc())
    )
    return permits_result.scalars().all()


@router.patch("/assignments/{assignment_id}/confirm", response_model=GuideAssignmentDetailOut)
async def confirm_assignment(
    assignment_id: uuid.UUID,
    payload: GuideConfirmRequest = GuideConfirmRequest(),
    current_user: User = Depends(require_role("guide", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Guide confirms they accept an assignment."""
    result = await db.execute(
        select(GuideAssignment)
        .options(
            selectinload(GuideAssignment.booking).selectinload(Booking.traveler)
        )
        .where(GuideAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if assignment.guide_id != current_user.id:
        raise HTTPException(status_code=403, detail="This is not your assignment")

    if assignment.status == "confirmed":
        raise HTTPException(status_code=400, detail="Assignment already confirmed")

    assignment.status = "confirmed"
    assignment.guide_confirmed_at = datetime.now(timezone.utc)

    # Audit
    event = AuditEvent(
        booking_id=assignment.booking_id,
        actor=f"user:{current_user.email}",
        event_type="guide_confirmed_assignment",
        event_data={
            "assignment_id": str(assignment_id),
            "guide_id": str(current_user.id),
            "notes": payload.notes,
        },
    )
    db.add(event)
    await db.commit()
    await db.refresh(assignment)
    return assignment
