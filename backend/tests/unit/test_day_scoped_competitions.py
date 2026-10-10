"""Competitions chips must only list tournaments/leagues with day matches."""

import asyncio

from app.core.config import Settings
from app.providers.tennis.client import TennisProvider


def test_tennis_competitions_only_from_requested_day(monkeypatch):
    settings = Settings(use_provider_fixtures=True)
    provider = TennisProvider(settings)

    async def fake_get(path: str, params=None):
        assert path.startswith("/api/next-fixtures/predictions")
        assert params["from"] == "2026-10-09"
        assert params["to"] == "2026-10-09"
        assert params["status"] == "played" or params.get("status") in {
            "played",
            "all",
            "upcoming",
        }
        return {
            "items": [
                {
                    "event_key": 1,
                    "event_date": "2026-10-09",
                    "event_first_player": "A",
                    "event_second_player": "B",
                    "tournament_name": "Shanghai",
                    "tournament_key": "sha",
                    "prediction": {
                        "predicted_winner": "First Player",
                        "prob_player_1_win": 0.6,
                        "confidence": 0.6,
                    },
                },
                {
                    "event_key": 2,
                    "event_date": "2026-10-09",
                    "event_first_player": "C",
                    "event_second_player": "D",
                    "tournament_name": "Shanghai",
                    "tournament_key": "sha",
                    "prediction": {
                        "predicted_winner": "First Player",
                        "prob_player_1_win": 0.7,
                        "confidence": 0.7,
                    },
                },
                {
                    "event_key": 3,
                    "event_date": "2026-10-09",
                    "event_first_player": "E",
                    "event_second_player": "F",
                    "tournament_name": "W35 Lagos",
                    "tournament_key": "lag",
                    "prediction": {
                        "predicted_winner": "Second Player",
                        "prob_player_1_win": 0.4,
                        "confidence": 0.6,
                    },
                },
            ]
        }

    monkeypatch.setattr(provider, "_get", fake_get)
    monkeypatch.setattr(
        "app.providers.tennis.client.tennis_status_for_day",
        lambda day, today=None: "played",
    )

    async def _run():
        try:
            return await provider.get_competitions(date="2026-10-09")
        finally:
            await provider.aclose()

    comps = asyncio.run(_run())
    names = sorted(c.name for c in comps)
    assert names == ["Shanghai", "W35 Lagos"]
    # Must not invent tournaments that only appear in the upcoming bag.
    assert "Wuhan" not in names
    assert "Suzhou" not in names
