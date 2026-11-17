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


def test_stale_flag_follows_the_snapshot_on_every_page(monkeypatch):
    monkeypatch.setenv("CACHE_TTL_SECONDS", "0")
    monkeypatch.setenv("CACHE_STALE_MAX_SECONDS", "300")
    get_settings.cache_clear()
    params = {"limit": 1, "sports": "football"}
    with TestClient(app) as client:
        fresh = client.get("/api/v1/feed", params=params).json()
        assert fresh["meta"]["is_stale"] is False and fresh["page"]["next_cursor"]
        _break_providers(monkeypatch)
        first_page = client.get("/api/v1/feed", params=params).json()
        assert first_page["meta"]["is_stale"] is True
        cursor = first_page["page"]["next_cursor"]
        assert cursor
        second_page = client.get("/api/v1/feed", params={**params, "cursor": cursor})
        # A cursor issued while the snapshot was still fresh points to the same snapshot:
        # once that snapshot is served as a fallback, its pages say so too.
        old_cursor_page = client.get("/api/v1/feed", params={**params, "cursor": fresh["page"]["next_cursor"]})
    for response in (second_page, old_cursor_page):
        assert response.status_code == 200
        body = response.json()
        assert body["snapshot_id"] == first_page["snapshot_id"] == fresh["snapshot_id"]
        assert body["meta"]["is_stale"] is True
        assert "served_from_stale_cache" in body["meta"]["warnings"]
        assert body["meta"]["snapshot_age_seconds"] >= first_page["meta"]["snapshot_age_seconds"]
        assert body["items"] and body["items"] != first_page["items"]


def test_next_page_of_a_fresh_snapshot_is_not_stale():
    params = {"limit": 1, "sports": "football"}
    with TestClient(app) as client:
        first = client.get("/api/v1/feed", params=params).json()
        second = client.get("/api/v1/feed", params={**params, "cursor": first["page"]["next_cursor"]}).json()
    assert second["snapshot_id"] == first["snapshot_id"]
    assert second["meta"]["is_stale"] is False
    assert "served_from_stale_cache" not in second["meta"]["warnings"]


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


@pytest.mark.asyncio
async def test_expire_all_forces_a_rebuild_and_keeps_the_stale_fallback():
    cache = SingleFlightCache(ttl_seconds=3600, stale_max_seconds=3600)
    calls = []

    async def build():
        calls.append(1)
        return f"v{len(calls)}"

    async def fail():
        raise RuntimeError("down")

    assert await cache.get_or_build_ex("k", build) == ("v1", False)
    assert await cache.get_or_build_ex("k", build) == ("v1", False)  # fresh: no rebuild
    cache.expire_all()
    assert cache.get_fresh("k") is None and cache.get_stale("k") == "v1"
    assert await cache.get_or_build_ex("k", fail) == ("v1", True)  # rebuild failed: flagged fallback
    assert await cache.get_or_build_ex("k", build) == ("v2", False)  # rebuild ok: fresh again
    assert await cache.get_or_build_ex("k", fail) == ("v2", False)


@pytest.mark.asyncio
async def test_expire_all_does_not_extend_the_stale_window():
    cache = SingleFlightCache(ttl_seconds=3600, stale_max_seconds=0)

    async def ok():
        return "v1"

    async def fail():
        raise RuntimeError("down")

    await cache.get_or_build_ex("k", ok)
    cache.expire_all()
    with pytest.raises(RuntimeError):
        await cache.get_or_build_ex("k", fail)


@pytest.mark.asyncio
async def test_build_in_flight_during_expire_all_is_stored_expired():
    import asyncio

    cache = SingleFlightCache(ttl_seconds=3600, stale_max_seconds=3600)
    started, release = asyncio.Event(), asyncio.Event()
    calls = []

    async def slow():
        calls.append(1)
        started.set()
        await release.wait()
        return f"v{len(calls)}"

    task = asyncio.create_task(cache.get_or_build_ex("k", slow))
    await started.wait()
    cache.expire_all()  # e.g. an admin refresh starts while the feed is being built
    release.set()
    assert await task == ("v1", False)
    assert cache.get_fresh("k") is None and cache.get_stale("k") == "v1"
    assert await cache.get_or_build_ex("k", slow) == ("v2", False)
