"""
Permit Generation Agent — generates permit records with QR codes.

Produces: primary permit + any additional permits (restricted area, trekking).
Each permit gets a unique permit number and verifiable QR code.
"""
import uuid
import json
import base64
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional

try:
    import qrcode
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False


def generate_permit_number(permit_type: str) -> str:
    """BTG-2024-XXXXXX format (Bhutan Tourism, year, sequence)."""
    year = datetime.now().year
    short_id = str(uuid.uuid4()).replace("-", "").upper()[:8]
    type_code = {
        "tourist_visa": "TV",
        "regional_tourist": "RT",
        "restricted_area_permit": "RA",
        "trekking_permit": "TR",
    }.get(permit_type, "GP")
    return f"BTG-{year}-{type_code}-{short_id}"


def generate_qr_code(data: dict) -> str:
    """Generate QR code as base64 PNG string."""
    if not HAS_QRCODE:
        # Return a placeholder if qrcode not installed
        return "QR_PLACEHOLDER_BASE64"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(json.dumps(data, separators=(",", ":")))
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


def generate_permit(state: dict) -> dict:
    """
    LangGraph node: Permit generation agent.

    Reads from state['booking'] + state['eligibility_result'].
    Writes permit records to state['permits'].
    """
    booking = state["booking"]
    eligibility = state.get("eligibility_result", {})
    sdf_result = state.get("sdf_result", {})

    if not eligibility.get("eligible", False):
        return {**state, "status": "permit_skipped_ineligible"}

    entry_date_str = booking.get("entry_date", datetime.now().isoformat())
    exit_date_str = booking.get("exit_date", datetime.now().isoformat())
    traveler_name = booking.get("traveler_name", "Unknown Traveler")
    nationality = booking.get("nationality", "")
    booking_ref = booking.get("reference_code", str(uuid.uuid4())[:8].upper())

    try:
        entry_date = datetime.fromisoformat(entry_date_str.replace("Z", "+00:00"))
        exit_date = datetime.fromisoformat(exit_date_str.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        entry_date = datetime.now()
        exit_date = datetime.now() + timedelta(days=booking.get("duration_days", 7))

    permits = []

    # 1. Primary permit
    primary_type = eligibility["primary_permit_type"]
    primary_permit_number = generate_permit_number(primary_type)
    primary_qr_data = {
        "permit_no": primary_permit_number,
        "traveler": traveler_name,
        "nationality": nationality,
        "valid_from": entry_date.date().isoformat(),
        "valid_until": exit_date.date().isoformat(),
        "type": primary_type,
        "booking_ref": booking_ref,
        "issuer": "Tourism Council of Bhutan",
        "verify_url": f"https://drukpass.bt/verify/{primary_permit_number}",
    }

    primary_permit = {
        "permit_number": primary_permit_number,
        "permit_type": primary_type,
        "status": "government_review",  # Goes to approval queue
        "valid_from": entry_date.isoformat(),
        "valid_until": exit_date.isoformat(),
        "qr_code_data": generate_qr_code(primary_qr_data),
        "qr_payload": primary_qr_data,
        "metadata": {
            "traveler_name": traveler_name,
            "nationality": nationality,
            "booking_reference": booking_ref,
            "sdf_amount_usd": sdf_result.get("total_amount_usd", 0),
            "generated_by": "permit_agent_v1",
            "generated_at": datetime.utcnow().isoformat(),
        },
    }
    permits.append(primary_permit)

    # 2. Additional permits (restricted area, trekking)
    for additional_permit_type in eligibility.get("additional_permits", []):
        add_permit_number = generate_permit_number(additional_permit_type)

        # Restricted area permits have fees
        fee_usd = 0.0
        if additional_permit_type == "restricted_area_permit":
            from pathlib import Path
            import json as _json
            rules_path = Path(__file__).parent.parent / "data" / "permit_rules.json"
            with open(rules_path) as f:
                rules = _json.load(f)
            fee_usd = rules["permit_types"].get(additional_permit_type, {}).get("fee_usd", 0)

        add_qr_data = {
            "permit_no": add_permit_number,
            "traveler": traveler_name,
            "type": additional_permit_type,
            "districts": eligibility.get("restricted_districts", []),
            "valid_from": entry_date.date().isoformat(),
            "valid_until": exit_date.date().isoformat(),
            "booking_ref": booking_ref,
            "verify_url": f"https://drukpass.bt/verify/{add_permit_number}",
        }

        add_permit = {
            "permit_number": add_permit_number,
            "permit_type": additional_permit_type,
            "status": "government_review",
            "valid_from": entry_date.isoformat(),
            "valid_until": exit_date.isoformat(),
            "district": ", ".join(eligibility.get("restricted_districts", [])),
            "fee_usd": fee_usd,
            "qr_code_data": generate_qr_code(add_qr_data),
            "qr_payload": add_qr_data,
            "metadata": {
                "traveler_name": traveler_name,
                "booking_reference": booking_ref,
                "generated_by": "permit_agent_v1",
                "generated_at": datetime.utcnow().isoformat(),
            },
        }
        permits.append(add_permit)

    events = state.get("events", [])
    events.append({
        "actor": "agent:permit_generator",
        "event_type": "permits_generated",
        "event_data": {
            "permits_created": len(permits),
            "permit_numbers": [p["permit_number"] for p in permits],
            "statuses": [p["status"] for p in permits],
        },
        "timestamp": datetime.utcnow().isoformat(),
    })

    return {
        **state,
        "permits": permits,
        "events": events,
        "status": "permits_generated",
    }
