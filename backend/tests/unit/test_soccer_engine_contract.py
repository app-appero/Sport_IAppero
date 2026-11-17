"""Additive fields Soccer Oracle emits today, read by their real names.

Payloads are built on the field names found in the engine's code on branch
`cursor/platform-audit-evolution-e436` (not captured from a live call):

`/dashboard/day` rows[] (backend/src/api/dashboard_service.py `_serialize_match`,
backend/src/ml/serving/prediction_snapshot_service.py):
  rows[].markets_unavailable, rows[].markets_missing_reasons,
  rows[].data_quality {odds_available, team_statistics_available, xg_available},
  rows[].predictions.<market>.{model_name, run_id, computed_at,
  features_defaulted, features_defaulted_count};
`/live/fixtures` rows[].captured_at (backend/src/data/live/live_models.py).
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.providers.soccer import mapper as soccer


def _soccer_row(**overrides) -> dict:
    row = {
        "fixture_id": 1579486,
        "date": "2026-11-18",
        "time": "20:45",
        "datetime": "2026-11-18T19:45:00+00:00",
        "league": "135",
        "round": "Regular Season - 12",
        "home": "Roma",
        "away": "Lazio",
        "status": "NS",
        "phase": "upcoming",
        "score": {"home": None, "away": None},
        "actual_totals": None,
        "predictions": {
            "under_over_2_5": {
                "prediction": 1,
                "probability": 0.61,
                "model_name": "lightgbm",
                "run_id": "run-20261101-0412",
                "computed_at": "2026-11-17T06:42:38.120000+00:00",
            },
            "goal_no_goal": {
                "prediction": 0,
                "probability": 0.44,
                "model_name": "logistic_regression",
                "run_id": "run-20261030-0931",
                "computed_at": "2026-11-17T06:42:39.500000+00:00",
                "features_defaulted": ["mean_expected_goals_home", "mean_expected_goals_away"],
                "features_defaulted_count": 2,
            },
        },
        "markets_unavailable": ["cards_line_4_5"],
        "markets_missing_reasons": {
            "cards_line_4_5": "no_odds_for_market",
            "under_over_3_5": "no_model_registered",
            "corners_line_9_5": "not_computed",
        },
        "data_quality": {
            "odds_available": True,
            "team_statistics_available": True,
            "xg_available": False,
        },
        "decision_cards": [],
        "best_decision": None,
        "source": "db",
    }
    row.update(overrides)
    return row


def test_soccer_missing_markets_carry_the_engine_reason():
    event = soccer.map_event(_soccer_row())
    reasons = {m.market: m.reason for m in event.unavailable_markets}
    assert reasons == {
        "cards_line_4_5": "no_odds_for_market",
        "under_over_3_5": "no_model_registered",
        "corners_line_9_5": "not_computed",
    }


def test_soccer_market_listed_without_a_reason_keeps_the_reason_empty():
    # Engine before `markets_missing_reasons` existed: only the list is sent.
    row = _soccer_row()
    row.pop("markets_missing_reasons")
    event = soccer.map_event(row)
    assert [(m.market, m.reason) for m in event.unavailable_markets] == [("cards_line_4_5", None)]


def test_soccer_row_data_quality_computed_at_and_model_are_passed_through():
    by_market = {p.prediction.type: p for p in soccer.map_row_predictions(_soccer_row())}
    over = by_market["under_over_2_5"]
    assert over.model.name == "lightgbm" and over.model.version == "run-20261101-0412"
    assert over.generated_at == datetime(2026, 11, 17, 6, 42, 38, 120000, tzinfo=UTC)
    assert over.data_freshness.predicted_at == over.generated_at
    assert over.data_freshness.timezone_explicit is True
    assert over.provenance.data_quality == {
        "odds_available": True,
        "team_statistics_available": True,
        "xg_available": False,
    }
    # The engine declares the xG input missing: the probability is there, but limited.
    assert over.availability.status == "limited" and over.availability.reason == "xg_unavailable"
    assert "features_defaulted" not in over.anomalies


def test_soccer_features_defaulted_are_declared_per_market():
    by_market = {p.prediction.type: p for p in soccer.map_row_predictions(_soccer_row())}
    goal = by_market["goal_no_goal"]
    assert "features_defaulted" in goal.anomalies
    assert goal.provenance.data_quality["features_defaulted_count"] == 2
    assert goal.provenance.data_quality["features_defaulted"] == [
        "mean_expected_goals_home",
        "mean_expected_goals_away",
    ]
    # Row-level evidence is kept next to the per-market one.
    assert goal.provenance.data_quality["xg_available"] is False


def test_soccer_row_without_additive_fields_stays_empty():
    row = _soccer_row()
    for key in ("markets_unavailable", "markets_missing_reasons", "data_quality"):
        row.pop(key)
    for market in row["predictions"].values():
        for key in ("computed_at", "features_defaulted", "features_defaulted_count"):
            market.pop(key, None)
    predictions = soccer.map_row_predictions(row)
    assert predictions
    for prediction in predictions:
        assert prediction.generated_at is None and prediction.data_freshness is None
        assert prediction.provenance.data_quality is None
        assert prediction.availability.status == "available"
        assert prediction.anomalies == []
        assert prediction.event.unavailable_markets == []


def test_soccer_live_snapshot_time_becomes_live_updated_at():
    row = _soccer_row(status="1H", phase="live")
    live = soccer.index_live_fixtures(
        {
            "total": 1,
            "rows": [
                {
                    "id_snapshot": "3a2f7c1e-0000-4000-8000-000000000001",
                    "fixture_id": 1579486,
                    "captured_at": "2026-11-18T20:07:31.250000+00:00",
                    "league_id": 135,
                    "status": "1H",
                    "elapsed_minute": 22,
                    "elapsed_extra": None,
                    "home_team_id": 497,
                    "away_team_id": 487,
                    "home_goals": 1,
                    "away_goals": 0,
                    "raw_payload": None,
                    "source": "api_sports",
                }
            ],
        }
    )
    predictions = soccer.map_day_payload(soccer.enrich_day_payload({"rows": [row]}, live))
    assert predictions and predictions[0].event.live is not None
    for prediction in predictions:
        assert prediction.data_freshness.live_updated_at == datetime(2026, 11, 18, 20, 7, 31, 250000, tzinfo=UTC)
        assert prediction.data_freshness.predicted_at == prediction.generated_at
    # Not live: nothing is invented.
    idle = soccer.map_day_payload(soccer.enrich_day_payload({"rows": [_soccer_row()]}, {}))
    assert all(p.data_freshness.live_updated_at is None for p in idle)
