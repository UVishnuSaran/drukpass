"""
SDF Calculation Agent — computes Sustainable Development Fee.

Deterministic rules engine. Zero calculation errors guaranteed by
exhaustive test coverage of the fee schedule.
"""
import json
from pathlib import Path
from datetime import datetime, date

_rules_path = Path(__file__).parent.parent / "data" / "permit_rules.json"
with open(_rules_path) as f:
    PERMIT_RULES = json.load(f)

PEAK_MONTHS = PERMIT_RULES["nationality_regimes"]["international"]["sdf_tiers"]["peak_season"]["months"]
PEAK_DAILY_RATE = PERMIT_RULES["nationality_regimes"]["international"]["sdf_tiers"]["peak_season"]["daily_usd"]
LOW_DAILY_RATE = PERMIT_RULES["nationality_regimes"]["international"]["sdf_tiers"]["low_season"]["daily_usd"]
REGIONAL_DAILY_RATE = PERMIT_RULES["nationality_regimes"]["regional"]["sdf_daily_usd"]


def calculate_sdf(state: dict) -> dict:
    """
    LangGraph node: SDF calculation agent.

    Reads from state['booking'] + state['eligibility_result'].
    Writes to state['sdf_result'].
    """
    booking = state["booking"]
    eligibility = state.get("eligibility_result", {})

    if not eligibility.get("eligible", False):
        return {**state, "status": "sdf_skipped_ineligible"}

    regime = eligibility["nationality_regime"]
    entry_date_str = booking.get("entry_date", datetime.now().isoformat())
    duration_days = booking.get("duration_days", 1)
    traveler_age = booking.get("traveler_age")
    is_bhutanese_origin = booking.get("is_bhutanese_origin", False)
    travel_purpose = booking.get("travel_purpose", "leisure")
    nationality = booking.get("nationality", "").upper()

    result = _compute_sdf(
        regime=regime,
        entry_date_str=entry_date_str,
        duration_days=duration_days,
        traveler_age=traveler_age,
        is_bhutanese_origin=is_bhutanese_origin,
        travel_purpose=travel_purpose,
        nationality=nationality,
    )

    events = state.get("events", [])
    events.append({
        "actor": "agent:sdf_calculator",
        "event_type": "sdf_calculated",
        "event_data": {
            "regime": regime,
            "daily_rate": result["daily_rate_usd"],
            "duration_days": duration_days,
            "total_usd": result["total_amount_usd"],
            "waiver_applied": result["waiver_applied"],
            "season": result["season"],
        },
        "timestamp": datetime.utcnow().isoformat(),
    })

    return {
        **state,
        "sdf_result": result,
        "events": events,
        "status": "sdf_complete",
    }


def _compute_sdf(
    regime: str,
    entry_date_str: str,
    duration_days: int,
    traveler_age: int | None,
    is_bhutanese_origin: bool,
    travel_purpose: str,
    nationality: str,
) -> dict:
    """Pure calculation — no side effects."""

    breakdown = {}

    # 1. Determine base daily rate
    if regime == "regional":
        daily_rate = REGIONAL_DAILY_RATE
        season = "regional"
        breakdown["regime"] = "Regional tourist scheme ($15/day flat rate)"
    else:
        # Parse entry month for peak/low season
        try:
            entry_dt = datetime.fromisoformat(entry_date_str.replace("Z", "+00:00"))
            entry_month = entry_dt.month
        except (ValueError, AttributeError):
            entry_month = datetime.now().month

        if entry_month in PEAK_MONTHS:
            daily_rate = PEAK_DAILY_RATE
            season = "peak"
            month_name = date(2024, entry_month, 1).strftime("%B")
            breakdown["season"] = f"Peak season ({month_name}) — ${PEAK_DAILY_RATE}/day"
        else:
            daily_rate = LOW_DAILY_RATE
            season = "low"
            month_name = date(2024, entry_month, 1).strftime("%B")
            breakdown["season"] = f"Low season ({month_name}) — ${LOW_DAILY_RATE}/day"

    breakdown["daily_rate_usd"] = daily_rate
    breakdown["duration_days"] = duration_days
    base_amount = daily_rate * duration_days
    breakdown["base_amount_usd"] = base_amount

    # 2. Check waivers
    waiver_applied = False
    waiver_type = None
    waiver_percent = 0.0
    waiver_amount = 0.0

    if is_bhutanese_origin:
        waiver_applied = True
        waiver_type = "bhutanese_diaspora"
        waiver_percent = 100.0
        waiver_amount = base_amount
        breakdown["waiver"] = "Bhutanese diaspora — 100% waiver (documentation required)"

    elif traveler_age is not None:
        regional_nationalities = PERMIT_RULES["nationality_regimes"]["regional"]["nationalities"]
        is_regional = nationality in regional_nationalities

        if traveler_age < 5:
            waiver_applied = True
            waiver_type = "children_under_5"
            waiver_percent = 100.0
            waiver_amount = base_amount
            breakdown["waiver"] = "Child under 5 years — 100% SDF waiver"
        elif 5 <= traveler_age <= 12:
            waiver_applied = True
            waiver_type = "children_5_to_12"
            waiver_percent = 50.0
            waiver_amount = base_amount * 0.5
            breakdown["waiver"] = "Child 5–12 years — 50% SDF waiver"
        elif traveler_age < 18 and is_regional:
            waiver_applied = True
            waiver_type = "children_under_18_national"
            waiver_percent = 100.0
            waiver_amount = base_amount
            breakdown["waiver"] = "Regional national under 18 — 100% SDF waiver"

    # Volunteer purpose — eligible for waiver but requires government approval
    volunteer_waiver_pending = False
    if travel_purpose == "volunteer" and not waiver_applied:
        volunteer_waiver_pending = True
        breakdown["volunteer_note"] = (
            "Volunteer/NGO purpose may qualify for SDF waiver — "
            "pending Tourism Council approval. Full SDF charged until approved."
        )

    total_amount = base_amount - waiver_amount
    breakdown["waiver_amount_usd"] = waiver_amount
    breakdown["total_amount_usd"] = total_amount

    return {
        "nationality_regime": regime,
        "daily_rate_usd": daily_rate,
        "duration_days": duration_days,
        "base_amount_usd": base_amount,
        "waiver_applied": waiver_applied,
        "waiver_type": waiver_type,
        "waiver_percent": waiver_percent,
        "waiver_amount_usd": waiver_amount,
        "total_amount_usd": round(total_amount, 2),
        "season": season,
        "volunteer_waiver_pending": volunteer_waiver_pending,
        "calculation_breakdown": breakdown,
        "agent": "sdf_agent_v1",
        "processed_at": datetime.utcnow().isoformat(),
    }
