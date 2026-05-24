"""
DrukPass Demo Seed Script
Populates the database with realistic demo data for Bhutan tourism.

Run from backend/ directory:
    python -m scripts.seed_demo
or:
    python scripts/seed_demo.py
"""
import asyncio
import sys
import os
import uuid
import random
import string
from datetime import datetime, timedelta, timezone

# Ensure backend/ is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession

from models.base import engine, Base, AsyncSessionLocal
import models.models  # noqa — register all models
from models.models import (
    User, UserRole, Traveler, Booking, BookingStatus,
    Permit, PermitStatus, SDFCalculation, GuideAssignment, AuditEvent, DisruptionEvent
)
from core.security import hash_password

# ─── Bhutan districts ────────────────────────────────────────────────────────

BHUTAN_DISTRICTS = [
    "Thimphu", "Paro", "Punakha", "Bumthang", "Haa",
    "Wangdue Phodrang", "Trongsa", "Chhukha", "Samdrup Jongkhar",
    "Gasa", "Lhuntse", "Mongar", "Pemagatshel", "Sarpang",
    "Trashigang", "Trashiyangtse", "Tsirang", "Zhemgang",
]

RESTRICTED_DISTRICTS = ["Haa", "Gasa", "Lhuntse", "Trashiyangtse"]

ENTRY_POINTS = [
    "Paro International Airport",
    "Phuntsholing Land Border",
    "Gelephu Land Border",
    "Samdrup Jongkhar Land Border",
]


def _ref_code() -> str:
    year = datetime.now().year
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"BT-{year}-{suffix}"


def _permit_num(permit_type: str) -> str:
    year = datetime.now().year
    short = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    code = {
        "tourist_visa": "TV",
        "regional_tourist": "RT",
        "restricted_area_permit": "RA",
        "trekking_permit": "TR",
    }.get(permit_type, "GP")
    return f"BTG-{year}-{code}-{short}"


# ─── Seed data ────────────────────────────────────────────────────────────────

OPERATORS = [
    {
        "email": "karma@himavatours.bt",
        "full_name": "Karma Wangchuk",
        "organization_name": "Himava Tours & Travel",
        "license_number": "TCB-OP-2023-001",
        "phone": "+975-17-345678",
    },
    {
        "email": "tenzing@dragonfly.bt",
        "full_name": "Tenzing Dorji",
        "organization_name": "Dragonfly Bhutan Expeditions",
        "license_number": "TCB-OP-2023-042",
        "phone": "+975-17-456789",
    },
    {
        "email": "dorji@bhutantravel.bt",
        "full_name": "Dorji Tshering",
        "organization_name": "Bhutan Travel Bureau",
        "license_number": "TCB-OP-2022-017",
        "phone": "+975-17-567890",
    },
]

GOVERNMENT_OFFICERS = [
    {
        "email": "pema@btc.gov.bt",
        "full_name": "Pema Lhamo",
        "organization_name": "Tourism Council of Bhutan",
        "license_number": None,
        "phone": "+975-2-323251",
    },
]

GUIDES = [
    {
        "email": "sonam@guide.bt",
        "full_name": "Sonam Phuntsho",
        "organization_name": None,
        "license_number": "TCB-GD-2024-008",
        "phone": "+975-17-678901",
    },
    {
        "email": "ugyen@guide.bt",
        "full_name": "Ugyen Wangdi",
        "organization_name": None,
        "license_number": "TCB-GD-2024-019",
        "phone": "+975-17-789012",
    },
    {
        "email": "tashi@guide.bt",
        "full_name": "Tashi Namgay",
        "organization_name": None,
        "license_number": "TCB-GD-2023-035",
        "phone": "+975-17-890123",
    },
]

