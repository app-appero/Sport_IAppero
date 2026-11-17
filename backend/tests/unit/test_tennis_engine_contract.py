"""Additive fields Tennis Oracle emits today, read by their real names.

Payloads are built on the field names found in the engine's code on branch
`cursor/platform-audit-evolution-e436` (not captured from a live call):

`/api/next-fixtures/predictions` items[] (backend/src/app/schemas/prediction.py
`NextFixtureWithPrediction`, backend/src/app/services/predictions.py):
  items[].odds_captured_at, items[].imported_at, items[].live_score_updated_at,
  items[].prediction_warning, items[].prediction.{model_name, model_version,
  predicted_at, features_available, warnings, data_quality{status, reasons,
  systemic_gaps, details, evaluated, not_evaluated}},
  items[].extra_markets[].{model_name, model_version, published_at}.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.providers.tennis import mapper as tennis


def _tennis_row(**overrides) -> dict:
    row = {
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
        "live_score_updated_at": "2026-11-17T09:15:00",
        "odds": None,
        "imported_at": "2026-11-17T05:00:12",
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
            "prob_player_1_win": 0.62,
            "predicted_winner": "First Player",
            "actual_winner": None,
            "is_correct": None,
            "predicted_winner_odds": 1.7,
            "predicted_winner_market_probability": 0.57,
            "odds_bookmaker_count": 2,
            "confidence": 0.62,
            "features_available": True,
            "warnings": [],
            "data_quality": {
                "status": "limited",
                "reasons": ["few_bookmakers"],
                "systemic_gaps": ["enrichment_features_unavailable"],
                "details": {
                    "player_1_prior_matches": None,
                    "player_2_prior_matches": None,
                    "surface_known": True,
                    "ranking_available": None,
                    "bookmaker_count": 2,
                    "unavailable_feature_columns": ["player_1_age", "player_2_age"],
                    "low_history_threshold": 5,
                    "few_bookmakers_threshold": 3,
                },
                "evaluated": ["surface", "odds", "bookmaker_count", "enrichment_features"],
                "not_evaluated": ["player_history", "ranking"],
            },
        },
        "prediction_warning": None,
        "extra_markets": [
            {
                "market": "over_under_games",
                "model_version": "over_under_games_v1",
                "model_name": "random_forest",
                "selection": "Over 21.5",
                "probability": 0.58,
                "odds": 1.85,
                "void_odds": 1.7857,
                "edge": 3.6,
                "published_at": "2026-11-17T05:11:42.122974",
            }
        ],
        "odds_captured_at": "2026-11-17T04:55:00Z",
    }
    row.update(overrides)
    return row


def _by_market(row: dict) -> dict:
    return {p.prediction.type: p for p in tennis.map_predictions_payload([row])}


def test_tennis_odds_capture_and_timestamps_are_read_by_their_names():
    winner = _by_market(_tennis_row())["match_winner"]
    fresh = winner.data_freshness
    assert fresh.odds_captured_at == datetime(2026, 11, 17, 4, 55, tzinfo=UTC)
    assert fresh.predicted_at == datetime(2026, 11, 17, 5, 7, 36, 355773)
    assert fresh.event_data_updated_at == datetime(2026, 11, 17, 5, 0, 12)
    assert fresh.live_updated_at == datetime(2026, 11, 17, 9, 15)
    # predicted_at / imported_at come without an offset: flagged, not converted.
    assert fresh.timezone_explicit is False and "naive_datetime" in winner.anomalies
    assert winner.model.name == "voting_ensemble" and winner.model.version == "v4"
    assert winner.provenance.source == "api-tennis"


def test_tennis_odds_capture_is_not_copied_to_markets_it_does_not_describe():
    # The engine's odds_captured_at is the latest match-winner odds capture only.
    games = _by_market(_tennis_row())["over_under_games"]
    assert games.data_freshness.odds_captured_at is None
    assert games.data_freshness.predicted_at == datetime(2026, 11, 17, 5, 11, 42, 122974)
    assert games.model.version == "over_under_games_v1" and games.model.name == "random_forest"


def test_tennis_data_quality_is_passed_through_and_a_declared_gap_limits_availability():
    row = _tennis_row()
    winner = _by_market(row)["match_winner"]
    assert winner.provenance.data_quality == row["prediction"]["data_quality"]
    assert winner.availability.status == "limited"
    assert winner.availability.reason == "few_bookmakers"

    # `systemic_gaps` (inputs serving lacks for every match) do not downgrade the engine's
    # status, so they do not limit availability here either; they stay in data_quality.
    row["prediction"]["data_quality"] = {**row["prediction"]["data_quality"], "status": "sufficient", "reasons": []}
    sufficient = _by_market(row)["match_winner"]
    assert sufficient.availability.status == "available"
    assert sufficient.provenance.data_quality["systemic_gaps"] == ["enrichment_features_unavailable"]

    row["prediction"]["data_quality"] = {"status": "insufficient", "reasons": ["missing_odds", "surface_unknown"]}
    insufficient = _by_market(row)["match_winner"].availability
    assert insufficient.status == "limited" and insufficient.reason == "missing_odds"


def test_tennis_features_unavailable_still_wins_and_missing_report_is_not_a_gap():
    row = _tennis_row()
    row["prediction"]["features_available"] = False
    assert _by_market(row)["match_winner"].availability.reason == "features_unavailable"

    # Played fixtures: the engine sends no data_quality (None).
    row = _tennis_row()
    row["prediction"]["data_quality"] = None
    winner = _by_market(row)["match_winner"]
    assert winner.availability.status == "available"
    assert winner.provenance.data_quality == {"features_available": True, "warnings": []}


def test_tennis_row_without_match_winner_prediction_lists_it_with_the_engine_reason():
    row = _tennis_row(prediction=None, prediction_warning="missing_persisted_prediction")
    predictions = tennis.map_predictions_payload([row])
    assert [p.prediction.type for p in predictions] == ["over_under_games"]
    assert [(m.market, m.reason) for m in predictions[0].event.unavailable_markets] == [
        ("match_winner", "missing_persisted_prediction")
    ]
    # With the prediction present the engine sends prediction_warning = None.
    assert _by_market(_tennis_row())["match_winner"].event.unavailable_markets == []
    # `/api/next-fixtures` rows have no prediction keys at all: nothing is listed.
    plain = {k: v for k, v in _tennis_row().items() if k not in {"prediction", "prediction_warning", "extra_markets"}}
    assert tennis.map_event(plain).unavailable_markets == []


def test_tennis_row_without_additive_fields_stays_empty():
    row = _tennis_row()
    row.pop("odds_captured_at")
    row["prediction"].pop("data_quality")
    row["prediction"].pop("predicted_winner_market_probability")
    winner = _by_market(row)["match_winner"]
    assert winner.data_freshness.odds_captured_at is None
    assert winner.availability.status == "available"
