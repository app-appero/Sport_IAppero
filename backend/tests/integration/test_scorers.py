import os

from fastapi.testclient import TestClient

os.environ["USE_PROVIDER_FIXTURES"] = "true"

from app.main import app  # noqa: E402
from app.services.scorers_service import group_by_fixture  # noqa: E402


def test_scorers_groups_by_fixture_sorted_by_probability():
    with TestClient(app) as client:
        data = client.get("/api/v1/scorers", params={"date": "2026-10-13"}).json()
    # Il fixture risponde con le stesse righe per ogni giorno UTC adiacente: nessun duplicato per giocatore.
    assert data["count"] == 1
    players = data["fixtures"][0]["players"]
    probs = [p["probability"] for p in players]
    assert probs == sorted(probs, reverse=True) and players[0]["name"] == "M. Rossi"
    assert "Non e' una quota" in data["note"]


def test_scorers_other_rome_day_is_empty():
    with TestClient(app) as client:
        assert client.get("/api/v1/scorers", params={"date": "2026-10-14"}).json()["count"] == 0


def test_scorers_requires_valid_date():
    with TestClient(app) as client:
        assert client.get("/api/v1/scorers", params={"date": "oggi"}).status_code == 422


def test_group_by_fixture_empty():
    assert group_by_fixture([]) == []


def test_event_scorers_returns_top3_per_team_and_all_players():
    with TestClient(app) as client:
        data = client.get("/api/v1/events/9001/scorers").json()
    assert data["available"] is True and data["status"] == "ready"
    home = next(t for t in data["teams"] if t["team"] == "Casa FC")
    assert [p["name"] for p in home["top"]] == ["M. Rossi", "L. Bianchi", "A. Verdi"]
    assert len(home["players"]) == 3 and home["expected_scorers"] == 0.47


def test_event_scorers_unavailable_before_official_lineup():
    with TestClient(app) as client:
        data = client.get("/api/v1/events/123456/scorers").json()
    assert data["available"] is False and data["teams"] == [] and data["status"] == "lineup_pending"


def test_event_scorers_unsupported_competition():
    with TestClient(app) as client:
        data = client.get("/api/v1/events/9002/scorers").json()
    assert data["available"] is False and data["status"] == "unsupported"
