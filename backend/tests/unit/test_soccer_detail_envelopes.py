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

import copy

import pytest

from app.providers import transparency as tx
from app.providers.http_utils import load_fixture
from app.providers.soccer import mapper


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


# --- mapping (BFF) -------------------------------------------------------------

DC_MODEL_RUN = "dc_20260916T042341754757Z"
ONE_X_TWO_RUN = "1x2_test_fixture"


def _map(payload: dict) -> dict:
    return {p.prediction.type: p for p in mapper.map_day_payload({"rows": [payload]})}


def _card(payload: dict, market: str, outcome: str, **match) -> dict:
    cards = payload.get("decision_cards") or payload.get("probabilities")
    return next(
        c
        for c in cards
        if c["market"] == market and c["outcome"] == outcome and all(c.get(k) == v for k, v in match.items())
    )


@pytest.mark.parametrize("name", ["oracle_detail_envelope.json", "match_detail_envelope.json"])
def test_detail_envelope_maps_predictions_with_provider_decisions(name):
    payload = load_fixture("soccer", name)
    by_type = _map(payload)

    expected = {m for m in load_fixture("soccer", "match_detail_envelope.json")["predictions"] if m != "1x2"}
    assert set(by_type) == expected
    for prediction in by_type.values():
        assert prediction.event.id == "1552176"
        assert prediction.event.name == "Feyenoord vs Utrecht"
        assert prediction.event.score is not None and prediction.event.score.display == "5-0"
        assert prediction.decision is not None and prediction.decision.code
        assert prediction.provenance.decision_source == "provider"
        assert prediction.provenance.decision_basis == tx.DECISION_BASIS_PROVIDER

    ou = by_type["under_over_3_5"]
    card = _card(payload, "under_over_3_5", "Under 3.5")
    assert ou.prediction.selection.id == "under"
    assert ou.decision.code == "BORDERLINE"
    assert ou.decision.policy_version == card["policy_version"]
    assert ou.pricing is not None
    assert ou.pricing.expected_value == pytest.approx(card["ev"])
    assert ou.pricing.odds_decimal == pytest.approx(card["odd"])

    # The 3-way board still folds into h2h/dc.
    assert {p.key for p in by_type["h2h"].probabilities} == {"home", "draw", "away"}
    assert by_type["h2h"].decision.code == "NO BET"
    assert by_type["h2h"].model.version == "h2h_20260916T042043734030Z"

    six_five = by_type["cards_line_6_5"]
    assert six_five.decision.code == "SENZA QUOTA"
    assert six_five.decision.low_reliability is True


def test_detail_envelope_card_is_matched_on_outcome_not_on_market_best():
    """dc shows 1X: the official Home/Away card is market best, but another outcome."""
    payload = load_fixture("soccer", "oracle_detail_envelope.json")
    official = _card(payload, "dc", "Home/Away")
    assert official["is_market_best"] is True and official["value_label"] == "BORDERLINE"

    dc = _map(payload)["dc"]
    assert dc.prediction.selection.id == "1X"
    model_card = _card(payload, "dc", "Home/Draw", run_id=DC_MODEL_RUN)
    assert dc.decision.code == model_card["value_label"] == "NO BET"
    # Two Home/Draw cards (dc model, 1x2-derived): the one of the dc model run wins.
    assert dc.model.version == DC_MODEL_RUN
    assert dc.pricing.expected_value == pytest.approx(model_card["ev"])


def test_detail_envelope_official_card_wins_on_the_same_outcome():
    payload = load_fixture("soccer", "match_detail_envelope.json")
    official = copy.deepcopy(_card(payload, "dc", "Home/Away"))
    official.update(outcome="Home/Draw", pick="Home/Draw", value_label="PLAY", is_market_best=False)
    payload["decision_cards"].append(official)

    dc = _map(payload)["dc"]
    assert dc.decision.code == "PLAY"
    assert dc.model.version == ONE_X_TWO_RUN


def test_detail_envelope_not_home_pick_borrows_no_card():
    """h2h code 0 is the binary model's Not Home (X2): neither the h2h "Home"
    card nor the 1x2 "Draw"/"Away" cards are that bet, so no decision."""
    payload = load_fixture("soccer", "match_detail_envelope.json")
    payload["fixture"]["predictions"]["h2h"]["prediction"] = 0
    three_way = payload["fixture"]["predictions"]["1x2"]["probabilities"]

    h2h = _map(payload)["h2h"]
    assert h2h.prediction.selection.id == "not_home"
    assert h2h.prediction.selection.name == "X2"
    assert h2h.prediction.confidence == pytest.approx(three_way["DRAW"] + three_way["AWAY"])
    assert h2h.decision is None
    assert h2h.pricing is None


