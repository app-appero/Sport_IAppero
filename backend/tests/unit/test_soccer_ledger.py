import json
from pathlib import Path

from app.providers.soccer.ledger import map_ledger_payload, map_settlement_status

FIX = Path(__file__).parent.parent / "fixtures" / "soccer" / "official_plays.json"


def test_settlement_mapping_never_turns_void_into_loss():
    assert map_settlement_status("settled_win", True, True) == "won"
    assert map_settlement_status("settled_loss", True, False) == "lost"
    assert map_settlement_status("settled", True, True) == "won"
    assert map_settlement_status("settled", True, None) == "unknown"
    for s in ("void_cancelled", "void_postponed", "void_abandoned", "void_push", "void_no_result", "void_market_rule"):
        assert map_settlement_status(s, True, None) == "void"
    assert map_settlement_status("not_placed_missing_odd", True, None) == "not_placed"
    assert map_settlement_status(None, False, None) == "pending"
    assert map_settlement_status("something_new", True, None) == "unknown"


def test_map_ledger_payload_real_and_synthetic_rows():
    recs = map_ledger_payload(json.loads(FIX.read_text()))
    assert len(recs) == 5
    first = recs[0]
    assert first.market == "under_over_3_5" and first.line == "3.5"
    assert first.probability == 0.6445167989624025 and first.odds == 1.5833333333333333
    assert first.settlement_status == "lost" and first.pnl == -1.0
    assert first.published_at.tzinfo is not None
    assert [r.settlement_status for r in recs] == ["lost", "won", "void", "pending", "lost"]


def test_incomplete_rows_are_skipped_not_invented():
    assert map_ledger_payload({"rows": [{"fixture_id": 1}, "x"]}) == []
    assert map_ledger_payload(None) == []