# 8 bookings: mix of nationalities, purposes, districts
BOOKING_SPECS = [
    {
        "traveler_name": "James Fitzgerald",
        "nationality": "US",
        "passport": "US123456789",
        "dob_offset_years": 38,
        "travel_purpose": "leisure",
        "districts": ["Thimphu", "Paro", "Punakha"],
        "entry_point": "Paro International Airport",
        "duration_days": 7,
        "operator_idx": 0,
        "permit_status": PermitStatus.APPROVED,
        "booking_status": BookingStatus.CONFIRMED,
        "guide_idx": 0,
        "nationality_regime": "international",
        "daily_rate": 250,
    },
    {
        "traveler_name": "Priya Sharma",
        "nationality": "IN",
        "passport": "IN987654321",
        "dob_offset_years": 29,
        "travel_purpose": "cultural",
        "districts": ["Thimphu", "Bumthang"],
        "entry_point": "Phuntsholing Land Border",
        "duration_days": 5,
        "operator_idx": 0,
        "permit_status": PermitStatus.APPROVED,
        "booking_status": BookingStatus.CONFIRMED,
        "guide_idx": None,
        "nationality_regime": "regional",
        "daily_rate": 15,
    },
    {
        "traveler_name": "Kenji Nakamura",
        "nationality": "JP",
        "passport": "JP456789012",
        "dob_offset_years": 45,
        "travel_purpose": "trekking",
        "districts": ["Paro", "Haa", "Gasa"],  # Restricted!
        "entry_point": "Paro International Airport",
        "duration_days": 10,
        "operator_idx": 1,
        "permit_status": PermitStatus.GOVERNMENT_REVIEW,
        "booking_status": BookingStatus.PROCESSING,
        "guide_idx": 1,
        "nationality_regime": "international",
        "daily_rate": 250,
    },
    {
        "traveler_name": "Sophie Müller",
        "nationality": "DE",
        "passport": "DE789012345",
        "dob_offset_years": 33,
        "travel_purpose": "leisure",
        "districts": ["Thimphu", "Paro", "Wangdue Phodrang"],
        "entry_point": "Paro International Airport",
        "duration_days": 6,
        "operator_idx": 1,
        "permit_status": PermitStatus.APPROVED,
        "booking_status": BookingStatus.CONFIRMED,
        "guide_idx": 2,
        "nationality_regime": "international",
        "daily_rate": 200,  # Low season
    },
    {
        "traveler_name": "Rahul Agarwal",
        "nationality": "IN",
        "passport": "IN234567890",
        "dob_offset_years": 52,
        "travel_purpose": "business",
        "districts": ["Thimphu"],
        "entry_point": "Paro International Airport",
        "duration_days": 3,
        "operator_idx": 2,
        "permit_status": PermitStatus.APPROVED,
        "booking_status": BookingStatus.CONFIRMED,
        "guide_idx": None,
        "nationality_regime": "regional",
        "daily_rate": 15,
    },
    {
        "traveler_name": "Emma Thompson",
        "nationality": "GB",
        "passport": "GB345678901",
        "dob_offset_years": 41,
        "travel_purpose": "trekking",
        "districts": ["Bumthang", "Trongsa", "Lhuntse"],  # Restricted!
        "entry_point": "Paro International Airport",
        "duration_days": 12,
        "operator_idx": 2,
        "permit_status": PermitStatus.GOVERNMENT_REVIEW,
        "booking_status": BookingStatus.PROCESSING,
        "guide_idx": 0,
        "nationality_regime": "international",
        "daily_rate": 250,
    },
    {
        "traveler_name": "Zhang Wei",
        "nationality": "CN",
        "passport": "CN456789012",
        "dob_offset_years": 27,
        "travel_purpose": "cultural",
        "districts": ["Thimphu", "Punakha"],
        "entry_point": "Paro International Airport",
        "duration_days": 5,
        "operator_idx": 0,
        "permit_status": PermitStatus.REJECTED,
        "booking_status": BookingStatus.CANCELLED,
        "guide_idx": None,
        "rejection_reason": "Incomplete documentation — visa supporting documents not submitted within deadline.",
        "nationality_regime": "international",
        "daily_rate": 200,
    },
    {
        "traveler_name": "Aisha Al-Rashidi",
        "nationality": "AE",
        "passport": "AE567890123",
        "dob_offset_years": 36,
        "travel_purpose": "leisure",
        "districts": ["Paro", "Thimphu", "Punakha", "Bumthang"],
        "entry_point": "Paro International Airport",
        "duration_days": 9,
        "operator_idx": 1,
        "permit_status": PermitStatus.GOVERNMENT_REVIEW,
        "booking_status": BookingStatus.CONFIRMED,
        "guide_idx": 1,
        "nationality_regime": "international",
        "daily_rate": 250,
    },
]

DISRUPTION_SPECS = [
    {
        "disruption_type": "flight_delay",
        "description": "Druk Air flight KB123 from Delhi delayed by 4 hours due to adverse weather over Paro. Travelers on this flight affected.",
        "affected_entry_point": "Paro International Airport",
        "flight_number": "KB123",
        "severity": "moderate",
        "days_offset": -2,
    },
    {
        "disruption_type": "weather",
        "description": "Heavy snowfall advisory for Haa and Gasa districts. Trekking in high-altitude areas temporarily suspended by Tourism Council.",
        "affected_entry_point": None,
        "flight_number": None,
        "severity": "high",
        "days_offset": 0,
    },
]


# ─── Seeder ───────────────────────────────────────────────────────────────────

