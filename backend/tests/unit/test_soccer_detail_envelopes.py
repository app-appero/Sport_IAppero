"""Soccer Oracle match-detail envelopes, in the shape the engine returns today.

Built by reading the engine code (repo ia_predict_soccer, branch main b01ac26),
not captured from a live call. The decision cards were generated offline by the
engine's own pure functions (`DashboardService._build_decision_cards`,
`_merge_official_cards`, `_apply_line_market_signals`, `build_fixture_baseline`,
`evaluate_decision`), with no DB and no network; the numbers are illustrative.

`GET /dashboard/match/{id}` (backend/src/api/dashboard_service.py, `get_match_detail`):
  the row is serialized with `with_predictions=False` (:2207, :2209), so
  `fixture.decision_cards` stays `[]` and `fixture.best_decision` stays `None`
  (:1536-1537 `_serialize_api_fixture`, :1787-1788 `_serialize_match`);
  `fixture.predictions` is filled afterwards (:2244, with `1x2` from
  `_apply_true_1x2` :2240); the real cards are top-level `decision_cards`
  (:2266-2280, returned at :2287), one per binary market plus the 3-way
  `1x2`/`dc` outcome cards (`_build_multiclass_outcome_cards` :1051) and the
  official ledger cards (`_merge_official_cards` :1210).

`GET /dashboard/match/{id}/oracle-detail`
(backend/src/api/oracle_match_detail_service.py, `build_oracle_match_detail`):
  `{fixture_id, overview: {fixture, timeline, odds_summary, bookmaker_baseline,
  odds_updated_at}, probabilities, value_bets, team_strength, expected_goals,
  score_matrix, odds_movement, model_consensus, model_markets, warnings}`
  (:302-320); `overview.fixture` is the same row as above (:250, :305) and
  `probabilities` are the top-level `decision_cards` of `get_match_detail` (:254, :311).
"""

from __future__ import annotations

from app.providers.http_utils import load_fixture


def _envelopes() -> tuple[dict, dict]:
    return (
        load_fixture("soccer", "match_detail_envelope.json"),
        load_fixture("soccer", "oracle_detail_envelope.json"),
    )


def test_match_detail_envelope_keeps_cards_top_level_only():
    match = load_fixture("soccer", "match_detail_envelope.json")
    assert set(match) == {
        "fixture",
        "timeline",
        "odds_summary",
        "bookmaker_baseline",
        "decision_cards",
        "predictions",
        "model_markets",
        "odds_updated_at",
    }
    assert "fixture_id" not in match and "home" not in match
    fixture = match["fixture"]
    assert fixture["decision_cards"] == []
    assert fixture["best_decision"] is None
    assert fixture["predictions"] == match["predictions"]
    assert "1x2" in fixture["predictions"]
    assert match["decision_cards"]


def test_oracle_detail_envelope_nests_the_row_under_overview():
    oracle = load_fixture("soccer", "oracle_detail_envelope.json")
    assert set(oracle) == {
        "fixture_id",
        "overview",
        "probabilities",
        "value_bets",
        "team_strength",
        "expected_goals",
        "score_matrix",
        "odds_movement",
        "model_consensus",
        "model_markets",
        "warnings",
    }
    assert "predictions" not in oracle and "decision_cards" not in oracle
    assert set(oracle["overview"]) == {
        "fixture",
        "timeline",
        "odds_summary",
        "bookmaker_baseline",
        "odds_updated_at",
    }
    fixture = oracle["overview"]["fixture"]
    assert fixture["fixture_id"] == oracle["fixture_id"]
    assert fixture["decision_cards"] == []
    assert fixture["predictions"]
    assert oracle["probabilities"]
    labels = {c["value_label"] for c in oracle["value_bets"]}
    assert labels <= {"PLAY", "BORDERLINE"}


def test_both_envelopes_carry_the_same_row_and_cards():
    match, oracle = _envelopes()
    assert match["fixture"] == oracle["overview"]["fixture"]
    assert match["decision_cards"] == oracle["probabilities"]


def test_envelope_cards_hold_several_outcomes_for_1x2_and_dc():
    """The case a market-only lookup gets wrong: same market, different outcome."""
    _, oracle = _envelopes()
    by_market: dict[str, list[dict]] = {}
    for card in oracle["probabilities"]:
        by_market.setdefault(card["market"], []).append(card)
    assert {c["outcome"] for c in by_market["1x2"]} == {"Home", "Draw", "Away"}
    dc_outcomes = [c["outcome"] for c in by_market["dc"]]
    assert sorted(set(dc_outcomes)) == ["Draw/Away", "Home/Away", "Home/Draw"]
    # Binary dc card (model dc) and 3-way dc card (model 1x2) share Home/Draw.
    assert dc_outcomes.count("Home/Draw") == 2
    best_dc = next(c for c in by_market["dc"] if c["is_market_best"])
    assert best_dc["is_official"] is True
    # The dc model predicts class 1 (Home/Draw), the best dc card is another outcome.
    assert oracle["overview"]["fixture"]["predictions"]["dc"]["prediction"] == 1
    assert best_dc["outcome"] != "Home/Draw"
