import pytest

from app.domain.models import Event, EventScore, Selection
from app.providers.http_utils import load_fixture
from app.providers.soccer import mapper


def test_map_day_payload_all_markets_and_naming():
    payload = load_fixture("soccer", "day.json")
    predictions = mapper.map_day_payload(payload)

    assert len(predictions) >= 10
    assert all(p.sport == "football" for p in predictions)
    assert all(p.provider.name == "soccer-oracle" for p in predictions)

    markets = {p.prediction.type for p in predictions}
    assert "h2h" in markets
    assert "under_over_2_5" in markets
    assert "goal_no_goal" in markets

    h2h = next(p for p in predictions if p.event.id == "1552176" and p.prediction.type == "h2h")
    assert h2h.id == "soccer_1552176_h2h"
    assert h2h.event.name == "Feyenoord vs Utrecht"
    assert h2h.prediction.selection.id == "home"
    assert h2h.prediction.selection.name == "Feyenoord"
    assert h2h.prediction.confidence is not None
    assert 0 < h2h.prediction.confidence <= 1
    assert h2h.event.score is not None
    assert h2h.event.score.display == "5-0"
    assert h2h.event.actual_totals is not None
    assert h2h.event.actual_totals.get("cards") == 4
    assert h2h.correct is True


def test_parse_prediction_id():
    assert mapper.parse_prediction_id("soccer_1552176_h2h") == ("1552176", "h2h")
    assert mapper.parse_prediction_id("soccer_1552176_under_over_2_5") == (
        "1552176",
        "under_over_2_5",
    )
    assert mapper.parse_prediction_id("tennis_1_match_winner") is None


def test_map_markets():
    markets = mapper.map_markets(load_fixture("soccer", "markets.json"))
    keys = {m.key for m in markets}
    assert "h2h" in keys
    assert "under_over_2_5" in keys
    assert all(m.sport == "football" for m in markets)


def test_settle_overrides_wrong_provider_correct_flags():
    """X2 must hit on 2-2; DRAW must miss on 1-2 — ignore bad upstream flags."""
    draw_event = Event(
        id="e1",
        name="A vs B",
        score=EventScore(home=2, away=2, display="2-2"),
        status="FT",
    )
    away_event = Event(
        id="e2",
        name="C vs D",
        score=EventScore(home=1, away=2, display="1-2"),
        status="FT",
    )

    x2 = mapper.map_market_prediction(
        "dc",
        {"prediction": 0, "probability": 0.4, "correct": False},
        draw_event,
    )
    assert x2.prediction.selection.name == "X2"
    assert x2.correct is True

    draw_miss = mapper.map_market_prediction(
        "h2h",
        {"prediction": 0, "probability": 0.2, "correct": True},
        away_event,
    )
    assert draw_miss.prediction.selection.id == "draw"
    assert draw_miss.prediction.selection.name == "Pareggio"
    assert draw_miss.correct is False

    draw_hit = mapper.map_market_prediction(
        "h2h",
        {"prediction": "X", "probability": 0.2, "correct": False},
        draw_event,
    )
    assert draw_hit.prediction.selection.name == "Pareggio"
    assert draw_hit.correct is True


def test_match_detail_1x2_board_enriches_h2h_and_dc():
    payload = load_fixture("soccer", "oracle_detail.json")
    preds = mapper.map_day_payload({"rows": [payload]})
    by_type = {p.prediction.type: p for p in preds}

    assert "1x2" not in by_type  # folded into h2h/dc
    h2h = by_type["h2h"]
    assert {p.key for p in h2h.probabilities} == {"home", "draw", "away"}
    assert abs(sum(p.value for p in h2h.probabilities) - 1.0) < 1e-6
    draw = next(p for p in h2h.probabilities if p.key == "draw")
    assert draw.label == "Pareggio"
    assert draw.value == pytest.approx(0.11)

    dc = by_type["dc"]
    assert {p.key for p in dc.probabilities} == {"1X", "X2", "12"}
    one_x = next(p for p in dc.probabilities if p.key == "1X")
    assert one_x.value == pytest.approx(0.62 + 0.11)

    # Binary markets expose both sides.
    ou = by_type["under_over_3_5"]
    assert {p.key for p in ou.probabilities} == {"over", "under"}
    assert ou.prediction.selection.id == "under"
    assert ou.pricing is not None
    assert ou.pricing.expected_value == pytest.approx(0.12400686347473755)
    assert ou.decision is not None
    assert ou.decision.code == "BORDERLINE"


