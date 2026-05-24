"""Pydantic request/response schemas for DrukPass API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─── Auth ────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    role: str = Field(..., pattern="^(operator|government|guide|admin)$")
    organization_name: Optional[str] = None
    license_number: Optional[str] = None
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    organization_name: Optional[str]
    license_number: Optional[str]
    phone: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Traveler ────────────────────────────────────────────────────────────────

class TravelerIn(BaseModel):
    full_name: str
    nationality: str = Field(..., min_length=2, max_length=3)
    passport_number: str
    date_of_birth: Optional[datetime] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class TravelerOut(BaseModel):
    id: uuid.UUID
    full_name: str
    nationality: str
    passport_number: str
    date_of_birth: Optional[datetime]
    email: Optional[str]
    phone: Optional[str]

    class Config:
        from_attributes = True


# ─── Bookings ────────────────────────────────────────────────────────────────

class BookingCreateRequest(BaseModel):
    # Traveler info (creates or matches existing traveler)
    traveler_full_name: str
    traveler_nationality: str = Field(..., min_length=2, max_length=3)
    traveler_passport_number: str
    traveler_date_of_birth: Optional[datetime] = None
    traveler_email: Optional[str] = None
    traveler_phone: Optional[str] = None
    traveler_age: Optional[int] = None
    is_bhutanese_origin: bool = False

    # Travel details
    entry_date: datetime
    exit_date: datetime
    travel_purpose: str = Field(..., pattern="^(leisure|trekking|cultural|business|volunteer)$")
    districts: list[str] = Field(default_factory=list)
    entry_point: str = "Paro International Airport"
    companions_count: int = Field(default=0, ge=0)
    special_requirements: Optional[str] = None

    @field_validator("exit_date")
    @classmethod
    def exit_after_entry(cls, v: datetime, info) -> datetime:
        if "entry_date" in info.data and v <= info.data["entry_date"]:
            raise ValueError("exit_date must be after entry_date")
        return v


class SDFOut(BaseModel):
    id: uuid.UUID
    nationality_regime: str
    daily_rate_usd: float
    duration_days: int
    base_amount_usd: float
    waiver_applied: bool
    waiver_type: Optional[str]
    waiver_percent: float
    waiver_amount_usd: float
    total_amount_usd: float
    season: str
    calculation_breakdown: dict
    payment_status: str

    class Config:
        from_attributes = True


class PermitOut(BaseModel):
    id: uuid.UUID
    permit_number: str
    permit_type: str
    status: str
    district: Optional[str]
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    issued_at: Optional[datetime]
    rejection_reason: Optional[str]
    permit_metadata: Optional[dict]

    class Config:
        from_attributes = True


class GuideAssignmentOut(BaseModel):
    id: uuid.UUID
    guide_id: uuid.UUID
    status: str
    notification_sent_at: Optional[datetime]
    guide_confirmed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AuditEventOut(BaseModel):
    id: uuid.UUID
    actor: str
    event_type: str
    event_data: dict
    created_at: datetime

    class Config:
        from_attributes = True


class BookingOut(BaseModel):
    id: uuid.UUID
    reference_code: str
    status: str
    entry_date: datetime
    exit_date: datetime
    travel_purpose: str
    districts: list
    entry_point: str
    companions_count: int
    special_requirements: Optional[str]
    agent_chain_status: Optional[dict]
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    processing_duration_ms: Optional[int]
    traveler: Optional[TravelerOut] = None
    permits: list[PermitOut] = []
    sdf_calculation: Optional[SDFOut] = None
    guide_assignment: Optional[GuideAssignmentOut] = None
    events: list[AuditEventOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class BookingListOut(BaseModel):
    id: uuid.UUID
    reference_code: str
    status: str
    entry_date: datetime
    exit_date: datetime
    travel_purpose: str
    districts: list
    entry_point: str
    traveler: Optional[TravelerOut] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Permits ─────────────────────────────────────────────────────────────────

class PermitApproveRequest(BaseModel):
    notes: Optional[str] = None


class PermitRejectRequest(BaseModel):
    reason: str = Field(..., min_length=5)


class PermitQRResponse(BaseModel):
    permit_id: uuid.UUID
    permit_number: str
    qr_code_base64: Optional[str]
    qr_payload: Optional[dict]


class PermitDetailOut(BaseModel):
    id: uuid.UUID
    permit_number: str
    permit_type: str
    status: str
    district: Optional[str]
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    issued_at: Optional[datetime]
    approved_by_id: Optional[uuid.UUID]
    rejection_reason: Optional[str]
    qr_code_data: Optional[str]
    permit_metadata: Optional[dict]
    booking: Optional[BookingListOut] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Disruptions ─────────────────────────────────────────────────────────────

class DisruptionCreateRequest(BaseModel):
    disruption_type: str = Field(..., pattern="^(flight_delay|flight_cancellation|weather|road_closure|other)$")
    description: str = Field(..., min_length=10)
    affected_date: datetime
    affected_entry_point: Optional[str] = None
    flight_number: Optional[str] = None
    severity: str = Field(default="moderate", pattern="^(low|moderate|high|critical)$")


class DisruptionOut(BaseModel):
    id: uuid.UUID
    disruption_type: str
    description: str
    affected_date: datetime
    affected_entry_point: Optional[str]
    flight_number: Optional[str]
    severity: str
    affected_bookings_count: int
    resolution_status: str
    alerts_sent: bool
    resolution_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class DisruptionDetailOut(DisruptionOut):
    alerts: list[dict] = []


# ─── Government ──────────────────────────────────────────────────────────────

class GovernmentDashboardOut(BaseModel):
    total_bookings_today: int
    pending_permits: int
    sdf_revenue_today_usd: float
    active_travelers_by_district: dict[str, int]
    bookings_by_status: dict[str, int]
    recent_permits: list[PermitDetailOut] = []


class GovernmentReportOut(BaseModel):
    period: str
    total_bookings: int
    total_sdf_revenue_usd: float
    permits_issued: int
    permits_rejected: int
    top_nationalities: list[dict]
    top_districts: list[dict]
    disruptions_this_month: int


# ─── Guide ───────────────────────────────────────────────────────────────────

class GuideAssignmentDetailOut(BaseModel):
    id: uuid.UUID
    status: str
    notification_sent_at: Optional[datetime]
    guide_confirmed_at: Optional[datetime]
    booking: Optional[BookingListOut] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GuideConfirmRequest(BaseModel):
    notes: Optional[str] = None
