"""Soccer day window: Rome calendar filter + neighbour UTC fetch."""

import httpx
import pytest
import respx

from app.core.config import Settings
from app.providers.soccer.client import SoccerProvider


@pytest.mark.asyncio
async def test_fixture_mode_filters_by_calendar_day():
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test",
        use_provider_fixtures=True,
    )
    provider = SoccerProvider(settings)
    try:
        # Fixture day.json is 2026-09-20 — other days must be empty.
        empty = await provider.get_predictions(date="2026-10-08")
        assert empty == []
        hits = await provider.get_predictions(date="2026-09-20", limit=50)
        assert len(hits) > 0
        assert all(
            (p.event.calendar_date == "2026-09-20")
            or (
                p.event.start_time is not None
                and p.event.start_time.date().isoformat() == "2026-09-20"
            )
            for p in hits
        )
    finally:
        await provider.aclose()


@pytest.mark.asyncio
@respx.mock
async def test_neighbour_utc_days_merged_then_rome_filtered():
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test",
        soccer_oracle_username="admin",
        soccer_oracle_password="secret",
        use_provider_fixtures=False,
    )
    respx.post("https://soccer.test/auth/login").mock(
        return_value=httpx.Response(200, json={"access_token": "tok"})
    )

    def day_response(request: httpx.Request) -> httpx.Response:
        target = request.url.params.get("target_date")
        # Kickoff 2026-10-08T22:30:00Z = 2026-10-09 00:30 Europe/Rome
        if target == "2026-10-08":
            return httpx.Response(
                200,
                json={
                    "total": 1,
                    "returned": 1,
                    "rows": [
                        {
                            "fixture_id": 999001,
                            "date": "2026-10-08",
                            "datetime": "2026-10-08T22:30:00+00:00",
                            "home": "Late",
                            "away": "Kickoff",
                            "league": "Test",
                            "status": "FT",
                            "phase": "finished",
                            "score": {"home": 2, "away": 1},
                            "decision_cards": [
                                {
                                    "market": "under_over_1_5",
                                    "pick": "OVER 1.5",
                                    "outcome": "over",
                                    "predicted_probability": 0.8,
                                }
                            ],
                            "predictions": {
                                "under_over_1_5": {
                                    "prediction": 1,
                                    "probability": 0.8,
                                    "correct": True,
                                }
                            },
                        }
                    ],
                },
            )
        return httpx.Response(200, json={"total": 0, "returned": 0, "rows": []})

    respx.get("https://soccer.test/dashboard/day").mock(side_effect=day_response)

    provider = SoccerProvider(settings)
    try:
        # Asking Rome calendar day 2026-10-09 should recover the late UTC Oct 8 kickoff.
        items = await provider.get_predictions(date="2026-10-09")
        assert len(items) >= 1
        assert any("Late" in (p.event.name or "") for p in items)
        # Same fixture must not appear under Rome Oct 8 after local filter.
        oct8 = await provider.get_predictions(date="2026-10-08")
        assert all("Late" not in (p.event.name or "") for p in oct8)
    finally:
        await provider.aclose()


@pytest.mark.asyncio
@respx.mock
async def test_past_day_event_uses_day_feed_not_match_detail():
    """Past calendar days must not wait on match/oracle-detail timeouts."""
    settings = Settings(
        soccer_oracle_base_url="https://soccer.test",
        soccer_oracle_username="admin",
        soccer_oracle_password="secret",
        use_provider_fixtures=False,
    )
    respx.post("https://soccer.test/auth/login").mock(
        return_value=httpx.Response(200, json={"access_token": "tok"})
    )
    match_route = respx.get(
        url__regex=r"https://soccer\.test/dashboard/match/555/.*"
    ).mock(return_value=httpx.Response(404, json={"detail": "gone"}))

    def day_response(request: httpx.Request) -> httpx.Response:
        target = request.url.params.get("target_date")
        if target != "2020-01-15":
            return httpx.Response(200, json={"total": 0, "returned": 0, "rows": []})
        return httpx.Response(
            200,
            json={
                "total": 1,
                "returned": 1,
                "rows": [
                    {
                        "fixture_id": 555,
                        "date": "2020-01-15",
                        "datetime": "2020-01-15T18:00:00+00:00",
                        "home": "Past",
                        "away": "Side",
                        "league": "Test",
                        "status": "FT",
                        "phase": "finished",
                        "score": {"home": 1, "away": 0},
                        "predictions": {
                            "h2h": {
                                "prediction": 1,
                                "probability": 0.61,
                                "correct": True,
                            }
                        },
                    }
                ],
            },
        )

    respx.get("https://soccer.test/dashboard/day").mock(side_effect=day_response)

    provider = SoccerProvider(settings)
    try:
        items = await provider.get_predictions(
            event_id="555", date="2020-01-15", market="h2h"
        )
        assert len(items) == 1
        assert items[0].event.id == "555"
        assert match_route.call_count == 0

        single = await provider.get_prediction(
            items[0].id, date="2020-01-15"
        )
        assert single is not None
        assert single.id == items[0].id
        assert match_route.call_count == 0
    finally:
        await provider.aclose()
