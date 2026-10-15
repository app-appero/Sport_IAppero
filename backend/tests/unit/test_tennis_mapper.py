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
    assert events[0].calendar_date == "2026-10-08"


def test_played_match_settles_extra_markets():
    payload = load_fixture("tennis", "predictions_played_settlement.json")
    predictions = mapper.map_predictions_payload(payload)
    by_type = {p.prediction.type: p for p in predictions}

    assert by_type["match_winner"].correct is True
    assert by_type["first_set_winner"].correct is False
    assert by_type["over_under_games"].correct is True

    event = by_type["match_winner"].event
    assert event.score is not None
    assert event.score.home == 0
    assert event.score.away == 2
    assert event.actual_totals is not None
    assert event.actual_totals.get("total_games") == 23
    assert event.actual_totals.get("first_set_winner") == "player_2"


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


def _live_raw(**over):
    raw = {
        "event_key": 777, "event_date": "2026-10-13", "event_first_player": "A. Rossi",
        "event_second_player": "B. Neri", "tournament_name": "Paris", "event_status": "Set 2",
        "event_live": "1",
        "live_score": {
            "sets": [{"score_first": "6", "score_second": "4", "score_set": "1"},
                     {"score_first": "3", "score_second": "2", "score_set": "2"}],
            "current_game": "30 - 15", "server": "First Player", "final_result": "1 - 0", "status": "Set 2",
        },
    }
    raw.update(over)
    return raw


def test_live_match_exposes_sets_current_game_and_server():
    event = mapper.map_event(_live_raw())
    assert event.status == "live"
    assert event.live is not None
    assert event.live.sets == [[6, 4], [3, 2]]
    assert event.live.current_game == "30 - 15"
    assert event.live.server == "home"
    assert event.live.status_detail == "Set 2"
    assert event.score is not None and event.score.display == "1 - 0"


def test_tiebreak_tokens_count_games_and_placeholder_game_is_dropped():
    raw = _live_raw()
    raw["live_score"]["sets"] = [{"score_first": "7.7", "score_second": "6.4", "score_set": "1"}]
    raw["live_score"]["current_game"] = "0 - 0"
    raw["live_score"]["server"] = "Second Player"
    event = mapper.map_event(raw)
    assert event.live.sets == [[7, 6]]
    assert event.live.current_game is None
    assert event.live.server == "away"


def test_live_match_does_not_settle_from_the_partial_score():
    """1-0 in sets at 3-2 in the second set is not a result, even if the provider says is_correct."""
    raw = _live_raw()
    raw["prediction"] = {
        "prob_player_1_win": 0.7,
        "predicted_winner": "First Player",
        "confidence": 0.7,
        "is_correct": True,
        "model_version": "v4",
    }
    raw["extra_markets"] = [
        {"market": "first_set_winner", "selection": "First Player", "probability": 0.6},
        {"market": "over_under_games", "selection": "Under 22.5", "probability": 0.55},
    ]
    by_type = {p.prediction.type: p for p in mapper.map_predictions_payload({"items": [raw]})}
    assert by_type["match_winner"].event.status == "live"
    assert by_type["match_winner"].event.live is not None
    assert by_type["match_winner"].correct is None
    assert by_type["first_set_winner"].correct is None
    assert by_type["over_under_games"].correct is None


def test_not_live_match_keeps_provider_status_and_has_no_live_state():
    event = mapper.map_event(_live_raw(event_live="0", event_status="Finished"))
    assert event.live is None
    assert event.status == "Finished"


def test_tennis_local_time_is_kept_for_ordering_without_inventing_a_timezone():
    event = mapper.map_event(_live_raw(event_time="04:00:00", event_live="0"))
    assert event.local_time == "04:00"
    assert event.start_time is None  # still no confirmed timezone upstream
    assert mapper.map_event(_live_raw(event_live="0")).local_time is None
