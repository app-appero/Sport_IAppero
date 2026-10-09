import httpx
import pytest
import respx

from app.core.config import Settings
from app.core.exceptions import ProviderResponseError
from app.providers.soccer.client import SoccerProvider


@pytest.mark.asyncio
@respx.mock
async def test_soccer_login_bearer_then_dashboard():
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
async def test_soccer_login_session_cookie():
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test",
        soccer_oracle_username="admin",
        soccer_oracle_password="secret",
        use_provider_fixtures=False,
    )
    login = respx.post("https://soccer.test/auth/login").mock(
        return_value=httpx.Response(
            200,
            json={"ok": True, "user": {"username": "admin"}},
            headers={"set-cookie": "session=abc123; Path=/; HttpOnly"},
        )
    )
    day = respx.get("https://soccer.test/dashboard/day").mock(
        return_value=httpx.Response(200, json={"rows": [], "total": 0, "returned": 0})
    )

    provider = SoccerProvider(settings)
    try:
        await provider.get_predictions()
        assert login.called
        assert day.called
        assert provider._token == "cookie-session"
        # No bearer when session cookie auth is used
        assert "Authorization" not in day.calls.last.request.headers
    finally:
        await provider.aclose()


@pytest.mark.asyncio
@respx.mock
async def test_soccer_missing_credentials_is_unauthorized():
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test",
        use_provider_fixtures=False,
    )
    provider = SoccerProvider(settings)
    try:
        with pytest.raises(ProviderResponseError) as exc:
            await provider.get_predictions()
        assert exc.value.status_code == 401
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
