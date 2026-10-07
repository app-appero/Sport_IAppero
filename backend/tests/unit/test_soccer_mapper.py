from app.providers.http_utils import load_fixture
from app.providers.soccer import mapper


def test_map_day_payload_all_markets_and_naming():
    payload = load_fixture("soccer", "day.json")
    predictions = mapper.map_day_payload(payload)

    assert len(predictions) >= 4
    assert all(p.sport == "football" for p in predictions)
    assert all(p.provider.name == "soccer-oracle" for p in predictions)

    markets = {p.prediction.type for p in predictions}
    assert "match_winner" in markets
    assert "over_under_2_5" in markets
    assert "btts" in markets

    inter = next(
        p
        for p in predictions
        if p.event.id == "123456" and p.prediction.type == "match_winner"
    )
    assert inter.id == "soccer_123456_match_winner"
    assert inter.prediction.selection.name == "Inter"
    assert inter.prediction.confidence == 0.71
    assert abs(sum(p.value for p in inter.probabilities) - 1.0) < 1e-6


def test_parse_prediction_id():
    assert mapper.parse_prediction_id("soccer_123456_match_winner") == (
        "123456",
        "match_winner",
    )
    assert mapper.parse_prediction_id("soccer_123456_over_under_2_5") == (
        "123456",
        "over_under_2_5",
    )
    assert mapper.parse_prediction_id("tennis_1_match_winner") is None


def test_map_markets():
    markets = mapper.map_markets(load_fixture("soccer", "markets.json"))
    assert {m.key for m in markets} == {"match_winner", "over_under_2_5", "btts"}
    assert all(m.sport == "football" for m in markets)
