"""
Eligibility Agent — determines permit type, required documents,
and nationality regime for a given traveler booking.

This is a deterministic rules engine (not LLM) for speed and auditability.
The LLM layer handles edge cases and natural language explanations only.
"""
import json
from pathlib import Path
from typing import TypedDict
from datetime import datetime, timezone

# Load rules once at startup
_rules_path = Path(__file__).parent.parent / "data" / "permit_rules.json"
with open(_rules_path) as f:
    PERMIT_RULES = json.load(f)


class EligibilityInput(TypedDict):
    nationality: str          # ISO 3166-1 alpha-2 (e.g. "JP", "IN", "US")
    travel_purpose: str       # "leisure" | "trekking" | "cultural" | "business" | "volunteer"
    districts: list[str]      # Districts to visit
    entry_date: str           # ISO date string
    duration_days: int
    traveler_age: int | None
    is_bhutanese_origin: bool


class EligibilityResult(TypedDict):
    eligible: bool
    nationality_regime: str       # "regional" | "international"
    primary_permit_type: str
    additional_permits: list[str]
    required_documents: list[str]
    restricted_districts: list[str]
    guide_required: bool
    eligibility_notes: list[str]
    agent: str
    processed_at: str


def check_eligibility(state: dict) -> dict:
    """
    LangGraph node: Eligibility check agent.

    Reads from state['booking'] and writes to state['eligibility_result'].
    Records an audit event.
    """
    booking = state["booking"]

    nationality = booking.get("nationality", "").upper()
    travel_purpose = booking.get("travel_purpose", "leisure")
    districts = booking.get("districts", [])
    entry_date_str = booking.get("entry_date", datetime.now().isoformat())
    duration_days = booking.get("duration_days", 1)
    traveler_age = booking.get("traveler_age")
    is_bhutanese_origin = booking.get("is_bhutanese_origin", False)

    result = _run_eligibility_rules(
        nationality=nationality,
        travel_purpose=travel_purpose,
        districts=districts,
        entry_date_str=entry_date_str,
        duration_days=duration_days,
        traveler_age=traveler_age,
        is_bhutanese_origin=is_bhutanese_origin,
    )

    # Append to audit trail
    events = state.get("events", [])
    events.append({
        "actor": "agent:eligibility",
        "event_type": "eligibility_check_completed",
        "event_data": {
            "nationality": nationality,
            "regime": result["nationality_regime"],
            "permit_type": result["primary_permit_type"],
            "additional_permits": result["additional_permits"],
            "restricted_districts": result["restricted_districts"],
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        **state,
        "eligibility_result": result,
        "events": events,
        "status": "eligibility_complete" if result["eligible"] else "eligibility_failed",
    }


def _run_eligibility_rules(
    nationality: str,
    travel_purpose: str,
    districts: list[str],
    entry_date_str: str,
    duration_days: int,
    traveler_age: int | None,
    is_bhutanese_origin: bool,
) -> EligibilityResult:
    """Pure function — rules engine, no side effects."""

    regimes = PERMIT_RULES["nationality_regimes"]
    regional_nationalities = regimes["regional"]["nationalities"]

    notes = []
    additional_permits = []
    required_documents = []

    # 1. Determine nationality regime
    if nationality in regional_nationalities:
        regime = "regional"
        primary_permit = "regional_tourist"
        required_documents = list(
            PERMIT_RULES["permit_types"]["regional_tourist"]["documents_required"]
        )
        notes.append(f"{nationality} nationals qualify for the Regional Tourist scheme (SDF: $15/day)")
    else:
        regime = "international"
        primary_permit = "tourist_visa"
        required_documents = list(
            PERMIT_RULES["permit_types"]["tourist_visa"]["documents_required"]
        )
        notes.append("International tourist scheme applies")

    # 2. Check travel purpose for additional permits
    purpose_config = PERMIT_RULES["travel_purposes"].get(travel_purpose, {})
    additional_permits.extend(purpose_config.get("permits_triggered", []))

    if travel_purpose == "trekking":
        notes.append("Trekking permit required — included in SDF for international tourists")
        required_documents.extend(["trekking_route_details", "guide_certification"])

    # 3. Check for restricted district access
    restricted_districts = []
    for district in districts:
        district_config = PERMIT_RULES["districts"].get(district, {})
        if district_config.get("restricted", False):
            restricted_districts.append(district)
            rap = district_config.get("restricted_permit_required")
            if rap and rap not in additional_permits:
                additional_permits.append(rap)
            notes.append(
                f"{district} is a restricted area — Restricted Area Permit required ($50 fee)"
            )

    # 4. Check guide requirement
    guide_required = False
    if regime == "international":
        guide_required = True
        notes.append("Licensed guide required for all international tourists")
    if restricted_districts:
        guide_required = True
        notes.append("Guide with district authorization required for restricted area access")

    # 5. Duration check
    max_days = PERMIT_RULES["permit_types"][primary_permit]["max_duration_days"]
    if duration_days > max_days:
        notes.append(
            f"Warning: Duration ({duration_days} days) exceeds maximum ({max_days} days) "
            f"for {primary_permit}. Extension application will be required."
        )

    # Compile all required documents (deduplicated)
    all_docs = list(dict.fromkeys(required_documents))
    for permit_type in additional_permits:
        pt_docs = PERMIT_RULES["permit_types"].get(permit_type, {}).get("documents_required", [])
        for doc in pt_docs:
            if doc not in all_docs:
                all_docs.append(doc)

    return EligibilityResult(
        eligible=True,
        nationality_regime=regime,
        primary_permit_type=primary_permit,
        additional_permits=additional_permits,
        required_documents=all_docs,
        restricted_districts=restricted_districts,
        guide_required=guide_required,
        eligibility_notes=notes,
        agent="eligibility_agent_v1",
        processed_at=datetime.now(timezone.utc).isoformat(),
    )
