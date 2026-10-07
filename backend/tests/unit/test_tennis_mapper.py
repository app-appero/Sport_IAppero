from app.providers.http_utils import load_fixture
from app.providers.tennis import mapper


def test_map_predictions_payload():
    payload = load_fixture("tennis", "predictions.json")
    predictions = mapper.map_predictions_payload(payload)

    assert len(predictions) >= 3
    assert all(p.sport == "tennis" for p in predictions)
    assert all(p.provider.name == "tennis-oracle" for p in predictions)

    sinner = next(
        p for p in predictions if p.event.id == "98765" and p.prediction.type == "match_winner"
    )
    assert sinner.id == "tennis_98765_match_winner"
    assert sinner.prediction.selection.name == "Jannik Sinner"
    assert sinner.prediction.confidence == 0.64
    assert {p.key for p in sinner.probabilities} == {"player_1", "player_2"}


def test_competitions_from_events():
    events = mapper.map_events(load_fixture("tennis", "fixtures.json"))
    competitions = mapper.map_competitions_from_events(events)
    assert len(competitions) == 1
    assert competitions[0].name == "Shanghai Masters"


def test_parse_prediction_id():
    assert mapper.parse_prediction_id("tennis_98765_match_winner") == ("98765", "match_winner")
    assert mapper.parse_prediction_id("tennis_98765_total_sets_over_3_5") == (
        "98765",
        "total_sets_over_3_5",
    )
