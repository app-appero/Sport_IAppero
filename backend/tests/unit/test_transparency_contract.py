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


def test_decision_source_is_declared_for_both_engines():
    soccer = soccer_mapper.map_day_payload(load_fixture("soccer", "day.json"))
    with_decision = [p for p in soccer if p.decision is not None]
    assert with_decision
    assert {p.provenance.decision_source for p in with_decision} == {"provider"}

    tennis = tennis_mapper.map_predictions_payload(load_fixture("tennis", "predictions.json"))
    assert {p.provenance.decision_source for p in tennis if p.decision} == {"bff_derived"}


def test_tennis_provider_label_wins_and_is_not_marked_derived():
    payload = load_fixture("tennis", "predictions.json")
    payload["items"][0]["value_decision"] = "BORDERLINE"
    first = next(
        p for p in tennis_mapper.map_predictions_payload(payload) if p.prediction.type == "match_winner"
    )
    assert first.decision.code == "BORDERLINE"
    assert first.provenance.decision_source == "provider"
    assert "decision_derived_by_bff" not in first.anomalies


def test_soccer_keeps_missing_upstream_values_empty_and_maps_present_ones():
    predictions = soccer_mapper.map_day_payload(load_fixture("soccer", "day.json"))
    sample = predictions[0]
    # run_id is sent upstream; computed_at is not in the fixtures: no value is invented.
    assert sample.provider.version == sample.model.version
    assert sample.generated_at is None
    assert sample.data_freshness is None

    payload = load_fixture("soccer", "day.json")
    for row in payload["rows"]:
        for market in (row.get("predictions") or {}).values():
            if isinstance(market, dict):
                market["computed_at"] = "2026-09-19T06:42:38+00:00"
    stamped = soccer_mapper.map_day_payload(payload)[0]
    assert stamped.generated_at is not None and stamped.generated_at.tzinfo is not None
    assert stamped.data_freshness.predicted_at == stamped.generated_at
    assert stamped.data_freshness.timezone_explicit is True


def test_old_payload_without_new_fields_still_validates():
    """A payload shaped like the pre-audit contract (no new keys) must still parse."""
    legacy = _serialize(soccer_mapper.map_day_payload(load_fixture("soccer", "day.json"))[0])
    for key in SHARED_TRANSPARENCY_KEYS:
        legacy.pop(key)
    legacy["event"].pop("unavailable_markets")
    legacy["provider"] = {"name": "soccer-oracle", "version": None}
    parsed = UnifiedPrediction.model_validate(legacy)
    assert parsed.model is None and parsed.availability is None
    assert parsed.data_freshness is None and parsed.provenance is None
    assert parsed.anomalies == []
    assert parsed.event.unavailable_markets == []


def test_feed_meta_without_new_fields_validates():
    from app.domain.models import FeedMeta

    meta = FeedMeta.model_validate({"status": "ok", "is_complete": True})
    assert meta.is_stale is False and meta.snapshot_age_seconds is None


def test_missing_probability_is_unavailable_with_anomaly():
    from app.providers import transparency as tx

    avail = tx.availability(None)
    assert avail.status == "unavailable" and avail.reason == "no_probability"
    assert tx.probability_anomalies(None, None) == ["probability_missing"]
    assert tx.probability_anomalies("abc", None) == ["probability_not_numeric"]
    assert tx.probability_anomalies(55, 0.55) == ["probability_sent_as_percent"]
    assert tx.probability_anomalies(0.55, 0.55) == []
