import asyncio

from app.core.config import Settings
from app.providers.tennis.client import TennisProvider


def test_tennis_filters_predictions_by_calendar_date(monkeypatch):
    settings = Settings(use_provider_fixtures=True)
    provider = TennisProvider(settings)

    async def fake_get(path: str, params=None):
        assert path.startswith("/api/next-fixtures/predictions")
        assert params == {"from": "2026-10-08", "to": "2026-10-08"}
        return {
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
            ]
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
