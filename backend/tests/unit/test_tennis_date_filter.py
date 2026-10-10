import asyncio
from datetime import date

from app.core.config import Settings
from app.providers.tennis import client as tennis_client
from app.providers.tennis.client import TennisProvider, tennis_status_for_day


def test_tennis_status_for_day_past_today_future():
    today = date(2026, 10, 10)
    assert tennis_status_for_day("2026-10-09", today=today) == "played"
    assert tennis_status_for_day("2026-10-10", today=today) == "all"
    assert tennis_status_for_day("2026-10-11", today=today) == "upcoming"


def test_tennis_filters_predictions_by_calendar_date(monkeypatch):
    settings = Settings(use_provider_fixtures=True)
    provider = TennisProvider(settings)

    async def fake_get(path: str, params=None):
        assert path.startswith("/api/next-fixtures/predictions")
        assert params["from"] == "2026-10-08"
        assert params["to"] == "2026-10-08"
        assert params["status"] in {"played", "all", "upcoming"}
        assert params["limit"] == tennis_client._TENNIS_PAGE_SIZE
        assert params["offset"] == 0
        return {
            "total": 2,
            "items": [
                {
                    "event_key": 1,
                    "event_date": "2026-10-08",
                    "event_first_player": "A",
                    "event_second_player": "B",
                    "tournament_name": "X",
                    "prediction": {
                        "predicted_winner": "First Player",
                        "prob_player_1_win": 0.6,
                        "confidence": 0.6,
                        "is_correct": True,
                    },
                },
                {
                    "event_key": 2,
                    "event_date": "2026-10-09",
                    "event_first_player": "C",
                    "event_second_player": "D",
                    "tournament_name": "Y",
                    "prediction": {
                        "predicted_winner": "First Player",
                        "prob_player_1_win": 0.7,
                        "confidence": 0.7,
                    },
                },
            ],
        }

    monkeypatch.setattr(provider, "_get", fake_get)

    async def _run():
        try:
            return await provider.get_predictions(date="2026-10-08")
        finally:
            await provider.aclose()

    preds = asyncio.run(_run())
    assert len(preds) == 1
    assert preds[0].event.id == "1"
    assert preds[0].event.calendar_date == "2026-10-08"
    assert preds[0].correct is True


def test_tennis_past_day_requests_played_status(monkeypatch):
    settings = Settings(use_provider_fixtures=True)
    provider = TennisProvider(settings)
    captured: dict = {}

    async def fake_get(path: str, params=None):
        captured.update(params or {})
        return {"items": [], "total": 0}

    monkeypatch.setattr(provider, "_get", fake_get)
    monkeypatch.setattr(
        "app.providers.tennis.client.tennis_status_for_day",
        lambda day, today=None: "played",
    )

    async def _run():
        try:
            return await provider.get_predictions(date="2026-10-09")
        finally:
            await provider.aclose()

    asyncio.run(_run())
    assert captured["status"] == "played"
    assert captured["from"] == "2026-10-09"
    assert captured["to"] == "2026-10-09"
    assert captured["offset"] == 0


def test_tennis_paginates_beyond_default_page(monkeypatch):
    monkeypatch.setattr(tennis_client, "_TENNIS_PAGE_SIZE", 2)
    settings = Settings(use_provider_fixtures=True, provider_max_items=1000)
    provider = TennisProvider(settings)
    calls: list[int] = []

    async def fake_get(path: str, params=None):
        offset = int((params or {}).get("offset") or 0)
        calls.append(offset)
        if offset == 0:
            return {
                "total": 3,
                "items": [
                    {
                        "event_key": 1,
                        "event_date": "2026-10-10",
                        "event_first_player": "A",
                        "event_second_player": "B",
                        "prediction": {
                            "predicted_winner": "First Player",
                            "prob_player_1_win": 0.6,
                            "confidence": 0.6,
                        },
                    },
                    {
                        "event_key": 2,
                        "event_date": "2026-10-10",
                        "event_first_player": "C",
                        "event_second_player": "D",
                        "prediction": {
                            "predicted_winner": "First Player",
                            "prob_player_1_win": 0.55,
                            "confidence": 0.55,
                        },
                    },
                ],
            }
        return {
            "total": 3,
            "items": [
                {
                    "event_key": 3,
                    "event_date": "2026-10-10",
                    "event_first_player": "E",
                    "event_second_player": "F",
                    "prediction": {
                        "predicted_winner": "Second Player",
                        "prob_player_1_win": 0.4,
                        "confidence": 0.6,
                    },
                }
            ],
        }

    monkeypatch.setattr(provider, "_get", fake_get)

    async def _run():
        try:
            return await provider.get_predictions(date="2026-10-10")
        finally:
            await provider.aclose()

    preds = asyncio.run(_run())
    assert calls == [0, 2]
    assert len({p.event.id for p in preds}) == 3
