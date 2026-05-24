"""Permits router — government approval workflow and QR retrieval."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.auth import get_current_user, require_role
from models.base import get_db
from models.models import Permit, PermitStatus, Booking, User, UserRole, AuditEvent
from schemas import (
    PermitDetailOut,
    PermitApproveRequest,
    PermitRejectRequest,
    PermitQRResponse,
)

router = APIRouter(prefix="/permits", tags=["permits"])


async def _load_permit(permit_id: uuid.UUID, db: AsyncSession) -> Permit:
    """Load a permit with its booking relationship. Raises 404 if missing."""
    q = await db.execute(
        select(Permit)
        .options(selectinload(Permit.booking).selectinload(Booking.traveler))
        .where(Permit.id == permit_id)
    )
    permit = q.scalar_one_or_none()
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    return permit


@router.get("", response_model=list[PermitDetailOut])
async def list_permits(
    current_user: User = Depends(require_role("government", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """List all permits — government/admin only."""
    q = await db.execute(
        select(Permit)
        .options(selectinload(Permit.booking).selectinload(Booking.traveler))
        .order_by(Permit.created_at.desc())
    )
    return q.scalars().all()


@router.patch("/{permit_id}/approve", response_model=PermitDetailOut)
async def approve_permit(
    permit_id: uuid.UUID,
    payload: PermitApproveRequest = PermitApproveRequest(),
    current_user: User = Depends(require_role("government", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Government approves a permit — sets status=approved and issued_at=now."""
    permit = await _load_permit(permit_id, db)

    if permit.status == PermitStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Permit already approved")
    if permit.status == PermitStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot approve a cancelled permit")

    permit.status = PermitStatus.APPROVED
    permit.issued_at = datetime.now(timezone.utc)
    permit.approved_by_id = current_user.id

    if payload.notes and permit.permit_metadata:
        permit.permit_metadata = {**permit.permit_metadata, "approval_notes": payload.notes}
    elif payload.notes:
        permit.permit_metadata = {"approval_notes": payload.notes}

    # Audit event
    event = AuditEvent(
        booking_id=permit.booking_id,
        actor=f"user:{current_user.email}",
        event_type="permit_approved",
        event_data={
            "permit_id": str(permit.id),
            "permit_number": permit.permit_number,
            "approved_by": str(current_user.id),
            "notes": payload.notes,
        },
    )
    db.add(event)
    await db.commit()
    await db.refresh(permit)
    return permit


@router.patch("/{permit_id}/reject", response_model=PermitDetailOut)
async def reject_permit(
    permit_id: uuid.UUID,
    payload: PermitRejectRequest,
    current_user: User = Depends(require_role("government", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Government rejects a permit with a reason."""
    permit = await _load_permit(permit_id, db)

    if permit.status in (PermitStatus.APPROVED, PermitStatus.CANCELLED):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject permit with status '{permit.status.value}'",
        )

    permit.status = PermitStatus.REJECTED
    permit.rejection_reason = payload.reason

    event = AuditEvent(
        booking_id=permit.booking_id,
        actor=f"user:{current_user.email}",
        event_type="permit_rejected",
        event_data={
            "permit_id": str(permit.id),
            "permit_number": permit.permit_number,
            "reason": payload.reason,
            "rejected_by": str(current_user.id),
        },
    )
    db.add(event)
    await db.commit()
    await db.refresh(permit)
    return permit


@router.get("/{permit_id}/qr", response_model=PermitQRResponse)
async def get_permit_qr(
    permit_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the QR code data for a permit (base64 PNG + payload dict)."""
    permit = await _load_permit(permit_id, db)

    # Operators may only see their own booking permits
    if current_user.role == UserRole.OPERATOR:
        booking_q = await db.execute(
            select(Booking).where(Booking.id == permit.booking_id)
        )
        booking = booking_q.scalar_one_or_none()
        if not booking or booking.operator_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your permit")

    return PermitQRResponse(
        permit_id=permit.id,
        permit_number=permit.permit_number,
        qr_code_base64=permit.qr_code_data,
        qr_payload=permit.permit_metadata,
    )
