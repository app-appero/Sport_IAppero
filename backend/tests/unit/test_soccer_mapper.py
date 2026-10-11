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
