"""Stale-feed signalling: a snapshot served after a failed rebuild is always flagged."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ["USE_PROVIDER_FIXTURES"] = "true"

from app.core.config import get_settings
from app.core.exceptions import ProviderError
from app.main import app
from app.services import feed_service
from app.services.cache import SingleFlightCache
from app.services.feed_service import reset_feed_state
from app.services.registry import get_providers

PARAMS = {"limit": 5, "sports": "football"}


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("USE_PROVIDER_FIXTURES", "true")
    for fn in (get_settings, get_providers):
        fn.cache_clear()
    reset_feed_state()
    yield
    for fn in (get_settings, get_providers):
        fn.cache_clear()
    reset_feed_state()


def _break_providers(monkeypatch):
    async def boom(query):
        raise ProviderError("feed", "engines down", status_code=503)

    monkeypatch.setattr(feed_service, "_build_snapshot", boom)


def test_fresh_feed_is_not_stale_and_keeps_legacy_meta():
    with TestClient(app) as client:
        body = client.get("/api/v1/feed", params=PARAMS).json()
    meta = body["meta"]
    assert {"status", "is_complete", "providers", "warnings"} <= set(meta)
    assert meta["is_stale"] is False
    assert meta["snapshot_age_seconds"] >= 0
    assert "served_from_stale_cache" not in meta["warnings"]


def test_expired_entry_with_engines_down_is_served_flagged(monkeypatch):
    monkeypatch.setenv("CACHE_TTL_SECONDS", "0")
    monkeypatch.setenv("CACHE_STALE_MAX_SECONDS", "300")
    get_settings.cache_clear()
    with TestClient(app) as client:
        first = client.get("/api/v1/feed", params=PARAMS).json()
        assert first["meta"]["is_stale"] is False
        _break_providers(monkeypatch)
        second = client.get("/api/v1/feed", params=PARAMS)
    assert second.status_code == 200
    body = second.json()
    assert body["meta"]["is_stale"] is True
    assert "served_from_stale_cache" in body["meta"]["warnings"]
    assert body["items"] == first["items"]
    assert body["snapshot_id"] == first["snapshot_id"]


def test_entry_beyond_stale_window_is_not_served(monkeypatch):
    monkeypatch.setenv("CACHE_TTL_SECONDS", "0")
    monkeypatch.setenv("CACHE_STALE_MAX_SECONDS", "0")
    get_settings.cache_clear()
    with TestClient(app) as client:
        assert client.get("/api/v1/feed", params=PARAMS).status_code == 200
        _break_providers(monkeypatch)
        response = client.get("/api/v1/feed", params=PARAMS)
    assert response.status_code == 503


def test_provider_down_without_any_snapshot_is_503(monkeypatch):
    _break_providers(monkeypatch)
    with TestClient(app) as client:
        assert client.get("/api/v1/feed", params=PARAMS).status_code == 503


@pytest.mark.asyncio
async def test_single_flight_reports_stale_fallback():
    cache = SingleFlightCache(ttl_seconds=0, stale_max_seconds=60)

    async def ok():
        return "v1"

    async def fail():
        raise RuntimeError("down")

    assert await cache.get_or_build_ex("k", ok) == ("v1", False)
    assert await cache.get_or_build_ex("k", fail) == ("v1", True)
    assert await cache.get_or_build("k", fail) == "v1"
