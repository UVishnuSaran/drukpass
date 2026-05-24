"""
Tests for the DrukPass agent chain.
Quinn (Test Author) — validates every agent against real Bhutan permit rules.

Run: pytest tests/test_agents.py -v
"""
import pytest
from agents.eligibility_agent import check_eligibility, _run_eligibility_rules
from agents.sdf_agent import calculate_sdf, _compute_sdf
from agents.permit_agent import generate_permit, generate_permit_number


# ─── Eligibility Agent Tests ─────────────────────────────────────────────────

class TestEligibilityAgent:
    """Tests for nationality → permit type determination."""

    def _make_state(self, nationality, purpose="leisure", districts=None, duration=7, age=None):
        return {
            "booking": {
                "nationality": nationality,
                "travel_purpose": purpose,
                "districts": districts or ["Paro", "Thimphu"],
                "entry_date": "2026-06-01",
                "duration_days": duration,
                "traveler_age": age,
                "is_bhutanese_origin": False,
            },
            "events": [],
            "status": "started",
        }

    def test_japanese_tourist_gets_international_regime(self):
        state = self._make_state("JP")
        result = check_eligibility(state)
        assert result["eligibility_result"]["nationality_regime"] == "international"
        assert result["eligibility_result"]["primary_permit_type"] == "tourist_visa"
        assert result["eligibility_result"]["eligible"] is True

    def test_indian_tourist_gets_regional_regime(self):
        state = self._make_state("IN")
        result = check_eligibility(state)
        assert result["eligibility_result"]["nationality_regime"] == "regional"
        assert result["eligibility_result"]["primary_permit_type"] == "regional_tourist"

    def test_bangladeshi_regional_regime(self):
        state = self._make_state("BD")
        result = check_eligibility(state)
        assert result["eligibility_result"]["nationality_regime"] == "regional"

    def test_maldivian_regional_regime(self):
        state = self._make_state("MV")
        result = check_eligibility(state)
        assert result["eligibility_result"]["nationality_regime"] == "regional"

    def test_us_tourist_gets_international_regime(self):
        state = self._make_state("US")
        result = check_eligibility(state)
        assert result["eligibility_result"]["nationality_regime"] == "international"

    def test_trekking_purpose_adds_trekking_permit(self):
        state = self._make_state("JP", purpose="trekking")
        result = check_eligibility(state)
        assert "trekking_permit" in result["eligibility_result"]["additional_permits"]

    def test_restricted_district_adds_rap(self):
        state = self._make_state("JP", districts=["Haa", "Paro"])
        result = check_eligibility(state)
        assert "restricted_area_permit" in result["eligibility_result"]["additional_permits"]
        assert "Haa" in result["eligibility_result"]["restricted_districts"]

    def test_gasa_adds_restricted_permit(self):
        state = self._make_state("DE", districts=["Gasa"])
        result = check_eligibility(state)
        assert "restricted_area_permit" in result["eligibility_result"]["additional_permits"]

    def test_lhuntse_adds_restricted_permit(self):
        state = self._make_state("FR", districts=["Lhuntse"])
        result = check_eligibility(state)
        assert "restricted_area_permit" in result["eligibility_result"]["additional_permits"]

    def test_international_requires_guide(self):
        state = self._make_state("JP")
        result = check_eligibility(state)
        assert result["eligibility_result"]["guide_required"] is True

    def test_regional_no_guide_required_for_non_restricted(self):
        state = self._make_state("IN", districts=["Thimphu"])
        result = check_eligibility(state)
        assert result["eligibility_result"]["guide_required"] is False

    def test_paro_and_thimphu_not_restricted(self):
        state = self._make_state("JP", districts=["Paro", "Thimphu"])
        result = check_eligibility(state)
        assert result["eligibility_result"]["restricted_districts"] == []

    def test_audit_event_recorded(self):
        state = self._make_state("JP")
        result = check_eligibility(state)
        assert len(result["events"]) >= 1
        assert result["events"][-1]["actor"] == "agent:eligibility"
        assert result["events"][-1]["event_type"] == "eligibility_check_completed"

    def test_status_updated_to_eligibility_complete(self):
        state = self._make_state("JP")
        result = check_eligibility(state)
        assert result["status"] == "eligibility_complete"


# ─── SDF Agent Tests ─────────────────────────────────────────────────────────