def test_day_feed_keeps_provider_decision_labels():
    """Football already sends PLAY / BORDERLINE / NO BET on decision_cards.
    SENZA QUOTA is a real provider label and stays out of those three."""
    preds = mapper.map_day_payload(load_fixture("soccer", "day.json"))
    codes = {p.decision.code for p in preds if p.decision and p.decision.code}
    assert "BORDERLINE" in codes
    assert "NO BET" in codes
    assert "SENZA QUOTA" in codes
    assert all(p.decision is not None and p.decision.code for p in preds)


def test_day_feed_without_1x2_keeps_legacy_h2h_dc():
    """Day list still binary — no invented 3-way board."""
    payload = load_fixture("soccer", "day.json")
    preds = mapper.map_day_payload(payload)
    h2h = next(p for p in preds if p.event.id == "1552176" and p.prediction.type == "h2h")
    assert len(h2h.probabilities) == 1
    assert h2h.probabilities[0].key == "home"


def test_binary_confidence_uses_one_minus_p_for_class_zero():
    """cards/OU/GNG: probability is P(class 1); Under/NoGoal must show 1-p."""
    event = Event(id="e", name="A vs B")

    under_cards = mapper.map_market_prediction(
        "cards_line_4_5",
        {
            "prediction": 0,
            "probability": 0.05,
            "line_market_signal": {"signal": True, "direction": "under"},
        },
        event,
    )
    assert under_cards.prediction.selection.id == "under"
    assert under_cards.prediction.confidence == pytest.approx(0.95)

    under_ou = mapper.map_market_prediction(
        "under_over_3_5",
        {"prediction": 0, "probability": 0.40685653642494063},
        event,
    )
    assert under_ou.prediction.selection.id == "under"
    assert under_ou.prediction.confidence == pytest.approx(1.0 - 0.40685653642494063)

    over = mapper.map_market_prediction(
        "under_over_2_5",
        {"prediction": 1, "probability": 0.74},
        event,
    )
    assert over.prediction.selection.id == "over"
    assert over.prediction.confidence == pytest.approx(0.74)

    # h2h is multi-way: draw at 11% stays 11% (do not flip).
    draw = mapper.map_market_prediction(
        "h2h",
        {"prediction": 0, "probability": 0.11},
        event,
    )
    assert draw.prediction.selection.id == "draw"
    assert draw.prediction.confidence == pytest.approx(0.11)


def test_settle_soccer_market_helpers():
    event = Event(id="e", name="A vs B", score=EventScore(home=2, away=2, display="2-2"))
    assert (
        mapper._settle_soccer_market("dc", Selection(id="X2", name="X2"), event) is True
    )
    assert (
        mapper._settle_soccer_market("h2h", Selection(id="draw", name="Pareggio"), event)
        is True
    )
    miss = Event(id="e", name="A vs B", score=EventScore(home=1, away=2, display="1-2"))
    assert (
        mapper._settle_soccer_market("h2h", Selection(id="draw", name="Draw"), miss)
        is False
    )


def _live_row() -> dict:
    return {
        "fixture_id": 42,
        "date": "2026-10-15",
        "datetime": "2026-10-15T18:00:00+00:00",
        "home": "Milan",
        "away": "Inter",
        "league": "Serie A",
        "status": "1H",
        "phase": "live",
        "score": {"home": 0, "away": 0},
        "predictions": {
            "h2h": {"prediction": 1, "probability": 0.62, "correct": True},
            "under_over_2_5": {"prediction": 0, "probability": 0.58, "correct": True},
        },
    }


def test_live_snapshot_sets_minute_score_and_does_not_settle():
    row = mapper.attach_live_row(
        _live_row(),
        {
            "fixture_id": 42,
            "status": "2H",
            "elapsed_minute": 63,
            "elapsed_extra": None,
            "home_goals": 1,
            "away_goals": 0,
        },
    )
    preds = mapper.map_day_payload({"rows": [row]})
    assert preds
    event = preds[0].event
    assert event.status == "live"
    assert event.live is not None and event.live.is_live
    assert event.live.minute == 63
    assert event.score is not None and event.score.display == "1-0"
    assert all(p.correct is None for p in preds)


