"""Bookings router — create, list, get, cancel."""
import uuid
import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from core.auth import get_current_user
from models.base import get_db
from models.models import (
    Booking, BookingStatus, Traveler, Permit, PermitStatus,
    SDFCalculation, GuideAssignment, AuditEvent, User, UserRole
)
from schemas import BookingCreateRequest, BookingOut, BookingListOut
from agents.orchestrator import process_booking

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _generate_reference_code() -> str:
    """Generate a short unique booking reference like BT-2026-ABCD12."""
    year = datetime.now().year
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"BT-{year}-{suffix}"


async def _save_agent_results(
    booking: Booking,
    result: dict,
    db: AsyncSession,
) -> None:
    """Persist the agent chain results to DB (permits, SDF, events)."""
    booking.processing_completed_at = datetime.now(timezone.utc)
    booking.processing_duration_ms = result.get("processing_duration_ms")
    booking.agent_chain_status = {
        "status": result.get("status"),
        "eligibility": result.get("eligibility_result"),
        "sdf": {k: v for k, v in (result.get("sdf_result") or {}).items()
                if k != "calculation_breakdown"},
    }

    final_status = result.get("status", "completed")
    if final_status in ("rejected", "eligibility_failed"):
        booking.status = BookingStatus.CANCELLED
    else:
        booking.status = BookingStatus.CONFIRMED

    # Persist SDF calculation
    sdf_data = result.get("sdf_result")
    if sdf_data:
        sdf = SDFCalculation(
            booking_id=booking.id,
            nationality_regime=sdf_data.get("nationality_regime", "international"),
            daily_rate_usd=sdf_data.get("daily_rate_usd", 0),
            duration_days=sdf_data.get("duration_days", 1),
            base_amount_usd=sdf_data.get("base_amount_usd", 0),
            waiver_applied=sdf_data.get("waiver_applied", False),
            waiver_type=sdf_data.get("waiver_type"),
            waiver_percent=sdf_data.get("waiver_percent", 0),
            waiver_amount_usd=sdf_data.get("waiver_amount_usd", 0),
            total_amount_usd=sdf_data.get("total_amount_usd", 0),
            season=sdf_data.get("season", "low"),
            calculation_breakdown=sdf_data.get("calculation_breakdown", {}),
            payment_status="pending",
        )
        db.add(sdf)

    # Persist permits
    permits_data = result.get("permits") or []
    for p in permits_data:
        permit = Permit(
            booking_id=booking.id,
            permit_number=p["permit_number"],
            permit_type=p["permit_type"],
            status=PermitStatus.GOVERNMENT_REVIEW,
            district=p.get("district"),
            valid_from=datetime.fromisoformat(p["valid_from"]) if p.get("valid_from") else None,
            valid_until=datetime.fromisoformat(p["valid_until"]) if p.get("valid_until") else None,
            qr_code_data=p.get("qr_code_data"),
            permit_metadata=p.get("metadata", {}),
        )
        db.add(permit)

    # Persist audit events
    for ev in result.get("events", []):
        event = AuditEvent(
            booking_id=booking.id,
            actor=ev.get("actor", "agent:unknown"),
            event_type=ev.get("event_type", "unknown"),
            event_data=ev.get("event_data", {}),
        )
        db.add(event)

    await db.commit()


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a booking and immediately run the full agent chain
    (eligibility check → SDF calculation → permit generation).
    Returns the completed booking with all agent results inline.
    """
    # Create or match traveler
    result = await db.execute(
        select(Traveler).where(Traveler.passport_number == payload.traveler_passport_number)
    )
    traveler = result.scalar_one_or_none()
    if not traveler:
        traveler = Traveler(
            full_name=payload.traveler_full_name,
            nationality=payload.traveler_nationality.upper(),
            passport_number=payload.traveler_passport_number,
            date_of_birth=payload.traveler_date_of_birth,
            email=payload.traveler_email,
            phone=payload.traveler_phone,
        )
        db.add(traveler)
        await db.flush()

    entry_dt = payload.entry_date
    exit_dt = payload.exit_date
    duration_days = max(1, (exit_dt.date() - entry_dt.date()).days)

    booking = Booking(
        reference_code=_generate_reference_code(),
        traveler_id=traveler.id,
        operator_id=current_user.id,
        status=BookingStatus.PROCESSING,
        entry_date=entry_dt,
        exit_date=exit_dt,
        travel_purpose=payload.travel_purpose,
        districts=payload.districts,
        entry_point=payload.entry_point,
        companions_count=payload.companions_count,
        special_requirements=payload.special_requirements,
        processing_started_at=datetime.now(timezone.utc),
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Build the input dict for the agent chain
    booking_data_for_agents = {
        "booking_id": str(booking.id),
        "reference_code": booking.reference_code,
        "traveler_name": traveler.full_name,
        "nationality": traveler.nationality,
        "passport_number": traveler.passport_number,
        "travel_purpose": payload.travel_purpose,
        "districts": payload.districts,
        "entry_date": entry_dt.isoformat(),
        "exit_date": exit_dt.isoformat(),
        "duration_days": duration_days,
        "traveler_age": payload.traveler_age,
        "is_bhutanese_origin": payload.is_bhutanese_origin,
        "entry_point": payload.entry_point,
        "companions_count": payload.companions_count,
        "operator_email": current_user.email,
        "operator_name": current_user.full_name,
    }

    # Run the agent chain synchronously (await)
    agent_result = await process_booking(booking_data_for_agents)

    # Persist results
    await _save_agent_results(booking, agent_result, db)

    # Reload with all relationships for the response
    q = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.traveler),
            selectinload(Booking.permits),
            selectinload(Booking.sdf_calculation),
            selectinload(Booking.guide_assignment),
            selectinload(Booking.events),
        )
        .where(Booking.id == booking.id)
    )
    full_booking = q.scalar_one()
    return full_booking


@router.get("", response_model=list[BookingListOut])
async def list_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List bookings.
    - Operators see only their own bookings.
    - Government officers see all bookings.
    """
    q = select(Booking).options(selectinload(Booking.traveler))

    if current_user.role == UserRole.OPERATOR:
        q = q.where(Booking.operator_id == current_user.id)
    elif current_user.role not in (UserRole.GOVERNMENT, UserRole.ADMIN):
        # Guides see nothing via this endpoint (they use /guides/assignments)
        return []

    q = q.order_by(Booking.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a booking with full agent chain results, permits, SDF, and audit events."""
    q = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.traveler),
            selectinload(Booking.permits),
            selectinload(Booking.sdf_calculation),
            selectinload(Booking.guide_assignment),
            selectinload(Booking.events),
        )
        .where(Booking.id == booking_id)
    )
    booking = q.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Operators may only see their own bookings
    if current_user.role == UserRole.OPERATOR and booking.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")

    return booking


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a booking (operator cancels own; government can cancel any)."""
    q = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.traveler),
            selectinload(Booking.permits),
            selectinload(Booking.sdf_calculation),
            selectinload(Booking.guide_assignment),
            selectinload(Booking.events),
        )
        .where(Booking.id == booking_id)
    )
    booking = q.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role == UserRole.OPERATOR and booking.operator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Booking already cancelled")

    booking.status = BookingStatus.CANCELLED

    # Cancel associated permits
    for permit in booking.permits:
        if permit.status not in (PermitStatus.APPROVED, PermitStatus.EXPIRED):
            permit.status = PermitStatus.CANCELLED

    # Log the cancellation event
    event = AuditEvent(
        booking_id=booking.id,
        actor=f"user:{current_user.email}",
        event_type="booking_cancelled",
        event_data={"cancelled_by": str(current_user.id), "role": current_user.role.value},
    )
    db.add(event)

    await db.commit()
    await db.refresh(booking)
    return booking
