"""PLAY / BORDERLINE / NO BET for tennis: which number the BFF decides on.

Since 2026-11-04 Tennis Oracle decides on a probability shrunk toward the market
(`blend_with_market` in backend/src/app/services/single_match_value.py):
p_adj = w * p_model + (1 - w) * p_market, void_odds = 1 / p_adj, PLAY when the
quote is at least 2% above void_odds. `/api/next-fixtures/predictions` sends the
raw model probability, and:
- for the match winner neither `value_decision` nor `void_odds`
  (`MatchPredictionRead`), only `predicted_winner_market_probability`;
- for first set / over-under games `void_odds` and `edge` of p_adj, no label
  (`ExtraMarketPredictionRead`).

Rows below carry the fields of `NextFixtureWithPrediction` as the engine emits them.
"""

from __future__ import annotations

from app.domain.models import Provenance
from app.providers.tennis import mapper

# Engine constants (single_match_value.MODEL_WEIGHT_BY_MARKET, DEFAULT_MIN_EDGE_PERCENT).
ENGINE_MODEL_WEIGHT = {"match_winner": 0.5, "first_set_winner": 0.75, "over_under_games": 0.5}
ENGINE_MIN_EDGE_PERCENT = 2.0


def _engine_void_odds(market: str, model_probability: float, market_probability: float) -> float:
    weight = ENGINE_MODEL_WEIGHT[market]
    adjusted = weight * model_probability + (1.0 - weight) * market_probability
    return round(1.0 / adjusted, 4)


def _engine_code(quote: float, void_odds: float) -> str:
    if quote >= void_odds * (1.0 + ENGINE_MIN_EDGE_PERCENT / 100.0):
        return "PLAY"
    return "NO BET" if quote < void_odds else "BORDERLINE"


def _row(*, prob_player_1: float, winner_odds: float | None, market_probability: float | None,
         extra_markets: list[dict] | None = None) -> dict:
    return {
        "id": 501,
        "event_key": 12200001,
        "event_date": "2026-11-18",
        "event_time": "13:00:00",
        "event_first_player": "A. Rossi",
        "first_player_key": 1001,
        "event_second_player": "B. Bianchi",
        "second_player_key": 1002,
        "tournament_name": "ATP Torino",
        "tournament_key": 77,
        "tournament_round": "1/8-finals",
        "surface": "Hard",
        "event_status": None,
        "event_winner": None,
        "event_live": "0",
        "event_type_type": "Atp Singles",
        "live_score": None,
        "live_score_updated_at": None,
        "odds": None,
        "imported_at": "2026-11-17T05:00:12.000000",
        "week_start": "2026-11-16",
        "week_end": "2026-11-22",
        "source": "api-tennis",
        "is_completed": False,
        "moved_to_fixture_at": None,
        "match_lifecycle_status": "scheduled",
        "match_lifecycle_label": "In programma",
        "prediction": {
            "event_key": 12200001,
            "model_version": "v4",
            "model_name": "voting_ensemble",
            "predicted_at": "2026-11-17T05:07:36.355773",
            "prob_player_1_win": prob_player_1,
            "predicted_winner": "First Player",
            "actual_winner": None,
            "is_correct": None,
            "predicted_winner_odds": winner_odds,
            "predicted_winner_market_probability": market_probability,
            "odds_bookmaker_count": 9,
            "confidence": max(prob_player_1, 1.0 - prob_player_1),
            "features_available": True,
            "warnings": [],
            "data_quality": {
                "status": "sufficient",
                "reasons": [],
                "systemic_gaps": [],
                "details": {"surface_known": True, "bookmaker_count": 9},
                "evaluated": ["surface", "odds", "bookmaker_count"],
                "not_evaluated": ["player_history", "ranking"],
            },
        },
        "prediction_warning": None,
        "extra_markets": extra_markets or [],
        "odds_captured_at": "2026-11-17T04:55:00Z",
    }


def _match_winner(row: dict):
    return next(p for p in mapper.map_predictions_payload([row]) if p.prediction.type == "match_winner")


