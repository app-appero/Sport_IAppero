import httpx
import pytest
import respx

from app.core.config import Settings
from app.providers.soccer.client import SoccerProvider


@pytest.mark.asyncio
@respx.mock
async def test_refresh_event_posts_to_the_single_fixture_route():
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test", use_provider_fixtures=False,
        soccer_oracle_username="u", soccer_oracle_password="p",
    )
    respx.post("https://soccer.test/auth/login").mock(
        return_value=httpx.Response(200, json={"access_token": "tok", "token_type": "bearer"})
    )
    route = respx.post("https://soccer.test/dashboard/matches/555/refresh").mock(
        return_value=httpx.Response(
            200, json={"found": True, "import": {"fixtures_seen": 1, "updated": 1}, "errors": {"scorers": "x"}}
        )
    )
    provider = SoccerProvider(settings)
    try:
        result = await provider.refresh_event("555")
    finally:
        await provider.aclose()
    assert route.called
    assert result["errors"] == {"scorers": "x"}
    assert result["detail"]["fixtures_seen"] == 1
