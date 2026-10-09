import httpx
import pytest
import respx

from app.core.config import Settings
from app.providers.soccer.client import SoccerProvider


@pytest.mark.asyncio
@respx.mock
async def test_soccer_login_then_dashboard():
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test",
        soccer_oracle_username="admin",
        soccer_oracle_password="secret",
        use_provider_fixtures=False,
    )
    login = respx.post("https://soccer.test/auth/login").mock(
        return_value=httpx.Response(200, json={"access_token": "tok-123"})
    )
    day = respx.get("https://soccer.test/dashboard/day").mock(
        return_value=httpx.Response(
            200,
            json={"rows": [], "total": 0, "returned": 0},
        )
    )

    provider = SoccerProvider(settings)
    try:
        items = await provider.get_predictions(date="2026-09-20")
        assert items == []
        assert login.called
        assert day.called
        assert day.calls.last.request.headers.get("Authorization") == "Bearer tok-123"
    finally:
        await provider.aclose()


@pytest.mark.asyncio
@respx.mock
async def test_soccer_health_skips_login():
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test",
        soccer_oracle_username="admin",
        soccer_oracle_password="secret",
        use_provider_fixtures=False,
    )
    login = respx.post("https://soccer.test/auth/login").mock(
        return_value=httpx.Response(200, json={"access_token": "tok-123"})
    )
    respx.get("https://soccer.test/health").mock(
        return_value=httpx.Response(200, json={"status": "ok"})
    )
    respx.get("https://soccer.test/health/database").mock(
        return_value=httpx.Response(200, json={"status": "ok"})
    )

    provider = SoccerProvider(settings)
    try:
        health = await provider.healthcheck()
        assert health["status"] == "ok"
        assert not login.called
    finally:
        await provider.aclose()
