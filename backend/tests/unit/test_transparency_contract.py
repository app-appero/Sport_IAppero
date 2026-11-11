"""Contract tests for the additive transparency fields on UnifiedPrediction."""

from __future__ import annotations

from app.domain.models import UnifiedPrediction
from app.providers.http_utils import load_fixture
from app.providers.soccer import mapper as soccer_mapper
from app.providers.tennis import mapper as tennis_mapper

# Fields that existed before this audit branch. New clients may use more;
# old clients must still find every key below on every prediction.
LEGACY_UNIFIED_KEYS = {
    "id",
    "sport",
    "event",
    "prediction",
    "probabilities",
    "provider",
    "oracle_score",
    "generated_at",
    "correct",
    "pricing",
    "decision",
}

# Same top-level additive keys for football and tennis.
SHARED_TRANSPARENCY_KEYS = {
    "model",
    "availability",
    "data_freshness",
    "provenance",
    "anomalies",
}


def _serialize(prediction: UnifiedPrediction) -> dict:
    return prediction.model_dump(mode="json")


def test_soccer_day_fixture_exposes_legacy_and_transparency_fields():
    payload = load_fixture("soccer", "day.json")
    predictions = soccer_mapper.map_day_payload(payload)
    assert predictions
    sample = _serialize(predictions[0])
    assert LEGACY_UNIFIED_KEYS.issubset(sample.keys())
    assert SHARED_TRANSPARENCY_KEYS.issubset(sample.keys())
    assert sample["provenance"]["engine"] == "soccer-oracle"
    assert sample["model"] is None or "name" in sample["model"] or "version" in sample["model"]
    # Upstream day rows carry model_name/run_id: they must surface as model info.
    with_model = next(p for p in predictions if p.model and (p.model.name or p.model.version))
    assert with_model.model is not None


def test_tennis_predictions_fixture_exposes_legacy_and_transparency_fields():
    payload = load_fixture("tennis", "predictions.json")
    predictions = tennis_mapper.map_predictions_payload(payload)
    assert predictions
    sample = _serialize(predictions[0])
    assert LEGACY_UNIFIED_KEYS.issubset(sample.keys())
    assert SHARED_TRANSPARENCY_KEYS.issubset(sample.keys())
    assert sample["provenance"]["engine"] == "tennis-oracle"
    assert sample["generated_at"] is not None
    assert sample["model"] is not None
    assert sample["model"]["version"] in {"v4", "first_set_winner_v2", "over_under_games_v1"} or (
        sample["model"]["version"] is not None
    )


def test_football_and_tennis_share_the_same_top_level_keys():
    soccer = _serialize(soccer_mapper.map_day_payload(load_fixture("soccer", "day.json"))[0])
    tennis = _serialize(
        tennis_mapper.map_predictions_payload(load_fixture("tennis", "predictions.json"))[0]
    )
    assert set(soccer.keys()) == set(tennis.keys())


def test_soccer_maps_unavailable_markets_from_engine_lists():
    payload = load_fixture("soccer", "day.json")
    rows = payload.get("rows") or []
    assert rows
    # Inject the additive fields the soccer engine now exposes.
    rows[0]["markets_unavailable"] = ["under_over_4_5"]
    rows[0]["markets_missing_reasons"] = {"under_over_4_5": "no_odds_for_market"}
    event = soccer_mapper.map_event(rows[0])
    assert any(m.market == "under_over_4_5" and m.reason == "no_odds_for_market" for m in event.unavailable_markets)


def test_tennis_marks_bff_derived_decisions():
    payload = load_fixture("tennis", "predictions.json")
    predictions = tennis_mapper.map_predictions_payload(payload)
    match_winners = [p for p in predictions if p.prediction.type == "match_winner"]
    assert match_winners
    # Fixtures have odds but usually no value_decision: the BFF recovers PLAY/BORDERLINE.
    derived = [p for p in match_winners if "decision_derived_by_bff" in (p.anomalies or [])]
    assert derived
