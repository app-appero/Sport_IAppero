"""GET-only retry and circuit breaker for engine HTTP calls."""

from __future__ import annotations

import httpx
import pytest
import respx

from app.core.config import get_settings
from app.core.exceptions import ProviderResponseError, ProviderUnavailable
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


@pytest.mark.asyncio
@respx.mock
async def test_4xx_is_not_retried_and_does_not_open_the_circuit():
    route = respx.get("https://engine.test/data").mock(return_value=httpx.Response(404, text="nope"))
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        for _ in range(4):
            with pytest.raises(ProviderResponseError):
                await request_json(client, provider="test-engine", method="GET", path="/data")
    assert route.call_count == 4  # one call each: no retry, circuit never opened


@pytest.mark.asyncio
@respx.mock
async def test_429_is_retried_for_get():
    route = respx.get("https://engine.test/data").mock(
        side_effect=[httpx.Response(429), httpx.Response(200, json={"ok": 1})]
    )
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        assert await request_json(client, provider="test-engine", method="GET", path="/data") == {"ok": 1}
    assert route.call_count == 2


@pytest.mark.asyncio
@respx.mock
async def test_timeout_is_retried_then_succeeds():
    route = respx.get("https://engine.test/data").mock(
        side_effect=[httpx.ReadTimeout("slow"), httpx.Response(200, json={"ok": 2})]
    )
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        assert await request_json(client, provider="test-engine", method="GET", path="/data") == {"ok": 2}
    assert route.call_count == 2


@pytest.mark.asyncio
@respx.mock
async def test_attempts_are_capped(monkeypatch):
    monkeypatch.setenv("PROVIDER_CIRCUIT_FAILURE_THRESHOLD", "99")
    get_settings.cache_clear()
    route = respx.get("https://engine.test/data").mock(return_value=httpx.Response(502))
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        with pytest.raises(ProviderUnavailable):
            await request_json(client, provider="test-engine", method="GET", path="/data")
    assert route.call_count == 3


@pytest.mark.asyncio
@respx.mock
async def test_success_resets_the_failure_count():
    respx.get("https://engine.test/data").mock(
        side_effect=[httpx.Response(500), httpx.Response(200, json={}), httpx.Response(500),
                     httpx.Response(200, json={})]
    )
    async with httpx.AsyncClient(base_url="https://engine.test") as client:
        for _ in range(2):  # threshold is 2: failures separated by a success never open it
            await request_json(client, provider="test-engine", method="GET", path="/data")


@pytest.mark.asyncio
@respx.mock
async def test_circuits_are_per_provider_and_error_text_has_no_url_credentials():
    respx.get("https://user:secret@engine.test/data").mock(side_effect=httpx.ConnectError("refused"))
    async with httpx.AsyncClient(base_url="https://user:secret@engine.test") as client:
        with pytest.raises(ProviderUnavailable) as exc:
            await request_json(client, provider="engine-a", method="GET", path="/data")
        assert "secret" not in str(exc.value)
        respx.get("https://user:secret@engine.test/ok").mock(return_value=httpx.Response(200, json={"a": 1}))
        assert await request_json(client, provider="engine-b", method="GET", path="/ok") == {"a": 1}
