import json

import httpx
import pytest
import respx

from app.core.config import Settings
from app.providers.tennis.client import TennisProvider


@pytest.mark.asyncio
@respx.mock
async def test_start_refresh_always_reruns_and_keeps_slips_frozen_by_default():
    """The engine answers 409 "already completed today" unless force=true: the manual button must rerun."""
    settings = Settings(tennis_oracle_base_url="https://tennis.test", use_provider_fixtures=False)
    route = respx.post("https://tennis.test/api/global-update").mock(
        return_value=httpx.Response(200, json={"run_id": 7, "status": "pending", "message": "ok"})
    )
    provider = TennisProvider(settings)
    try:
        result = await provider.start_refresh()
    finally:
        await provider.aclose()
    assert result["ref"] == "7"
    assert json.loads(route.calls.last.request.content) == {"force": True, "force_outside_hours": False}
