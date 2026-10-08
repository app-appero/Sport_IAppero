import os

import pytest
from fastapi.testclient import TestClient

# Fixture mode before app import side effects
os.environ["USE_PROVIDER_FIXTURES"] = "true"

from app.core.config import get_settings
from app.main import app
from app.services.registry import get_providers


@pytest.fixture(autouse=True)
def _reset_caches():
    get_settings.cache_clear()
    get_providers.cache_clear()
    os.environ["USE_PROVIDER_FIXTURES"] = "true"
    yield
    get_settings.cache_clear()
    get_providers.cache_clear()


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