class TestSDFAgent:
    """Tests for fee calculation accuracy — zero errors allowed."""

    def _make_state(self, regime, entry_date, duration=7, age=None, bhutanese_origin=False, nationality="JP", purpose="leisure"):
        return {
            "booking": {
                "nationality": nationality,
                "entry_date": entry_date,
                "duration_days": duration,
                "traveler_age": age,
                "is_bhutanese_origin": bhutanese_origin,
                "travel_purpose": purpose,
            },
            "eligibility_result": {
                "nationality_regime": regime,
                "eligible": True,
            },
            "events": [],
            "status": "eligibility_complete",
        }

    def test_international_peak_season_rate(self):
        """April = peak season → $250/day"""
        state = self._make_state("international", "2026-04-10", duration=7)
        result = calculate_sdf(state)
        sdf = result["sdf_result"]
        assert sdf["daily_rate_usd"] == 250
        assert sdf["season"] == "peak"
        assert sdf["total_amount_usd"] == 1750.0

    def test_international_low_season_rate(self):
        """January = low season → $200/day"""
        state = self._make_state("international", "2026-01-15", duration=5)
        result = calculate_sdf(state)
        sdf = result["sdf_result"]
        assert sdf["daily_rate_usd"] == 200
        assert sdf["season"] == "low"
        assert sdf["total_amount_usd"] == 1000.0

    def test_regional_flat_rate(self):
        """Indian nationals = $15/day flat regardless of season"""
        state = self._make_state("regional", "2026-10-01", duration=3, nationality="IN")
        result = calculate_sdf(state)
        sdf = result["sdf_result"]
        assert sdf["daily_rate_usd"] == 15
        assert sdf["total_amount_usd"] == 45.0
        assert sdf["season"] == "regional"

    def test_child_under_5_full_waiver(self):
        """Children under 5 = 100% SDF waiver"""
        state = self._make_state("international", "2026-04-01", duration=7, age=3)
        result = calculate_sdf(state)
        sdf = result["sdf_result"]
        assert sdf["waiver_applied"] is True
        assert sdf["waiver_percent"] == 100.0
        assert sdf["total_amount_usd"] == 0.0

    def test_child_5_to_12_half_waiver(self):
        """Children 5-12 = 50% SDF waiver"""
        state = self._make_state("international", "2026-04-01", duration=4, age=8)
        result = calculate_sdf(state)
        sdf = result["sdf_result"]
        assert sdf["waiver_applied"] is True
        assert sdf["waiver_percent"] == 50.0
        assert sdf["total_amount_usd"] == 500.0  # 4 days × $250 × 50%

    def test_adult_no_waiver(self):
        state = self._make_state("international", "2026-04-01", duration=7, age=35)
        result = calculate_sdf(state)
        sdf = result["sdf_result"]
        assert sdf["waiver_applied"] is False
        assert sdf["waiver_percent"] == 0.0

    def test_bhutanese_origin_full_waiver(self):
        state = self._make_state("international", "2026-10-01", duration=10, bhutanese_origin=True)
        result = calculate_sdf(state)
        sdf = result["sdf_result"]
        assert sdf["waiver_applied"] is True
        assert sdf["total_amount_usd"] == 0.0

    def test_peak_months_are_correct(self):
        """Peak months: March, April, May, September, October, November"""
        peak_months = [3, 4, 5, 9, 10, 11]
        for month in peak_months:
            entry = f"2026-{month:02d}-15"
            result = _compute_sdf(
                regime="international", entry_date_str=entry,
                duration_days=1, traveler_age=None, is_bhutanese_origin=False,
                travel_purpose="leisure", nationality="JP"
            )
            assert result["daily_rate_usd"] == 250, f"Month {month} should be peak ($250)"

    def test_low_months_are_correct(self):
        """Low months: Jan, Feb, Jun, Jul, Aug, Dec"""
        low_months = [1, 2, 6, 7, 8, 12]
        for month in low_months:
            entry = f"2026-{month:02d}-15"
            result = _compute_sdf(
                regime="international", entry_date_str=entry,
                duration_days=1, traveler_age=None, is_bhutanese_origin=False,
                travel_purpose="leisure", nationality="JP"
            )
            assert result["daily_rate_usd"] == 200, f"Month {month} should be low ($200)"

    def test_sdf_audit_event_recorded(self):
        state = self._make_state("international", "2026-04-01", duration=7)
        result = calculate_sdf(state)
        assert any(e["event_type"] == "sdf_calculated" for e in result["events"])


# ─── Permit Agent Tests ───────────────────────────────────────────────────────

