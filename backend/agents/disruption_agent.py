"""
Disruption Management Agent — identifies affected bookings and
generates coordinated alert payloads for all stakeholders.

This is the 'air traffic control' feature — the competitive differentiator.
"""
from datetime import datetime, timezone
from typing import Optional


def handle_disruption(state: dict) -> dict:
    """
    LangGraph node: Disruption management agent.

    Input state requires:
      - disruption: { type, description, affected_date, entry_point, flight_number, severity }
      - affected_bookings: list of booking objects

    Outputs:
      - disruption_alerts: list of alert payloads per stakeholder
      - disruption_summary: aggregated impact summary
    """
    disruption = state.get("disruption", {})
    affected_bookings = state.get("affected_bookings", [])

    if not disruption:
        return {**state, "status": "no_disruption"}

    alerts = _generate_stakeholder_alerts(disruption, affected_bookings)
    summary = _generate_disruption_summary(disruption, affected_bookings, alerts)

    events = state.get("events", [])
    events.append({
        "actor": "agent:disruption_manager",
        "event_type": "disruption_processed",
        "event_data": {
            "disruption_type": disruption.get("type"),
            "affected_bookings_count": len(affected_bookings),
            "alerts_generated": len(alerts),
            "severity": disruption.get("severity", "moderate"),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        **state,
        "disruption_alerts": alerts,
        "disruption_summary": summary,
        "events": events,
        "status": "disruption_processed",
    }


def _generate_stakeholder_alerts(disruption: dict, affected_bookings: list) -> list:
    """Generate targeted alerts for each stakeholder type."""
    alerts = []

    disruption_type = disruption.get("type", "unknown")
    description = disruption.get("description", "")
    affected_date = disruption.get("affected_date", "")
    severity = disruption.get("severity", "moderate")
    flight_number = disruption.get("flight_number")
    entry_point = disruption.get("entry_point", "Paro Airport")

    severity_emoji = {
        "low": "🟡",
        "moderate": "🟠",
        "high": "🔴",
        "critical": "🚨",
    }.get(severity, "🟠")

    for booking in affected_bookings:
        operator_email = booking.get("operator_email")
        operator_name = booking.get("operator_name", "Operator")
        traveler_name = booking.get("traveler_name", "Traveler")
        guide_name = booking.get("guide_name")
        booking_ref = booking.get("reference_code", "N/A")
        entry_date = booking.get("entry_date", affected_date)

        # Alert for operator
        if operator_email:
            alert_title = _get_alert_title(disruption_type, flight_number)
            suggested_actions = _get_suggested_actions(disruption_type, severity)

            alerts.append({
                "recipient_type": "operator",
                "recipient_email": operator_email,
                "recipient_name": operator_name,
                "booking_reference": booking_ref,
                "channel": "email",
                "priority": severity,
                "subject": f"{severity_emoji} DrukPass Alert: {alert_title} — Booking {booking_ref}",
                "message": (
                    f"Dear {operator_name},\n\n"
                    f"A disruption has been detected that affects your booking {booking_ref} "
                    f"for {traveler_name} (arrival: {entry_date}).\n\n"
                    f"Disruption: {description}\n\n"
                    f"Suggested actions:\n"
                    + "\n".join(f"  • {a}" for a in suggested_actions)
                    + f"\n\nPermit status remains active. Contact DrukPass support to reschedule.\n"
                    f"Reference: {booking_ref}"
                ),
                "metadata": {
                    "disruption_type": disruption_type,
                    "severity": severity,
                    "affected_date": affected_date,
                    "entry_point": entry_point,
                    "flight_number": flight_number,
                    "suggested_actions": suggested_actions,
                },
                "generated_at": datetime.now(timezone.utc).isoformat(),
            })

            # WhatsApp version (shorter)
            alerts.append({
                "recipient_type": "operator",
                "recipient_email": operator_email,
                "recipient_name": operator_name,
                "booking_reference": booking_ref,
                "channel": "whatsapp",
                "priority": severity,
                "message": (
                    f"{severity_emoji} *DrukPass Alert*\n"
                    f"Booking: {booking_ref}\n"
                    f"Traveler: {traveler_name}\n"
                    f"Issue: {description}\n"
                    f"Action required: {suggested_actions[0] if suggested_actions else 'Contact support'}"
                ),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            })

        # Alert for guide (if assigned)
        if guide_name:
            alerts.append({
                "recipient_type": "guide",
                "recipient_name": guide_name,
                "booking_reference": booking_ref,
                "channel": "push_notification",
                "priority": severity,
                "title": f"{severity_emoji} Booking Update: {booking_ref}",
                "message": (
                    f"Your assignment for {traveler_name} may be affected. "
                    f"{description}. Check DrukPass for updates."
                ),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            })

    # Government alert (aggregate, not per-booking)
    if affected_bookings:
        alerts.append({
            "recipient_type": "government",
            "channel": "dashboard",
            "priority": severity,
            "title": f"{severity_emoji} Operational Alert: {_get_alert_title(disruption_type, flight_number)}",
            "message": description,
            "impact_summary": {
                "affected_bookings": len(affected_bookings),
                "affected_operators": len(set(b.get("operator_email") for b in affected_bookings if b.get("operator_email"))),
                "entry_point": entry_point,
                "affected_date": affected_date,
                "severity": severity,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        })

    return alerts


def _get_alert_title(disruption_type: str, flight_number: Optional[str]) -> str:
    if disruption_type == "flight_delay":
        return f"Flight Delay{f' ({flight_number})' if flight_number else ''}"
    elif disruption_type == "flight_cancellation":
        return f"Flight Cancellation{f' ({flight_number})' if flight_number else ''}"
    elif disruption_type == "weather":
        return "Weather Advisory"
    elif disruption_type == "road_closure":
        return "Road Closure"
    else:
        return "Service Disruption"


def _get_suggested_actions(disruption_type: str, severity: str) -> list[str]:
    base = []
    if disruption_type in ("flight_delay", "flight_cancellation"):
        base = [
            "Contact traveler immediately to confirm their situation",
            "Check alternative flight options via your airline contact",
            "Your permit validity period can be extended — contact DrukPass",
            "Hotels and guides have been notified of potential delay",
        ]
        if severity in ("high", "critical"):
            base.insert(0, "URGENT: Traveler may be stranded — arrange emergency accommodation")
    elif disruption_type == "weather":
        base = [
            "Monitor Tourism Council weather advisories",
            "Consider postponing trekking activities in affected areas",
            "Confirm accommodation has availability for extended stay if needed",
        ]
    elif disruption_type == "road_closure":
        base = [
            "Arrange alternative transport for affected route",
            "Contact district office for alternative access routes",
            "Update traveler itinerary via DrukPass portal",
        ]
    return base


def _generate_disruption_summary(
    disruption: dict, affected_bookings: list, alerts: list
) -> dict:
    return {
        "disruption_type": disruption.get("type"),
        "severity": disruption.get("severity", "moderate"),
        "description": disruption.get("description", ""),
        "affected_date": disruption.get("affected_date"),
        "entry_point": disruption.get("entry_point"),
        "flight_number": disruption.get("flight_number"),
        "impact": {
            "affected_bookings_count": len(affected_bookings),
            "affected_travelers": [b.get("traveler_name") for b in affected_bookings],
            "affected_operators": list(set(b.get("operator_name") for b in affected_bookings if b.get("operator_name"))),
            "total_alerts_generated": len(alerts),
            "alerts_by_channel": {
                "email": sum(1 for a in alerts if a.get("channel") == "email"),
                "whatsapp": sum(1 for a in alerts if a.get("channel") == "whatsapp"),
                "push_notification": sum(1 for a in alerts if a.get("channel") == "push_notification"),
                "dashboard": sum(1 for a in alerts if a.get("channel") == "dashboard"),
            },
        },
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "agent": "disruption_agent_v1",
    }
