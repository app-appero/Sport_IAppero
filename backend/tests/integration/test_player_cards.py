import os

from fastapi.testclient import TestClient

os.environ["USE_PROVIDER_FIXTURES"] = "true"

from app.main import app  # noqa: E402
from app.services.scorers_service import group_by_fixture  # noqa: E402


def test_event_player_cards_top3_per_team_and_all_players():
    with TestClient(app) as client:
        data = client.get("/api/v1/events/9001/bookings").json()
    assert data["available"] is True and data["status"] == "ready"
    assert "ammonito" in data["note"] and "Non e' una quota" in data["note"]
    home = next(t for t in data["teams"] if t["team"] == "Casa FC")
    assert [p["name"] for p in home["top"]] == ["M. Rossi", "L. Bianchi", "A. Verdi"]
    assert len(home["players"]) == 3 and "expected_yellows" in home
    assert all("booked" in p and "scored" not in p for p in home["players"])


def test_event_player_cards_unavailable_before_official_lineup():
    with TestClient(app) as client:
        data = client.get("/api/v1/events/123456/bookings").json()
    assert data["available"] is False and data["teams"] == [] and data["status"] == "lineup_pending"


def test_event_player_cards_unsupported_competition():
    with TestClient(app) as client:
        data = client.get("/api/v1/events/9002/bookings").json()
    assert data["available"] is False and data["status"] == "unsupported"


def test_group_by_fixture_maps_hit_field():
    rows = [{"fixture_id": 1, "player_id": 2, "probability": 0.2, "yellow": True}]
    out = group_by_fixture(rows, hit_field="yellow", out_field="booked")
    assert out[0]["players"][0]["booked"] is True
