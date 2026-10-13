import json
from datetime import UTC, datetime
from pathlib import Path

from app.providers.tennis.ledger import (
    kickoff_from,
    map_outcome,
    map_published_payload,
    map_published_row,
    settled_outcomes,
)

FIX = Path(__file__).parent.parent / "fixtures" / "tennis"


def test_kickoff_is_europe_rome_local_and_needs_a_time():
    # Rome is UTC+2 in October (CEST).
    assert kickoff_from("2026-10-08", "10:00:00") == datetime(2026, 10, 8, 8, 0, tzinfo=UTC)
    assert kickoff_from("2026-10-08", None) is None
    assert kickoff_from("bad", "10:00:00") is None


def test_outcome_mapping_is_closed_set():
    assert [map_outcome(x) for x in ("won", "lost", "void", "pending")] == ["won", "lost", "void", "pending"]
    assert map_outcome("surprise") == "unknown" and map_outcome(None) == "unknown"


def test_published_rows_map_and_stay_pending_without_outcome():
    recs = map_published_payload(json.loads((FIX / "published_predictions.json").read_text()))
    assert len(recs) == 5
    first = recs[0]
    assert first.sport == "tennis" and first.source == "tennis_published"
    assert first.logical_id == "tennis_pub_pub-1" and first.fixture_id == "12168292"
    assert first.event_name == "C. Norrie vs D. Shapovalov"
    assert first.settlement_status == "pending"  # no outcome attached yet
    assert first.published_at.tzinfo is not None
    assert first.period == "match" and recs[2].period == "first_set"


def test_settlement_comes_from_provider_outcome_only():
    dash = json.loads((FIX / "live_beta_dashboard.json").read_text())
    out = settled_outcomes(dash)
    assert set(out) == {"1", "2", "3", "5"}
    raw = json.loads((FIX / "published_predictions.json").read_text())["items"][0]
    rec = map_published_row({**raw, **out["1"]})
    assert rec.settlement_status == "won" and rec.pnl == 0.84
    assert map_published_row({**raw, "outcome": "void"}).settlement_status == "void"


def test_incomplete_rows_are_skipped():
    assert map_published_row({"id": 1}) is None
    assert map_published_payload(None) == []