def test_detail_envelope_draw_pick_takes_the_1x2_draw_card():
    """A draw pick: the h2h "Home" card is another outcome, the 1x2 Draw card wins."""
    payload = load_fixture("soccer", "match_detail_envelope.json")
    payload["fixture"]["predictions"]["h2h"]["prediction"] = "X"

    h2h = _map(payload)["h2h"]
    assert h2h.prediction.selection.id == "draw"
    draw_card = _card(payload, "1x2", "Draw")
    assert h2h.decision.code == draw_card["value_label"]
    assert h2h.pricing.odds_decimal == pytest.approx(draw_card["odd"])
    assert h2h.model.version == ONE_X_TWO_RUN


def test_detail_envelope_synthesized_h2h_uses_the_argmax_1x2_card():
    payload = load_fixture("soccer", "oracle_detail_envelope.json")
    del payload["overview"]["fixture"]["predictions"]["h2h"]
    payload["probabilities"] = [c for c in payload["probabilities"] if c["market"] != "h2h"]

    h2h = _map(payload)["h2h"]
    assert h2h.prediction.selection.id == "home"
    home_card = _card(payload, "1x2", "Home")
    assert home_card["is_official"] is True
    assert h2h.decision.code == home_card["value_label"]
    assert h2h.pricing.expected_value == pytest.approx(home_card["ev"])


def test_detail_envelope_without_a_card_for_the_shown_outcome_has_no_decision():
    payload = load_fixture("soccer", "match_detail_envelope.json")
    # The line signal flips the shown side to Over: the only card is Under 3.5.
    payload["fixture"]["predictions"]["cards_line_3_5"]["line_market_signal"]["direction"] = "over"

    line = _map(payload)["cards_line_3_5"]
    assert line.prediction.selection.id == "over"
    assert line.decision is None
    assert line.pricing is None
    assert line.provenance.decision_source is None


def test_detail_envelope_row_cards_still_win_when_present():
    """A row that already carries cards keeps the lookup by market (day-feed rule)."""
    payload = load_fixture("soccer", "match_detail_envelope.json")
    flat = load_fixture("soccer", "match.json")
    payload["fixture"]["decision_cards"] = flat["decision_cards"]

    ou = _map(payload)["under_over_3_5"]
    flat_card = next(c for c in flat["decision_cards"] if c["market"] == "under_over_3_5")
    assert ou.pricing.expected_value == pytest.approx(flat_card["ev"])


def test_oracle_detail_without_fixture_maps_nothing():
    payload = load_fixture("soccer", "oracle_detail_envelope.json")
    payload["overview"]["fixture"] = None
    payload["warnings"] = ["fixture_not_found"]
    assert mapper.map_day_payload({"rows": [payload]}) == []


@pytest.mark.parametrize("name", ["oracle_detail.json", "match.json"])
def test_flat_detail_rows_keep_mapping_as_before(name):
    by_type = _map(load_fixture("soccer", name))
    assert len(by_type) == 10
    assert all(p.decision is not None for p in by_type.values())
    assert {p.provenance.decision_source for p in by_type.values()} == {"provider"}
    assert by_type["under_over_3_5"].decision.code == "BORDERLINE"
    assert by_type["under_over_3_5"].pricing.expected_value == pytest.approx(0.12400686347473755)
    assert by_type["dc"].model.version == DC_MODEL_RUN


def test_live_snapshot_on_the_oracle_envelope_reaches_the_row():
    payload = load_fixture("soccer", "oracle_detail_envelope.json")
    row = payload["overview"]["fixture"]
    row.update(status="NS", phase="live", score={"home": None, "away": None})
    live = {"1552176": {"fixture_id": 1552176, "status": "2H", "elapsed_minute": 63, "home_goals": 2, "away_goals": 0}}

    enriched = mapper.enrich_day_payload({"rows": [payload]}, live)
    h2h = next(p for p in mapper.map_day_payload(enriched) if p.prediction.type == "h2h")
    assert h2h.event.live is not None and h2h.event.live.minute == 63
    assert h2h.event.score is not None and h2h.event.score.display == "2-0"
    assert h2h.decision is not None
