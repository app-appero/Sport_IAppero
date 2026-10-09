import os

import pytest
from fastapi.testclient import TestClient

# Fixture mode before app import side effects
os.environ["USE_PROVIDER_FIXTURES"] = "true"

from app.core.config import get_settings
from app.main import app
from app.services.feed_service import reset_feed_state
from app.services.registry import get_providers


@pytest.fixture(autouse=True)
def _reset_caches():
    get_settings.cache_clear()
    get_providers.cache_clear()
    reset_feed_state()
    os.environ["USE_PROVIDER_FIXTURES"] = "true"
    yield
    get_settings.cache_clear()
    get_providers.cache_clear()
    reset_feed_state()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_providers(client: TestClient):
    response = client.get("/api/v1/health/providers")
    assert response.status_code == 200
    body = response.json()
    assert body["football"]["provider"] == "soccer-oracle"
    assert body["football"]["status"] == "ok"
    assert body["tennis"]["provider"] == "tennis-oracle"
    assert body["tennis"]["status"] == "ok"


def test_sports(client: TestClient):
    response = client.get("/api/v1/sports")
    assert response.status_code == 200
    sports = {item["id"]: item for item in response.json()}
    assert sports["football"]["provider"] == "soccer-oracle"
    assert sports["tennis"]["provider"] == "tennis-oracle"


def test_football_predictions(client: TestClient):
    response = client.get("/api/v1/sports/football/predictions")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["sport"] == "football"
    assert body["meta"]["count"] >= 10
    assert all(item["sport"] == "football" for item in body["items"])
    assert all(item["provider"]["name"] == "soccer-oracle" for item in body["items"])
    markets = {item["prediction"]["type"] for item in body["items"]}
    assert "h2h" in markets
    assert "under_over_2_5" in markets


def test_tennis_predictions(client: TestClient):
    response = client.get("/api/v1/sports/tennis/predictions")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["sport"] == "tennis"
    assert body["meta"]["count"] >= 3
    assert all(item["sport"] == "tennis" for item in body["items"])


def test_competitions_and_events(client: TestClient):
    comps = client.get("/api/v1/sports/football/competitions").json()
    assert comps["meta"]["count"] >= 1
    events = client.get("/api/v1/sports/tennis/events").json()
    assert events["meta"]["count"] >= 1


def test_prediction_detail(client: TestClient):
    response = client.get("/api/v1/predictions/soccer_1552176_h2h")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "soccer_1552176_h2h"
    assert body["sport"] == "football"
    assert body["prediction"]["type"] == "h2h"

    listed = client.get("/api/v1/sports/tennis/predictions").json()["items"]
    tennis_id = next(i["id"] for i in listed if i["prediction"]["type"] == "match_winner")
    tennis = client.get(f"/api/v1/predictions/{tennis_id}")
    assert tennis.status_code == 200
    assert tennis.json()["sport"] == "tennis"


def test_event_predictions(client: TestClient):
    response = client.get("/api/v1/events/1552176/predictions")
    assert response.status_code == 200
    body = response.json()
    assert body["meta"]["count"] >= 2


def test_liveness_and_ready(client: TestClient):
    assert client.get("/health").json()["status"] == "ok"
    ready = client.get("/ready").json()
    assert ready["status"] == "ok"
    assert "football" in ready["providers"]
    assert "tennis" in ready["providers"]


def test_feed_ok(client: TestClient):
    response = client.get(
        "/api/v1/feed",
        params={"date": "2026-09-20", "limit": 5, "sports": "football,tennis"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "1"
    assert body["snapshot_id"]
    assert body["meta"]["status"] in {"ok", "empty", "degraded"}
    assert len(body["meta"]["providers"]) >= 1
    assert body["page"]["limit"] == 5
    if body["items"]:
        item = body["items"][0]
        assert "event" in item
        assert "predictions" in item
        assert item["predictions"]


def test_feed_cursor_pagination(client: TestClient):
    first = client.get("/api/v1/feed", params={"limit": 1, "sports": "football"}).json()
    assert first["page"]["next_cursor"]
    second = client.get(
        "/api/v1/feed",
        params={"limit": 1, "sports": "football", "cursor": first["page"]["next_cursor"]},
    )
    assert second.status_code == 200
    body = second.json()
    assert body["snapshot_id"] == first["snapshot_id"]
    assert first["items"] and body["items"]
    assert first["items"][0]["event"]["id"] != body["items"][0]["event"]["id"]


def test_feed_invalid_sport(client: TestClient):
    response = client.get("/api/v1/feed", params={"sports": "basketball"})
    assert response.status_code == 422


def test_feed_event_from_snapshot(client: TestClient):
    feed = client.get("/api/v1/feed", params={"limit": 10, "sports": "football"}).json()
    assert feed["items"]
    event_id = feed["items"][0]["event"]["id"]
    detail = client.get(f"/api/v1/events/{event_id}")
    assert detail.status_code == 200
    assert detail.json()["event"]["id"] == event_id
    assert detail.json()["predictions"]


def test_feed_expired_cursor(client: TestClient):
    response = client.get(
        "/api/v1/feed",
        params={
            "limit": 2,
            "cursor": "eyJzIjoiZGVhZGJlZWYkLCJvIjowLCJoIjoiYWJjIn0",  # nonsense
        },
    )
    assert response.status_code in {400, 410}
