"""Disruptions router — create and manage disruption events."""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from core.auth import get_current_user, require_role
from models.base import get_db
from models.models import DisruptionEvent, Booking, User, UserRole
from schemas import DisruptionCreateRequest, DisruptionOut, DisruptionDetailOut
from agents.orchestrator import process_disruption

router = APIRouter(prefix="/disruptions", tags=["disruptions"])


@router.post("", response_model=DisruptionDetailOut, status_code=201)
async def create_disruption(
    payload: DisruptionCreateRequest,
    current_user: User = Depends(require_role("government", "admin", "operator")),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a disruption event and immediately trigger the disruption agent chain.
    Finds affected bookings and generates stakeholder alerts.
    """
    # Find bookings affected by this disruption date + entry point
    q = select(Booking)
    conditions = [Booking.entry_date >= payload.affected_date.replace(hour=0, minute=0, second=0)]
    if payload.affected_entry_point:
        conditions.append(Booking.entry_point.ilike(f"%{payload.affected_entry_point}%"))

    result = await db.execute(q.where(and_(*conditions)).limit(50))
    bookings = result.scalars().all()

    # Build lightweight booking dicts for the agent
    affected_booking_dicts = []
    for b in bookings:
        affected_booking_dicts.append({
            "booking_id": str(b.id),
            "reference_code": b.reference_code,
            "entry_date": b.entry_date.isoformat(),
            "operator_email": None,   # Loaded lazily — agent doesn't send email in demo
            "operator_name": "Operator",
            "traveler_name": "Traveler",
        })

    disruption_data = {
        "type": payload.disruption_type,
        "description": payload.description,
        "affected_date": payload.affected_date.isoformat(),
        "entry_point": payload.affected_entry_point or "Paro International Airport",
        "flight_number": payload.flight_number,
        "severity": payload.severity,
    }

    # Run disruption agent chain
    agent_result = await process_disruption(disruption_data, affected_booking_dicts)

    # Persist disruption event
    disruption = DisruptionEvent(
        disruption_type=payload.disruption_type,
        description=payload.description,
        affected_date=payload.affected_date,
        affected_entry_point=payload.affected_entry_point,
        flight_number=payload.flight_number,
        severity=payload.severity,
        affected_bookings_count=len(bookings),
        resolution_status="active",
        alerts_sent=len(agent_result.get("disruption_alerts", [])) > 0,
    )
    db.add(disruption)
    await db.commit()
    await db.refresh(disruption)

    # Return with alerts attached
    result_out = DisruptionDetailOut(
        **DisruptionOut.model_validate(disruption).model_dump(),
        alerts=agent_result.get("disruption_alerts", []),
    )
    return result_out


@router.get("", response_model=list[DisruptionOut])
async def list_disruptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all disruption events (all authenticated users can view)."""
    result = await db.execute(
        select(DisruptionEvent).order_by(DisruptionEvent.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{disruption_id}", response_model=DisruptionDetailOut)
async def get_disruption(
    disruption_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a disruption event. Alerts are returned as empty list after initial creation."""
    result = await db.execute(
        select(DisruptionEvent).where(DisruptionEvent.id == disruption_id)
    )
    disruption = result.scalar_one_or_none()
    if not disruption:
        raise HTTPException(status_code=404, detail="Disruption not found")

    return DisruptionDetailOut(
        **DisruptionOut.model_validate(disruption).model_dump(),
        alerts=[],  # Alerts are ephemeral (generated at creation time)
    )
