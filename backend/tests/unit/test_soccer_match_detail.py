"""Football event detail from the engine's match-detail responses, without the day-feed fallback."""

import httpx
import pytest
import respx

from app.core.config import Settings
from app.providers.http_utils import load_fixture
from app.providers.soccer.client import SoccerProvider

BASE = "https://soccer.test"
FIXTURE_ID = "1552176"


def _assert_detail_predictions(preds):
    assert len(preds) == 10
    assert all(p.event.id == FIXTURE_ID for p in preds)
    assert all(p.decision is not None and p.decision.code for p in preds)
    # Only the match detail carries the 1X2 board: three outcomes on h2h prove where it came from.
    h2h = next(p for p in preds if p.prediction.type == "h2h")
    assert {p.key for p in h2h.probabilities} == {"home", "draw", "away"}


@pytest.mark.asyncio
async def test_fixture_mode_detail_has_decisions_and_skips_the_day_feed(monkeypatch):
    provider = SoccerProvider(Settings(soccer_oracle_base_url=BASE, use_provider_fixtures=True))
    paths: list[str] = []
    fixture_for = provider._fixture_for

    def recording(path, params):
        paths.append(path)
        return fixture_for(path, params)

    monkeypatch.setattr(provider, "_fixture_for", recording)
    try:
        preds = await provider.get_predictions(event_id=FIXTURE_ID)
        _assert_detail_predictions(preds)

        single = await provider.get_prediction(f"soccer_{FIXTURE_ID}_dc")
        assert single is not None
        assert single.decision is not None and single.decision.code == "NO BET"
        assert single.pricing is not None and single.pricing.odds_decimal == pytest.approx(1.06)
    finally:
        await provider.aclose()

    assert f"/dashboard/match/{FIXTURE_ID}/oracle-detail" in paths
    assert "/dashboard/day" not in paths


def _live_settings() -> Settings:
    return Settings(
        soccer_oracle_base_url=BASE,
        soccer_oracle_username="admin",
        soccer_oracle_password="secret",
        use_provider_fixtures=False,
    )


def _mock_common():
    respx.post(f"{BASE}/auth/login").mock(return_value=httpx.Response(200, json={"access_token": "tok"}))
    respx.get(f"{BASE}/live/fixtures").mock(return_value=httpx.Response(200, json={"total": 0, "rows": []}))
    return respx.get(f"{BASE}/dashboard/day").mock(
        return_value=httpx.Response(200, json=load_fixture("soccer", "day.json"))
    )


@pytest.mark.asyncio
@respx.mock
async def test_oracle_detail_shape_is_enough_for_the_event_detail():
    day_route = _mock_common()
    oracle_route = respx.get(f"{BASE}/dashboard/match/{FIXTURE_ID}/oracle-detail").mock(
        return_value=httpx.Response(200, json=load_fixture("soccer", "oracle_detail.json"))
    )
    match_route = respx.get(f"{BASE}/dashboard/match/{FIXTURE_ID}").mock(
        return_value=httpx.Response(200, json=load_fixture("soccer", "match.json"))
    )

    provider = SoccerProvider(_live_settings())
    try:
        _assert_detail_predictions(await provider.get_predictions(event_id=FIXTURE_ID))
    finally:
        await provider.aclose()

    assert oracle_route.call_count == 1
    assert match_route.call_count == 0
    assert day_route.call_count == 0


@pytest.mark.asyncio
@respx.mock
async def test_match_detail_shape_when_oracle_detail_fails():
    day_route = _mock_common()
    respx.get(f"{BASE}/dashboard/match/{FIXTURE_ID}/oracle-detail").mock(
        return_value=httpx.Response(503, json={"detail": "busy"})
    )
    match_route = respx.get(f"{BASE}/dashboard/match/{FIXTURE_ID}").mock(
        return_value=httpx.Response(200, json=load_fixture("soccer", "match.json"))
    )

    provider = SoccerProvider(_live_settings())
    try:
        _assert_detail_predictions(await provider.get_predictions(event_id=FIXTURE_ID))
    finally:
        await provider.aclose()

    assert match_route.call_count == 1
    assert day_route.call_count == 0