class TestPermitAgent:
    """Tests for permit generation and QR codes."""

    def _make_state(self, primary_type, additional=None, restricted_districts=None):
        return {
            "booking": {
                "nationality": "JP",
                "traveler_name": "Yuki Tanaka",
                "entry_date": "2026-06-01T00:00:00",
                "exit_date": "2026-06-08T00:00:00",
                "reference_code": "DP-TEST-001",
                "duration_days": 7,
            },
            "eligibility_result": {
                "eligible": True,
                "primary_permit_type": primary_type,
                "additional_permits": additional or [],
                "restricted_districts": restricted_districts or [],
            },
            "sdf_result": {"total_amount_usd": 1750.0},
            "events": [],
            "status": "sdf_complete",
        }

    def test_international_gets_tourist_visa_permit(self):
        state = self._make_state("tourist_visa")
        result = generate_permit(state)
        assert len(result["permits"]) == 1
        assert result["permits"][0]["permit_type"] == "tourist_visa"

    def test_regional_gets_regional_tourist_permit(self):
        state = self._make_state("regional_tourist")
        result = generate_permit(state)
        assert result["permits"][0]["permit_type"] == "regional_tourist"

    def test_restricted_district_generates_extra_permit(self):
        state = self._make_state("tourist_visa", additional=["restricted_area_permit"], restricted_districts=["Haa"])
        result = generate_permit(state)
        types = [p["permit_type"] for p in result["permits"]]
        assert "tourist_visa" in types
        assert "restricted_area_permit" in types
        assert len(result["permits"]) == 2

    def test_trekking_adds_trekking_permit(self):
        state = self._make_state("tourist_visa", additional=["trekking_permit"])
        result = generate_permit(state)
        types = [p["permit_type"] for p in result["permits"]]
        assert "trekking_permit" in types

    def test_permit_number_format(self):
        num = generate_permit_number("tourist_visa")
        assert num.startswith("BTG-")
        assert "-TV-" in num
        parts = num.split("-")
        assert len(parts) == 4

    def test_permit_has_qr_code(self):
        state = self._make_state("tourist_visa")
        result = generate_permit(state)
        permit = result["permits"][0]
        assert "qr_code_data" in permit
        assert permit["qr_code_data"] is not None

    def test_permit_has_qr_payload(self):
        state = self._make_state("tourist_visa")
        result = generate_permit(state)
        qr = result["permits"][0]["qr_payload"]
        assert qr["traveler"] == "Yuki Tanaka"
        assert "verify_url" in qr
        assert "drukpass.bt/verify" in qr["verify_url"]

    def test_permit_status_is_government_review(self):
        state = self._make_state("tourist_visa")
        result = generate_permit(state)
        assert result["permits"][0]["status"] == "government_review"

    def test_audit_event_recorded_for_permits(self):
        state = self._make_state("tourist_visa")
        result = generate_permit(state)
        assert any(e["event_type"] == "permits_generated" for e in result["events"])

    def test_status_updated_to_permits_generated(self):
        state = self._make_state("tourist_visa")
        result = generate_permit(state)
        assert result["status"] == "permits_generated"


# ─── Full Chain Integration Test ──────────────────────────────────────────────

class TestFullChain:
    """End-to-end chain: eligibility → SDF → permit in one flow."""

    def test_japanese_trekker_full_chain(self):
        """JP trekker going to Gasa → international, trekking permit, RAP, SDF $250/day"""
        state = {
            "booking": {
                "nationality": "JP",
                "travel_purpose": "trekking",
                "districts": ["Gasa", "Paro"],
                "entry_date": "2026-10-01T00:00:00",
                "exit_date": "2026-10-08T00:00:00",
                "duration_days": 7,
                "traveler_name": "Kenji Sato",
                "reference_code": "DP-INT-001",
                "traveler_age": None,
                "is_bhutanese_origin": False,
            },
            "events": [],
            "status": "started",
        }

        # Run chain
        state = check_eligibility(state)
        state = calculate_sdf(state)
        state = generate_permit(state)

        # Assert eligibility
        assert state["eligibility_result"]["nationality_regime"] == "international"
        assert "trekking_permit" in state["eligibility_result"]["additional_permits"]
        assert "restricted_area_permit" in state["eligibility_result"]["additional_permits"]

        # Assert SDF
        assert state["sdf_result"]["daily_rate_usd"] == 250  # October = peak
        assert state["sdf_result"]["total_amount_usd"] == 1750.0

        # Assert permits (tourist_visa + trekking + RAP)
        types = [p["permit_type"] for p in state["permits"]]
        assert "tourist_visa" in types
        assert len(state["permits"]) >= 2  # at minimum visa + one additional

        # Assert audit trail
        assert len(state["events"]) >= 3
        actors = [e["actor"] for e in state["events"]]
        assert any("eligibility" in a for a in actors)
        assert any("sdf" in a for a in actors)
        assert any("permit" in a for a in actors)

    def test_indian_tourist_chain(self):
        """IN tourist → regional, $15/day, no guide required"""
        state = {
            "booking": {
                "nationality": "IN",
                "travel_purpose": "leisure",
                "districts": ["Thimphu"],
                "entry_date": "2026-06-01T00:00:00",
                "exit_date": "2026-06-04T00:00:00",
                "duration_days": 3,
                "traveler_name": "Priya Sharma",
                "reference_code": "DP-INT-002",
                "traveler_age": None,
                "is_bhutanese_origin": False,
            },
            "events": [],
            "status": "started",
        }

        state = check_eligibility(state)
        state = calculate_sdf(state)
        state = generate_permit(state)

        assert state["eligibility_result"]["nationality_regime"] == "regional"
        assert state["sdf_result"]["total_amount_usd"] == 45.0  # 3 days × $15
        assert state["eligibility_result"]["guide_required"] is False
