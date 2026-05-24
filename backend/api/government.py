"""Government router — dashboard stats and reports."""
from datetime import datetime, timezone, timedelta
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from core.auth import require_role
from models.base import get_db
from models.models import Booking, Permit, PermitStatus, SDFCalculation, DisruptionEvent, User
from schemas import GovernmentDashboardOut, GovernmentReportOut, PermitDetailOut

router = APIRouter(prefix="/government", tags=["government"])


# ─── Mock data fallback ───────────────────────────────────────────────────────

MOCK_DASHBOARD = GovernmentDashboardOut(
    total_bookings_today=12,
    pending_permits=7,
    sdf_revenue_today_usd=4200.0,
    active_travelers_by_district={
        "Thimphu": 18,
        "Paro": 14,
        "Punakha": 9,
        "Bumthang": 6,
        "Haa": 3,
        "Wangdue Phodrang": 4,
    },
    bookings_by_status={
        "confirmed": 8,
        "processing": 2,
        "cancelled": 1,
        "draft": 1,
    },
    recent_permits=[],
)

MOCK_REPORT = GovernmentReportOut(
    period="2026-05",
    total_bookings=143,
    total_sdf_revenue_usd=48750.0,
    permits_issued=127,
    permits_rejected=8,
    top_nationalities=[
        {"nationality": "IN", "count": 42},
        {"nationality": "US", "count": 31},
        {"nationality": "GB", "count": 18},
        {"nationality": "JP", "count": 14},
        {"nationality": "DE", "count": 11},
    ],
    top_districts=[
        {"district": "Thimphu", "visits": 98},
        {"district": "Paro", "visits": 87},
        {"district": "Punakha", "visits": 65},
        {"district": "Bumthang", "visits": 44},
        {"district": "Haa", "visits": 23},
    ],
    disruptions_this_month=2,
)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=GovernmentDashboardOut)
async def get_dashboard(
    current_user: User = Depends(require_role("government", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Aggregated government dashboard statistics.
    Falls back to realistic mock data if the DB has no records yet.
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Total bookings today
    bookings_today_result = await db.execute(
        select(func.count(Booking.id)).where(
            and_(Booking.created_at >= today_start, Booking.created_at < today_end)
        )
    )
    total_bookings_today: int = bookings_today_result.scalar_one() or 0

    # Pending permits
    pending_result = await db.execute(
        select(func.count(Permit.id)).where(
            Permit.status == PermitStatus.GOVERNMENT_REVIEW
        )
    )
    pending_permits: int = pending_result.scalar_one() or 0

    # SDF revenue today
    sdf_today_result = await db.execute(
        select(func.coalesce(func.sum(SDFCalculation.total_amount_usd), 0.0)).join(
            Booking, SDFCalculation.booking_id == Booking.id
        ).where(
            and_(Booking.created_at >= today_start, Booking.created_at < today_end)
        )
    )
    sdf_revenue_today: float = float(sdf_today_result.scalar_one() or 0.0)

    # Active travelers by district (from confirmed bookings active today)
    bookings_result = await db.execute(
        select(Booking).where(
            and_(
                Booking.entry_date <= today_end,
                Booking.exit_date >= today_start,
            )
        )
    )
    active_bookings = bookings_result.scalars().all()

    district_counts: Counter = Counter()
    for b in active_bookings:
        for district in (b.districts or []):
            district_counts[district] += 1

    # Bookings by status
    status_result = await db.execute(
        select(Booking.status, func.count(Booking.id)).group_by(Booking.status)
    )
    bookings_by_status = {str(row[0].value): row[1] for row in status_result.all()}

    # Recent permits (latest 10 awaiting review)
    recent_permits_result = await db.execute(
        select(Permit)
        .options(selectinload(Permit.booking).selectinload(Booking.traveler))
        .where(Permit.status == PermitStatus.GOVERNMENT_REVIEW)
        .order_by(Permit.created_at.desc())
        .limit(10)
    )
    recent_permits = recent_permits_result.scalars().all()

    # If no real data — return mock so the frontend always has something useful
    if total_bookings_today == 0 and pending_permits == 0:
        return MOCK_DASHBOARD

    return GovernmentDashboardOut(
        total_bookings_today=total_bookings_today,
        pending_permits=pending_permits,
        sdf_revenue_today_usd=round(sdf_revenue_today, 2),
        active_travelers_by_district=dict(district_counts),
        bookings_by_status=bookings_by_status,
        recent_permits=[PermitDetailOut.model_validate(p) for p in recent_permits],
    )


@router.get("/reports", response_model=GovernmentReportOut)
async def get_reports(
    current_user: User = Depends(require_role("government", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Summary report data for the current month.
    Falls back to realistic mock data if the DB has insufficient records.
    """
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_bookings_result = await db.execute(
        select(func.count(Booking.id)).where(Booking.created_at >= month_start)
    )
    total_bookings: int = total_bookings_result.scalar_one() or 0

    if total_bookings < 3:
        # Not enough real data — return mock
        return MOCK_REPORT

    # SDF revenue this month
    sdf_result = await db.execute(
        select(func.coalesce(func.sum(SDFCalculation.total_amount_usd), 0.0)).join(
            Booking, SDFCalculation.booking_id == Booking.id
        ).where(Booking.created_at >= month_start)
    )
    total_sdf = float(sdf_result.scalar_one() or 0.0)

    # Permits issued / rejected
    issued_result = await db.execute(
        select(func.count(Permit.id)).where(
            and_(Permit.status == PermitStatus.APPROVED, Permit.issued_at >= month_start)
        )
    )
    rejected_result = await db.execute(
        select(func.count(Permit.id)).where(
            and_(Permit.status == PermitStatus.REJECTED, Permit.created_at >= month_start)
        )
    )

    # Disruptions this month
    disruption_result = await db.execute(
        select(func.count(DisruptionEvent.id)).where(
            DisruptionEvent.created_at >= month_start
        )
    )

    # Top nationalities (via Traveler join)
    from models.models import Traveler
    nat_result = await db.execute(
        select(Traveler.nationality, func.count(Booking.id))
        .join(Booking, Booking.traveler_id == Traveler.id)
        .where(Booking.created_at >= month_start)
        .group_by(Traveler.nationality)
        .order_by(func.count(Booking.id).desc())
        .limit(5)
    )
    top_nationalities = [{"nationality": r[0], "count": r[1]} for r in nat_result.all()]

    # Top districts (unpack JSON arrays — approximate via Python)
    district_bookings_result = await db.execute(
        select(Booking.districts).where(Booking.created_at >= month_start)
    )
    district_counter: Counter = Counter()
    for row in district_bookings_result.scalars():
        for d in (row or []):
            district_counter[d] += 1
    top_districts = [
        {"district": d, "visits": c}
        for d, c in district_counter.most_common(5)
    ]

    return GovernmentReportOut(
        period=now.strftime("%Y-%m"),
        total_bookings=total_bookings,
        total_sdf_revenue_usd=round(total_sdf, 2),
        permits_issued=issued_result.scalar_one() or 0,
        permits_rejected=rejected_result.scalar_one() or 0,
        top_nationalities=top_nationalities,
        top_districts=top_districts,
        disruptions_this_month=disruption_result.scalar_one() or 0,
    )
