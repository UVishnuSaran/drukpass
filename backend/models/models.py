"""Core data models for DrukPass."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean, Text, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import enum

from models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    OPERATOR = "operator"
    GOVERNMENT = "government"
    GUIDE = "guide"
    ADMIN = "admin"


class PermitStatus(str, enum.Enum):
    PENDING = "pending"
    ELIGIBILITY_CHECK = "eligibility_check"
    SDF_CALCULATED = "sdf_calculated"
    PERMIT_QUEUED = "permit_queued"
    GOVERNMENT_REVIEW = "government_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class BookingStatus(str, enum.Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    DISRUPTED = "disrupted"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    organization_name: Mapped[Optional[str]] = mapped_column(String(255))
    license_number: Mapped[Optional[str]] = mapped_column(String(100))

    # Relationships
    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="operator")
    guide_assignments: Mapped[list["GuideAssignment"]] = relationship("GuideAssignment", back_populates="guide")


class Traveler(Base, TimestampMixin):
    __tablename__ = "travelers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    nationality: Mapped[str] = mapped_column(String(3), nullable=False)  # ISO 3166-1 alpha-2
    passport_number: Mapped[str] = mapped_column(String(50), nullable=False)
    date_of_birth: Mapped[Optional[datetime]] = mapped_column()
    email: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(50))

    bookings: Mapped[list["Booking"]] = relationship("Booking", back_populates="traveler")


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    traveler_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("travelers.id"), nullable=False)
    operator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(SAEnum(BookingStatus), default=BookingStatus.DRAFT)

    # Travel details
    entry_date: Mapped[datetime] = mapped_column(nullable=False)
    exit_date: Mapped[datetime] = mapped_column(nullable=False)
    travel_purpose: Mapped[str] = mapped_column(String(50), nullable=False)
    districts: Mapped[list] = mapped_column(JSON, default=list)  # List of districts to visit
    entry_point: Mapped[str] = mapped_column(String(100), nullable=False)
    companions_count: Mapped[int] = mapped_column(Integer, default=0)
    special_requirements: Mapped[Optional[str]] = mapped_column(Text)

    # Agent chain results
    agent_chain_status: Mapped[Optional[dict]] = mapped_column(JSON)
    processing_started_at: Mapped[Optional[datetime]] = mapped_column()
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column()
    processing_duration_ms: Mapped[Optional[int]] = mapped_column(Integer)

    # Relationships
    traveler: Mapped["Traveler"] = relationship("Traveler", back_populates="bookings")
    operator: Mapped["User"] = relationship("User", back_populates="bookings")
    permits: Mapped[list["Permit"]] = relationship("Permit", back_populates="booking")
    sdf_calculation: Mapped[Optional["SDFCalculation"]] = relationship("SDFCalculation", back_populates="booking", uselist=False)
    guide_assignment: Mapped[Optional["GuideAssignment"]] = relationship("GuideAssignment", back_populates="booking", uselist=False)
    events: Mapped[list["AuditEvent"]] = relationship("AuditEvent", back_populates="booking")


class Permit(Base, TimestampMixin):
    __tablename__ = "permits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    permit_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id"), nullable=False)
    permit_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[PermitStatus] = mapped_column(SAEnum(PermitStatus), default=PermitStatus.PENDING)
    district: Mapped[Optional[str]] = mapped_column(String(100))
    valid_from: Mapped[Optional[datetime]] = mapped_column()
    valid_until: Mapped[Optional[datetime]] = mapped_column()
    issued_at: Mapped[Optional[datetime]] = mapped_column()
    approved_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"))
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    qr_code_data: Mapped[Optional[str]] = mapped_column(Text)  # Base64 QR
    document_url: Mapped[Optional[str]] = mapped_column(String(500))
    metadata: Mapped[Optional[dict]] = mapped_column(JSON)

    booking: Mapped["Booking"] = relationship("Booking", back_populates="permits")
    approved_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by_id])


class SDFCalculation(Base, TimestampMixin):
    __tablename__ = "sdf_calculations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id"), unique=True, nullable=False)
    nationality_regime: Mapped[str] = mapped_column(String(50), nullable=False)
    daily_rate_usd: Mapped[float] = mapped_column(Float, nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    base_amount_usd: Mapped[float] = mapped_column(Float, nullable=False)
    waiver_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    waiver_type: Mapped[Optional[str]] = mapped_column(String(50))
    waiver_percent: Mapped[float] = mapped_column(Float, default=0.0)
    waiver_amount_usd: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount_usd: Mapped[float] = mapped_column(Float, nullable=False)
    season: Mapped[str] = mapped_column(String(20))  # peak | low
    calculation_breakdown: Mapped[dict] = mapped_column(JSON)
    payment_status: Mapped[str] = mapped_column(String(20), default="pending")

    booking: Mapped["Booking"] = relationship("Booking", back_populates="sdf_calculation")


class GuideAssignment(Base, TimestampMixin):
    __tablename__ = "guide_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id"), unique=True, nullable=False)
    guide_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="assigned")  # assigned|confirmed|declined
    notification_sent_at: Mapped[Optional[datetime]] = mapped_column()
    guide_confirmed_at: Mapped[Optional[datetime]] = mapped_column()

    booking: Mapped["Booking"] = relationship("Booking", back_populates="guide_assignment")
    guide: Mapped["User"] = relationship("User", back_populates="guide_assignments")


class AuditEvent(Base, TimestampMixin):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("bookings.id"))
    actor: Mapped[str] = mapped_column(String(100), nullable=False)  # "agent:eligibility" | "user:pema@btc.gov"
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    event_data: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))

    booking: Mapped[Optional["Booking"]] = relationship("Booking", back_populates="events")


class DisruptionEvent(Base, TimestampMixin):
    __tablename__ = "disruption_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    disruption_type: Mapped[str] = mapped_column(String(50), nullable=False)  # flight_delay|weather|road_closure
    description: Mapped[str] = mapped_column(Text, nullable=False)
    affected_date: Mapped[datetime] = mapped_column(nullable=False)
    affected_entry_point: Mapped[Optional[str]] = mapped_column(String(100))
    flight_number: Mapped[Optional[str]] = mapped_column(String(20))
    severity: Mapped[str] = mapped_column(String(20), default="moderate")  # low|moderate|high|critical
    affected_bookings_count: Mapped[int] = mapped_column(Integer, default=0)
    resolution_status: Mapped[str] = mapped_column(String(20), default="active")
    alerts_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text)
