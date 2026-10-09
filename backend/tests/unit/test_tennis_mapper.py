from app.providers.http_utils import load_fixture
from app.providers.tennis import mapper


def test_map_predictions_payload():
    payload = load_fixture("tennis", "predictions.json")
    predictions = mapper.map_predictions_payload(payload)

    assert len(predictions) >= 3
    assert all(p.sport == "tennis" for p in predictions)
    assert all(p.provider.name == "tennis-oracle" for p in predictions)

    match = next(p for p in predictions if p.prediction.type == "match_winner")
    assert match.id.startswith("tennis_")
    assert match.id.endswith("_match_winner")
    assert match.prediction.selection.name
    assert match.prediction.confidence is not None
    assert {p.key for p in match.probabilities} == {"player_1", "player_2"}

    extras = {p.prediction.type for p in predictions}
    assert "first_set_winner" in extras or "over_under_games" in extras


def test_competitions_from_events():
    events = mapper.map_events(load_fixture("tennis", "fixtures.json"))
    competitions = mapper.map_competitions_from_events(events)
    assert len(competitions) >= 1
    assert any(c.name for c in competitions)


def test_parse_prediction_id():
    assert mapper.parse_prediction_id("tennis_12168292_match_winner") == (
        "12168292",
        "match_winner",
    )
    assert mapper.parse_prediction_id("tennis_12168292_first_set_winner") == (
        "12168292",
        "first_set_winner",
    )


def test_naive_event_date_time_does_not_become_start_time():
    """D05: bare event_date+event_time must not invent a timezone."""
    events = mapper.map_events(
        [
            {
                "event_key": "tz-naive-1",
                "event_first_player": "A",
                "event_second_player": "B",
                "event_date": "2026-10-08",
                "event_time": "04:00:00",
                "tournament_name": "Test Open",
            }
        ]
    )
    assert len(events) == 1
    assert events[0].start_time is None


def test_aware_start_time_preserved():
    events = mapper.map_events(
        [
            {
                "event_key": "tz-aware-1",
                "event_first_player": "A",
                "event_second_player": "B",
                "start_time": "2026-10-08T12:00:00+00:00",
            }
        ]
    )
    assert events[0].start_time is not None
    assert events[0].start_time.tzinfo is not None
