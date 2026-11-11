"""GET-only retry and circuit breaker for engine HTTP calls."""

from __future__ import annotations

import httpx
import pytest
import respx

from app.core.config import get_settings
from app.core.exceptions import ProviderUnavailable
from app.providers.http_utils import request_json, reset_provider_circuits


@pytest.fixture(autouse=True)
def _reset_circuits_and_settings(monkeypatch):
    reset_provider_circuits()
    get_settings.cache_clear()
    monkeypatch.setenv("PROVIDER_GET_MAX_ATTEMPTS", "3")
    monkeypatch.setenv("PROVIDER_GET_BACKOFF_SECONDS", "0")
    monkeypatch.setenv("PROVIDER_CIRCUIT_FAILURE_THRESHOLD", "2")
    monkeypatch.setenv("PROVIDER_CIRCUIT_OPEN_SECONDS", "60")
    get_settings.cache_clear()
    yield
    reset_provider_circuits()
    get_settings.cache_clear()


@pytest.mark.asyncio
@respx.mock
async def test_get_retries_on_503_then_succeeds():
    route = respx.get("https://engine.test/data").mock(
        side_effect=[
            httpx.Response(503, json={"detail": "busy"}),
            httpx.Response(200, json={"ok": True}),
        ]
    )
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        payload = await request_json(client, provider="test-engine", method="GET", path="/data")
    assert payload == {"ok": True}
    assert route.call_count == 2


@pytest.mark.asyncio
@respx.mock
async def test_post_is_not_retried():
    route = respx.post("https://engine.test/refresh").mock(return_value=httpx.Response(503))
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        with pytest.raises(ProviderUnavailable):
            await request_json(client, provider="test-engine", method="POST", path="/refresh")
    assert route.call_count == 1


@pytest.mark.asyncio
@respx.mock
async def test_circuit_opens_after_threshold():
    route = respx.get("https://engine.test/data").mock(return_value=httpx.Response(500))
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        with pytest.raises(ProviderUnavailable):
            await request_json(client, provider="test-engine", method="GET", path="/data")
        with pytest.raises(ProviderUnavailable):
            await request_json(client, provider="test-engine", method="GET", path="/data")
        # Circuit now open: no further HTTP call.
        with pytest.raises(ProviderUnavailable) as exc:
            await request_json(client, provider="test-engine", method="GET", path="/data")
    assert "Circuit open" in str(exc.value)
    assert route.call_count == 2
