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