async def seed(db: AsyncSession) -> None:
    now = datetime.now(timezone.utc)

    print("Creating users...")
    user_objects: dict[str, User] = {}

    for op_data in OPERATORS:
        user = User(
            email=op_data["email"],
            hashed_password=hash_password("Demo1234!"),
            full_name=op_data["full_name"],
            role=UserRole.OPERATOR,
            organization_name=op_data["organization_name"],
            license_number=op_data["license_number"],
            phone=op_data["phone"],
            is_active=True,
        )
        db.add(user)
        user_objects[op_data["email"]] = user

    for gov_data in GOVERNMENT_OFFICERS:
        user = User(
            email=gov_data["email"],
            hashed_password=hash_password("Demo1234!"),
            full_name=gov_data["full_name"],
            role=UserRole.GOVERNMENT,
            organization_name=gov_data["organization_name"],
            phone=gov_data["phone"],
            is_active=True,
        )
        db.add(user)
        user_objects[gov_data["email"]] = user

    guide_list: list[User] = []
    for g_data in GUIDES:
        user = User(
            email=g_data["email"],
            hashed_password=hash_password("Demo1234!"),
            full_name=g_data["full_name"],
            role=UserRole.GUIDE,
            license_number=g_data["license_number"],
            phone=g_data["phone"],
            is_active=True,
        )
        db.add(user)
        user_objects[g_data["email"]] = user
        guide_list.append(user)

    await db.flush()
    print(f"  Created {len(user_objects)} users.")

    print("Creating bookings with permits and SDF...")
    operator_list = [user_objects[op["email"]] for op in OPERATORS]

    for i, spec in enumerate(BOOKING_SPECS):
        operator = operator_list[spec["operator_idx"]]
        guide = guide_list[spec["guide_idx"]] if spec.get("guide_idx") is not None else None

        # Traveler
        traveler = Traveler(
            full_name=spec["traveler_name"],
            nationality=spec["nationality"],
            passport_number=spec["passport"],
            date_of_birth=now - timedelta(days=spec["dob_offset_years"] * 365),
            email=f"{spec['traveler_name'].lower().replace(' ', '.')}@example.com",
        )
        db.add(traveler)
        await db.flush()

        entry_date = now + timedelta(days=7 + i * 5)
        exit_date = entry_date + timedelta(days=spec["duration_days"])
        ref_code = _ref_code()

        booking = Booking(
            reference_code=ref_code,
            traveler_id=traveler.id,
            operator_id=operator.id,
            status=spec["booking_status"],
            entry_date=entry_date,
            exit_date=exit_date,
            travel_purpose=spec["travel_purpose"],
            districts=spec["districts"],
            entry_point=spec["entry_point"],
            companions_count=random.randint(0, 3),
            processing_started_at=now - timedelta(minutes=random.randint(1, 120)),
            processing_completed_at=now - timedelta(minutes=random.randint(0, 60)),
            processing_duration_ms=random.randint(800, 3200),
            agent_chain_status={
                "status": "completed" if spec["booking_status"] != BookingStatus.CANCELLED else "rejected",
                "eligibility": {
                    "eligible": spec["booking_status"] != BookingStatus.CANCELLED,
                    "nationality_regime": spec["nationality_regime"],
                    "guide_required": spec["nationality_regime"] == "international",
                },
            },
        )
        db.add(booking)
        await db.flush()

        # SDF
        base = spec["daily_rate"] * spec["duration_days"]
        sdf = SDFCalculation(
            booking_id=booking.id,
            nationality_regime=spec["nationality_regime"],
            daily_rate_usd=float(spec["daily_rate"]),
            duration_days=spec["duration_days"],
            base_amount_usd=float(base),
            waiver_applied=False,
            waiver_type=None,
            waiver_percent=0.0,
            waiver_amount_usd=0.0,
            total_amount_usd=float(base),
            season="peak" if spec["daily_rate"] == 250 else "low",
            calculation_breakdown={
                "regime": spec["nationality_regime"],
                "daily_rate_usd": spec["daily_rate"],
                "duration_days": spec["duration_days"],
                "base_amount_usd": base,
                "total_amount_usd": base,
            },
            payment_status="paid" if spec["booking_status"] == BookingStatus.CONFIRMED else "pending",
        )
        db.add(sdf)

        # Primary permit
        ptype = "regional_tourist" if spec["nationality_regime"] == "regional" else "tourist_visa"
        permit = Permit(
            booking_id=booking.id,
            permit_number=_permit_num(ptype),
            permit_type=ptype,
            status=spec["permit_status"],
            valid_from=entry_date,
            valid_until=exit_date,
            issued_at=now if spec["permit_status"] == PermitStatus.APPROVED else None,
            rejection_reason=spec.get("rejection_reason"),
            qr_code_data="QR_PLACEHOLDER_BASE64",
            permit_metadata={
                "traveler_name": traveler.full_name,
                "nationality": traveler.nationality,
                "booking_reference": ref_code,
                "sdf_amount_usd": float(base),
                "generated_by": "seed_demo",
            },
        )
        db.add(permit)

        # Restricted area permits
        restricted_in_spec = [d for d in spec["districts"] if d in RESTRICTED_DISTRICTS]
        if restricted_in_spec:
            rap = Permit(
                booking_id=booking.id,
                permit_number=_permit_num("restricted_area_permit"),
                permit_type="restricted_area_permit",
                status=spec["permit_status"],
                district=", ".join(restricted_in_spec),
                valid_from=entry_date,
                valid_until=exit_date,
                issued_at=now if spec["permit_status"] == PermitStatus.APPROVED else None,
                rejection_reason=spec.get("rejection_reason"),
                qr_code_data="QR_PLACEHOLDER_BASE64",
                permit_metadata={
                    "traveler_name": traveler.full_name,
                    "districts": restricted_in_spec,
                    "booking_reference": ref_code,
                },
            )
            db.add(rap)

        # Trekking permit
        if spec["travel_purpose"] == "trekking":
            tp = Permit(
                booking_id=booking.id,
                permit_number=_permit_num("trekking_permit"),
                permit_type="trekking_permit",
                status=spec["permit_status"],
                valid_from=entry_date,
                valid_until=exit_date,
                issued_at=now if spec["permit_status"] == PermitStatus.APPROVED else None,
                qr_code_data="QR_PLACEHOLDER_BASE64",
                permit_metadata={
                    "traveler_name": traveler.full_name,
                    "booking_reference": ref_code,
                },
            )
            db.add(tp)

        # Guide assignment
        if guide:
            assignment = GuideAssignment(
                booking_id=booking.id,
                guide_id=guide.id,
                status="confirmed" if spec["booking_status"] == BookingStatus.CONFIRMED else "assigned",
                notification_sent_at=now - timedelta(hours=2),
                guide_confirmed_at=now - timedelta(hours=1) if spec["booking_status"] == BookingStatus.CONFIRMED else None,
            )
            db.add(assignment)

        # Audit events
        for actor, event_type, event_data in [
            ("agent:orchestrator", "workflow_started", {"booking_ref": ref_code}),
            ("agent:eligibility", "eligibility_check_completed", {
                "nationality": spec["nationality"],
                "regime": spec["nationality_regime"],
                "permit_type": ptype,
            }),
            ("agent:sdf_calculator", "sdf_calculated", {
                "regime": spec["nationality_regime"],
                "daily_rate": spec["daily_rate"],
                "duration_days": spec["duration_days"],
                "total_usd": float(base),
            }),
            ("agent:permit_generator", "permits_generated", {
                "permits_created": 1 + (1 if restricted_in_spec else 0) + (1 if spec["travel_purpose"] == "trekking" else 0),
            }),
            ("agent:orchestrator", "workflow_completed", {"status": "completed"}),
        ]:
            ev = AuditEvent(
                booking_id=booking.id,
                actor=actor,
                event_type=event_type,
                event_data=event_data,
            )
            db.add(ev)

    await db.flush()
    print(f"  Created {len(BOOKING_SPECS)} bookings with permits, SDF records, and audit trails.")

    print("Creating disruption events...")
    for dspec in DISRUPTION_SPECS:
        affected_date = now + timedelta(days=dspec["days_offset"])
        dis = DisruptionEvent(
            disruption_type=dspec["disruption_type"],
            description=dspec["description"],
            affected_date=affected_date,
            affected_entry_point=dspec["affected_entry_point"],
            flight_number=dspec["flight_number"],
            severity=dspec["severity"],
            affected_bookings_count=random.randint(2, 8),
            resolution_status="active",
            alerts_sent=True,
        )
        db.add(dis)

    await db.commit()
    print(f"  Created {len(DISRUPTION_SPECS)} disruption events.")
    print()
    print("Seed complete. Demo credentials (all passwords: Demo1234!):")
    print("  Operators : karma@himavatours.bt | tenzing@dragonfly.bt | dorji@bhutantravel.bt")
    print("  Government: pema@btc.gov.bt")
    print("  Guides    : sonam@guide.bt | ugyen@guide.bt | tashi@guide.bt")


async def main() -> None:
    print("DrukPass demo seed starting...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        await seed(db)
    await engine.dispose()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
