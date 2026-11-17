"""Soccer event detail through the client: real envelopes, no wasted day-feed call.

Upstream is mocked with respx (no network). The payloads are the engine-shaped
envelopes of `tests/fixtures/soccer/*_envelope.json`, see
`test_soccer_detail_envelopes.py` for where each field comes from in the engine.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
import pytest
import respx

from app.core.config import Settings
from app.providers.http_utils import load_fixture
from app.providers.soccer.client import SoccerProvider

BASE = "https://soccer.test"
FIXTURE_ID = "1552176"
ORACLE_URL = f"{BASE}/dashboard/match/{FIXTURE_ID}/oracle-detail"
MATCH_URL = f"{BASE}/dashboard/match/{FIXTURE_ID}"


def _settings() -> Settings:
    return Settings(
        soccer_oracle_base_url=BASE,
        soccer_oracle_username="admin",
        soccer_oracle_password="secret",
        use_provider_fixtures=False,
    )


def _today() -> str:
    return datetime.now(ZoneInfo("Europe/Rome")).date().isoformat()


def _mock_common(live_rows: list[dict] | None = None) -> respx.Route:
    respx.post(f"{BASE}/auth/login").mock(return_value=httpx.Response(200, json={"access_token": "tok"}))
    respx.get(f"{BASE}/live/fixtures").mock(
        return_value=httpx.Response(200, json={"total": len(live_rows or []), "rows": live_rows or []})
    )
    respx.get(url__regex=rf"{BASE}/live/fixtures/\d+/statistics").mock(
        return_value=httpx.Response(200, json={"fixture_id": int(FIXTURE_ID), "rows": []})
    )
    return respx.get(f"{BASE}/dashboard/day").mock(
        return_value=httpx.Response(200, json={"total": 0, "returned": 0, "rows": []})
    )


def _assert_complete(items) -> None:
    assert len(items) == 10
    assert all(p.event.id == FIXTURE_ID for p in items)
    assert all(p.decision is not None and p.decision.code for p in items)
    assert {p.provenance.decision_source for p in items} == {"provider"}


@pytest.mark.asyncio
@pytest.mark.parametrize("day", [None, "today"])
@respx.mock
async def test_oracle_detail_envelope_is_enough_no_day_feed_call(day):
    day_route = _mock_common()
    oracle = respx.get(ORACLE_URL).mock(
        return_value=httpx.Response(200, json=load_fixture("soccer", "oracle_detail_envelope.json"))
    )
    match = respx.get(MATCH_URL).mock(
        return_value=httpx.Response(200, json=load_fixture("soccer", "match_detail_envelope.json"))
    )
    filters = {"event_id": FIXTURE_ID}
    if day:
        filters["date"] = _today()

    provider = SoccerProvider(_settings())
    try:
        items = await provider.get_predictions(**filters)
        _assert_complete(items)
        dc = next(p for p in items if p.prediction.type == "dc")
        assert dc.prediction.selection.id == "1X"
        assert dc.decision.code == "NO BET"  # not the official Home/Away BORDERLINE card

        single = await provider.get_prediction(f"soccer_{FIXTURE_ID}_under_over_3_5", **filters)
        assert single is not None
        assert single.decision is not None and single.decision.code == "BORDERLINE"
        assert single.provenance.decision_source == "provider"
    finally:
        await provider.aclose()

    assert oracle.call_count == 2
    assert match.call_count == 0
    assert day_route.call_count == 0


@pytest.mark.asyncio
@respx.mock
async def test_match_detail_envelope_after_oracle_failure_no_day_feed_call():
    day_route = _mock_common()
    respx.get(ORACLE_URL).mock(return_value=httpx.Response(500, json={"detail": "boom"}))
    match = respx.get(MATCH_URL).mock(
        return_value=httpx.Response(200, json=load_fixture("soccer", "match_detail_envelope.json"))
    )

    provider = SoccerProvider(_settings())
    try:
        items = await provider.get_predictions(event_id=FIXTURE_ID)
    finally:
        await provider.aclose()

    _assert_complete(items)
    assert match.call_count == 1
    assert day_route.call_count == 0


@pytest.mark.asyncio
@pytest.mark.parametrize("with_snapshot", [True, False])
@respx.mock
async def test_live_state_reaches_the_oracle_detail_row(with_snapshot):
    """The live merge reads the nested row: its fixture_id and its own 2H status."""
    snapshot = {"fixture_id": int(FIXTURE_ID), "status": "2H", "elapsed_minute": 63, "home_goals": 2, "away_goals": 0}
    _mock_common(live_rows=[snapshot] if with_snapshot else [])
    payload = load_fixture("soccer", "oracle_detail_envelope.json")
    payload["overview"]["fixture"].update(status="2H", phase="live", score={"home": 1, "away": 0})
    respx.get(ORACLE_URL).mock(return_value=httpx.Response(200, json=payload))

    provider = SoccerProvider(_settings())
    try:
        items = await provider.get_predictions(event_id=FIXTURE_ID, date=_today())
    finally:
        await provider.aclose()

    assert items
    event = items[0].event
    assert event.status == "live"
    assert event.live is not None and event.live.is_live is True
    if with_snapshot:
        assert event.live.minute == 63
        assert event.score is not None and event.score.display == "2-0"
    else:
        assert event.score is not None and event.score.display == "1-0"


@pytest.mark.asyncio
@respx.mock
async def test_empty_oracle_detail_still_falls_back_to_the_day_feed():
    """`fixture_not_found`: the detail has nothing, the day feed is still asked."""
    day_route = _mock_common()
    payload = load_fixture("soccer", "oracle_detail_envelope.json")
    payload["overview"]["fixture"] = None
    payload["probabilities"] = []
    payload["warnings"] = ["fixture_not_found"]
    respx.get(ORACLE_URL).mock(return_value=httpx.Response(200, json=payload))

    provider = SoccerProvider(_settings())
    try:
        items = await provider.get_predictions(event_id=FIXTURE_ID, date=_today())
    finally:
        await provider.aclose()

    assert items == []
    assert day_route.call_count >= 1