def test_match_winner_from_raw_probability_is_declared_and_can_differ_from_the_engine():
    # Model 74%, market (no-vig) 55%, quote 1.55.
    row = _row(prob_player_1=0.74, winner_odds=1.55, market_probability=0.55)
    engine_void = _engine_void_odds("match_winner", 0.74, 0.55)
    assert engine_void == 1.5504 and _engine_code(1.55, engine_void) == "NO BET"

    prediction = _match_winner(row)
    # The engine sends no void_odds / value_decision for this market: the BFF still
    # derives from 1 / 0.74 = 1.3514 (PLAY from 1.3784), and says so.
    assert prediction.decision.code == "PLAY"
    assert prediction.provenance.decision_source == "bff_derived"
    assert prediction.provenance.decision_basis == "raw_probability"
    assert "decision_derived_by_bff" in prediction.anomalies
    assert "decision_from_raw_probability" in prediction.anomalies
    # The raw probability shown to the user is untouched.
    assert prediction.prediction.confidence == 0.74


def test_match_winner_follows_the_engine_void_odds_when_sent():
    engine_void = _engine_void_odds("match_winner", 0.74, 0.55)
    for where in ("prediction", "row"):
        row = _row(prob_player_1=0.74, winner_odds=1.55, market_probability=0.55)
        (row["prediction"] if where == "prediction" else row)["void_odds"] = engine_void
        prediction = _match_winner(row)
        assert prediction.decision.code == _engine_code(1.55, engine_void) == "NO BET"
        assert prediction.provenance.decision_source == "bff_derived"
        assert prediction.provenance.decision_basis == "provider_void_odds"
        assert "decision_derived_by_bff" in prediction.anomalies
        assert "decision_from_raw_probability" not in prediction.anomalies


def test_match_winner_engine_label_wins_over_void_odds_and_raw_probability():
    row = _row(prob_player_1=0.74, winner_odds=1.55, market_probability=0.55)
    row["prediction"]["value_decision"] = "BORDERLINE"
    row["prediction"]["void_odds"] = 1.2  # would be PLAY by the odds rule
    prediction = _match_winner(row)
    assert prediction.decision.code == "BORDERLINE"
    assert prediction.provenance.decision_source == "provider"
    assert prediction.provenance.decision_basis == "provider_decision"
    assert not {"decision_derived_by_bff", "decision_from_raw_probability"} & set(prediction.anomalies)


def test_engine_void_odds_without_a_quote_give_no_decision_rather_than_a_raw_one():
    row = _row(prob_player_1=0.74, winner_odds=None, market_probability=None)
    row["prediction"]["void_odds"] = 1.5504
    prediction = _match_winner(row)
    assert prediction.decision is None
    assert prediction.provenance.decision_source is None
    assert prediction.provenance.decision_basis is None


def _first_set(void_odds: float | None) -> dict:
    extra = {
        "market": "first_set_winner",
        "model_version": "first_set_winner_v2",
        "model_name": "logistic_regression",
        "selection": "First Player",
        "probability": 0.70,
        "odds": 1.50,
        "void_odds": void_odds,
        "edge": round((1.50 - void_odds) / void_odds * 100.0, 2) if void_odds else None,
        "published_at": "2026-11-17T05:11:41.992017",
    }
    row = _row(prob_player_1=0.6, winner_odds=None, market_probability=None, extra_markets=[extra])
    return next(p for p in mapper.map_predictions_payload([row]) if p.prediction.type == "first_set_winner")


def test_extra_market_uses_the_engine_void_odds_not_the_raw_probability():
    # Model 70%, market 50%, weight 0.75 -> p_adj 65%, void 1.5385; quote 1.50.
    engine_void = _engine_void_odds("first_set_winner", 0.70, 0.50)
    assert engine_void == 1.5385
    prediction = _first_set(engine_void)
    # From the raw 70% (void 1.4286) the same quote would be PLAY.
    assert mapper._classify_value_decision(1.50, 1.0 / 0.70).code == "PLAY"
    assert prediction.decision.code == _engine_code(1.50, engine_void) == "NO BET"
    assert prediction.provenance.decision_source == "bff_derived"
    assert prediction.provenance.decision_basis == "provider_void_odds"
    assert "decision_from_raw_probability" not in prediction.anomalies


def test_extra_market_without_engine_void_odds_declares_the_raw_probability():
    prediction = _first_set(None)
    assert prediction.decision.code == "PLAY"
    assert prediction.provenance.decision_basis == "raw_probability"
    assert "decision_from_raw_probability" in prediction.anomalies


def test_provenance_without_decision_basis_still_validates():
    parsed = Provenance.model_validate({"engine": "tennis-oracle", "decision_source": "bff_derived"})
    assert parsed.decision_basis is None
