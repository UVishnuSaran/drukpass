"""
DrukPass LangGraph Orchestrator — the agentic workflow chain.

This is the core of the system. A booking flows through:
  check_eligibility → calculate_sdf → generate_permit → [notify_stakeholders]

The graph is deterministic and auditable — every node records events.
Disruption workflow is a separate graph.
"""
import time
import uuid
from datetime import datetime, timezone
from typing import TypedDict, Annotated, Optional
import operator

try:
    from langgraph.graph import StateGraph, END
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False

from agents.eligibility_agent import check_eligibility
from agents.sdf_agent import calculate_sdf
from agents.permit_agent import generate_permit
from agents.disruption_agent import handle_disruption


# ─── State Definition ────────────────────────────────────────────────────────

class WorkflowState(TypedDict):
    """Shared state object flowing through the agent graph."""
    booking: dict                          # Input booking data
    eligibility_result: Optional[dict]    # From eligibility agent
    sdf_result: Optional[dict]            # From SDF agent
    permits: Optional[list]               # From permit agent
    status: str                            # Current workflow status
    events: Annotated[list, operator.add]  # Audit trail (append-only)
    error: Optional[str]                   # Error if any node fails


class DisruptionWorkflowState(TypedDict):
    """State for disruption management workflow."""
    disruption: dict
    affected_bookings: list
    disruption_alerts: Optional[list]
    disruption_summary: Optional[dict]
    events: Annotated[list, operator.add]
    status: str


# ─── Conditional Edges ───────────────────────────────────────────────────────

def eligibility_router(state: WorkflowState) -> str:
    """After eligibility check — route to SDF or end if ineligible."""
    if state.get("status") == "eligibility_failed":
        return "rejected"
    return "approved"


def sdf_router(state: WorkflowState) -> str:
    """After SDF — always proceed to permit generation."""
    return "generate"


# ─── Error Handler ───────────────────────────────────────────────────────────

def handle_error(state: WorkflowState) -> WorkflowState:
    """Terminal node for ineligible bookings."""
    events = state.get("events", [])
    events.append({
        "actor": "agent:orchestrator",
        "event_type": "workflow_rejected",
        "event_data": {
            "reason": state.get("error", "Eligibility check failed"),
            "status": state.get("status"),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    return {**state, "events": events, "status": "rejected"}


# ─── Graph Builder ───────────────────────────────────────────────────────────

def build_booking_graph():
    """Build and compile the booking workflow graph."""
    if not HAS_LANGGRAPH:
        return None

    graph = StateGraph(WorkflowState)

    graph.add_node("check_eligibility", check_eligibility)
    graph.add_node("calculate_sdf", calculate_sdf)
    graph.add_node("generate_permit", generate_permit)
    graph.add_node("rejected", handle_error)

    graph.set_entry_point("check_eligibility")

    graph.add_conditional_edges(
        "check_eligibility",
        eligibility_router,
        {
            "approved": "calculate_sdf",
            "rejected": "rejected",
        }
    )
    graph.add_edge("calculate_sdf", "generate_permit")
    graph.add_edge("generate_permit", END)
    graph.add_edge("rejected", END)

    return graph.compile()


def build_disruption_graph():
    """Build and compile the disruption management graph."""
    if not HAS_LANGGRAPH:
        return None

    graph = StateGraph(DisruptionWorkflowState)
    graph.add_node("handle_disruption", handle_disruption)
    graph.set_entry_point("handle_disruption")
    graph.add_edge("handle_disruption", END)

    return graph.compile()


# ─── Fallback (no LangGraph) ─────────────────────────────────────────────────

def run_booking_chain_sequential(booking_data: dict) -> dict:
    """
    Sequential fallback when LangGraph is not installed.
    Runs the same agents in order — same result, just without the graph.
    """
    state: WorkflowState = {
        "booking": booking_data,
        "eligibility_result": None,
        "sdf_result": None,
        "permits": None,
        "status": "started",
        "events": [{
            "actor": "agent:orchestrator",
            "event_type": "workflow_started",
            "event_data": {"booking_ref": booking_data.get("reference_code"), "mode": "sequential"},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }],
        "error": None,
    }

    state = check_eligibility(state)
    if state["status"] == "eligibility_failed":
        return handle_error(state)

    state = calculate_sdf(state)
    state = generate_permit(state)

    state["events"].append({
        "actor": "agent:orchestrator",
        "event_type": "workflow_completed",
        "event_data": {
            "permits_count": len(state.get("permits", [])),
            "sdf_total": state.get("sdf_result", {}).get("total_amount_usd", 0),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    state["status"] = "completed"
    return state


# ─── Public API ──────────────────────────────────────────────────────────────

# Compile graphs once at module load
_booking_graph = build_booking_graph()
_disruption_graph = build_disruption_graph()


async def process_booking(booking_data: dict) -> dict:
    """
    Main entry point — process a booking through the full agent chain.

    Returns the final workflow state with:
      - eligibility_result
      - sdf_result
      - permits (list of permit dicts)
      - events (full audit trail)
      - status
      - processing_duration_ms
    """
    start_ms = time.time() * 1000

    initial_state: WorkflowState = {
        "booking": booking_data,
        "eligibility_result": None,
        "sdf_result": None,
        "permits": None,
        "status": "started",
        "events": [{
            "actor": "agent:orchestrator",
            "event_type": "workflow_started",
            "event_data": {
                "booking_ref": booking_data.get("reference_code"),
                "nationality": booking_data.get("nationality"),
                "travel_purpose": booking_data.get("travel_purpose"),
                "districts": booking_data.get("districts", []),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }],
        "error": None,
    }

    if _booking_graph is not None:
        # Use LangGraph
        final_state = await _booking_graph.ainvoke(initial_state)
    else:
        # Fallback to sequential
        final_state = run_booking_chain_sequential(booking_data)

    end_ms = time.time() * 1000
    final_state["processing_duration_ms"] = int(end_ms - start_ms)

    return final_state


async def process_disruption(disruption_data: dict, affected_bookings: list) -> dict:
    """
    Process a disruption event through the disruption management graph.
    """
    initial_state: DisruptionWorkflowState = {
        "disruption": disruption_data,
        "affected_bookings": affected_bookings,
        "disruption_alerts": None,
        "disruption_summary": None,
        "events": [{
            "actor": "agent:orchestrator",
            "event_type": "disruption_workflow_started",
            "event_data": disruption_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }],
        "status": "started",
    }

    if _disruption_graph is not None:
        return await _disruption_graph.ainvoke(initial_state)
    else:
        return handle_disruption(initial_state)