def test_halftime_and_stoppage_use_a_short_label_instead_of_a_misleading_minute():
    half = mapper.attach_live_row(
        _live_row(),
        {"fixture_id": 42, "status": "HT", "elapsed_minute": 45, "home_goals": 1, "away_goals": 1},
    )
    event = mapper.map_event(half)
    assert event.live is not None
    assert event.live.minute is None
    assert event.live.status_detail == "Intervallo"

    added = mapper.attach_live_row(
        _live_row(),
        {"fixture_id": 42, "status": "2H", "elapsed_minute": 90, "elapsed_extra": 3, "home_goals": 2, "away_goals": 2},
    )
    event = mapper.map_event(added)
    assert event.live is not None
    assert event.live.minute is None
    assert event.live.status_detail == "90+3'"


def test_live_over_already_hit_is_green_and_busted_under_is_red():
    row = _live_row()
    row["score"] = {"home": 2, "away": 1}
    row["predictions"] = {
        "h2h": {"prediction": 1, "probability": 0.62, "correct": True},
        "under_over_2_5": {"prediction": 1, "probability": 0.7},
        "under_over_3_5": {"prediction": 0, "probability": 0.55},
        "cards_line_3_5": {"prediction": 1, "probability": 0.6},
        "cards_line_4_5": {"prediction": 0, "probability": 0.52},
    }
    row["actual_totals"] = {"cards": 5}
    preds = {p.prediction.type: p for p in mapper.map_day_payload({"rows": [mapper.attach_live_row(row, None)]})}
    assert preds["h2h"].correct is None
    assert preds["under_over_2_5"].correct is True  # 3 goals, Over 2.5 already won
    assert preds["under_over_3_5"].correct is None  # Under 3.5 still alive at 3
    assert preds["cards_line_3_5"].correct is True  # 5 cards, Over 3.5 already won
    assert preds["cards_line_4_5"].correct is False  # Under 4.5 already busted


def test_live_statistics_sum_yellow_and_red_cards():
    cards, corners = mapper.totals_from_live_statistics(
        {
            "rows": [
                {
                    "team_id": 1,
                    "stats": [
                        {"type": "Yellow Cards", "value": "2"},
                        {"type": "Red Cards", "value": 1},
                        {"type": "Corner Kicks", "value": 4},
                    ],
                },
                {
                    "team_id": 2,
                    "stats": [
                        {"type": "Yellow Cards", "value": 1},
                        {"type": "Red Cards", "value": None},
                        {"type": "Corner Kicks", "value": 3},
                    ],
                },
            ]
        }
    )
    assert cards == 4
    assert corners == 7
    assert mapper.totals_from_live_statistics({"rows": []}) == (None, None)


def test_in_play_status_without_a_snapshot_stays_open():
    preds = mapper.map_day_payload({"rows": [mapper.attach_live_row(_live_row(), None)]})
    assert preds[0].event.status == "live"
    assert preds[0].event.live is not None and preds[0].event.live.minute is None
    assert preds[0].correct is None


def test_kickoff_window_phase_live_is_not_enough_to_mark_a_match_live():
    row = _live_row()
    row["status"] = "NS"
    row["score"] = None
    untouched = mapper.attach_live_row(row, None)
    assert "_live" not in untouched
    event = mapper.map_event(untouched)
    assert event.live is None
    assert event.status == "NS"


def test_finished_match_still_settles_when_a_live_index_has_no_snapshot():
    indexed = mapper.index_live_fixtures(
        {
            "total": 1,
            "rows": [
                {
                    "fixture_id": 99,
                    "status": "1H",
                    "elapsed_minute": 10,
                    "home_goals": 1,
                    "away_goals": 0,
                }
            ],
        }
    )
    finished = _live_row()
    finished["status"] = "FT"
    finished["phase"] = "finished"
    finished["score"] = {"home": 2, "away": 0}
    payload = mapper.enrich_day_payload({"rows": [finished]}, indexed)
    preds = mapper.map_day_payload(payload)
    h2h = next(p for p in preds if p.prediction.type == "h2h")
    assert h2h.event.live is None
    assert h2h.correct is True


def test_raw_cards_and_corners_models_are_not_shown():
    event = {"fixture_id": 77, "home": "A", "away": "B"}
    row = {**event, "predictions": [
        {"market": "cards", "prediction": 0, "probability": 0.31},
        {"market": "corners", "prediction": 1, "probability": 0.55},
        {"market": "cards_line_4_5", "prediction": 1, "probability": 0.61},
    ]}
    types = [p.prediction.type for p in mapper.map_day_payload([row])]
    assert "cards" not in types and "corners" not in types
    assert "cards_line_4_5" in types
