from app.providers.http_utils import load_fixture
from app.providers.tennis import mapper


def test_day_feed_recovers_play_borderline_and_no_bet():
    """The tennis day route has no value_decision. Odds + model probability are enough."""
    payload = load_fixture("tennis", "predictions.json")
    predictions = mapper.map_predictions_payload(payload)
    first = [p for p in predictions if p.event.id == "12168292"]
    by_type = {p.prediction.type: p.decision.code if p.decision else None for p in first}
    assert by_type["match_winner"] == "PLAY"
    assert by_type["first_set_winner"] == "PLAY"
    assert by_type["over_under_games"] == "NO BET"

    # Quote below void odds (second fixture, match winner) is No bet, not missing.
    second = next(
        p for p in predictions if p.event.id == "12169224" and p.prediction.type == "match_winner"
    )
    assert second.decision is not None
    assert second.decision.code == "NO BET"


def test_value_decision_label_wins_over_the_odds_rule():
    event_row = {
        "event_key": 1,
        "event_first_player": "A",
        "event_second_player": "B",
        "value_decision": "BORDERLINE",
        "prediction": {
            "prob_player_1_win": 0.6,
            "predicted_winner": "First Player",
            "predicted_winner_odds": 3.0,
            "confidence": 0.6,
        },
        "extra_markets": [
            {
                "market": "over_under_games",
                "selection": "Over 22.5",
                "probability": 0.55,
                "odds": 1.2,
                "void_odds": 1.8,
                "value_decision": "PLAY",
            }
        ],
    }
    predictions = mapper.map_predictions_payload([event_row])
    by_type = {p.prediction.type: p.decision.code for p in predictions}
    assert by_type["match_winner"] == "BORDERLINE"
    assert by_type["over_under_games"] == "PLAY"


def test_missing_odds_leave_the_decision_empty():
    predictions = mapper.map_predictions_payload(
        [
            {
                "event_key": 2,
                "event_first_player": "A",
                "event_second_player": "B",
                "prediction": {
                    "prob_player_1_win": 0.6,
                    "predicted_winner": "First Player",
                    "confidence": 0.6,
                },
            }
        ]
    )
    assert len(predictions) == 1
    assert predictions[0].decision is None


def test_borderline_sits_between_void_odds_and_the_play_threshold():
    # void 2.00, play threshold 2.04: 2.02 is value, but not enough margin.
    decision = mapper._classify_value_decision(2.02, 2.0)
    assert decision is not None
    assert decision.code == "BORDERLINE"


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
    assert by_type["over_under_games"].correct is None  # 15 games, Under 22.5 still open


def test_live_games_line_locks_only_when_the_total_is_already_past_it():
    raw = _live_raw()
    raw["prediction"] = {
        "prob_player_1_win": 0.7,
        "predicted_winner": "First Player",
        "confidence": 0.7,
        "model_version": "v4",
    }
    raw["extra_markets"] = [
        {"market": "over_under_games", "selection": "Over 12.5", "probability": 0.6},
        {"market": "over_under_games", "selection": "Under 12.5", "probability": 0.4},
    ]
    preds = mapper.map_predictions_payload({"items": [raw]})
    # Both rows share the market key; the payload keeps them in order.
    over, under = preds[1], preds[2]
    assert over.prediction.selection.name == "Over 12.5"
    assert over.correct is True  # 6-4 3-2 is already 15 games
    assert under.correct is False
    assert preds[0].correct is None


def test_not_live_match_keeps_provider_status_and_has_no_live_state():
    event = mapper.map_event(_live_raw(event_live="0", event_status="Finished"))
    assert event.live is None
    assert event.status == "Finished"


def test_tennis_local_time_is_kept_for_ordering_without_inventing_a_timezone():
    event = mapper.map_event(_live_raw(event_time="04:00:00", event_live="0"))
    assert event.local_time == "04:00"
    assert event.start_time is None  # still no confirmed timezone upstream
    assert mapper.map_event(_live_raw(event_live="0")).local_time is None
