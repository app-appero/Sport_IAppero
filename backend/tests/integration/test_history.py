import os
import time

import pytest
from fastapi.testclient import TestClient

os.environ["USE_PROVIDER_FIXTURES"] = "true"

from app.core.config import get_settings
from app.main import app
from app.services.feed_service import reset_feed_state
from app.services.registry import get_providers


@pytest.fixture
def db_client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    monkeypatch.setenv("USE_PROVIDER_FIXTURES", "true")
    get_settings.cache_clear()
    get_providers.cache_clear()
    reset_feed_state()
    with TestClient(app) as client:
        yield client
    get_settings.cache_clear()
    get_providers.cache_clear()
    reset_feed_state()


def _wait_for_ledger(client: TestClient) -> dict:
    # The ledger sync runs once at startup in the background.
    for _ in range(50):
        data = client.get("/api/v1/history/predictions", params={"limit": 200}).json()
        if data.get("count", 0) >= 9:  # 4 football + 5 tennis rows
            return data
        time.sleep(0.1)
    raise AssertionError("ledger not synced")


def test_ready_reports_persistence(db_client):
    assert db_client.get("/ready").json()["persistence"] is True


def test_stats_use_declared_denominators_and_exclude_unverified_timing(db_client):
    _wait_for_ledger(db_client)
    stats = db_client.get("/api/v1/history/stats", params={"sport": "football"}).json()
    # Fixture: loss, win, void, pending, plus a loss captured AFTER kickoff.
    assert stats["excluded_not_pre_match"] == 1
    t = stats["totals"]
    assert (t["won"], t["lost"], t["void"], t["pending"]) == (1, 1, 1, 1)
    assert t["decided"] == 2 and t["win_rate"] == 0.5 and t["total"] == 4
    # Void/pending are never counted as losses.
    by_market = {g["market"]: g for g in stats["groups"]}
    assert by_market["btts"]["win_rate"] is None and by_market["btts"]["void"] == 1


def test_tennis_ledger_uses_provider_outcomes_and_rome_kickoff(db_client):
    _wait_for_ledger(db_client)
    stats = db_client.get("/api/v1/history/stats", params={"sport": "tennis"}).json()
    t = stats["totals"]
    # Fixture: won, void, lost, pending (future) + one lost published AFTER kickoff.
    assert (t["won"], t["lost"], t["void"], t["pending"]) == (1, 1, 1, 1)
    assert t["decided"] == 2 and t["win_rate"] == 0.5
    assert stats["excluded_not_pre_match"] == 1
    items = db_client.get(
        "/api/v1/history/predictions", params={"sport": "tennis", "limit": 50}
    ).json()["items"]
    names = {i["event_name"] for i in items}
    assert "C. Norrie vs D. Shapovalov" in names
    assert all(i["kickoff_at"] for i in items)


def test_stats_filters_and_ledger_list(db_client):
    _wait_for_ledger(db_client)
    only_h2h = db_client.get(
        "/api/v1/history/stats", params={"sport": "football", "market": "h2h"}
    ).json()
    assert only_h2h["totals"]["won"] == 1 and only_h2h["totals"]["lost"] == 0
    lost = db_client.get(
        "/api/v1/history/predictions", params={"status": "lost", "sport": "football"}
    ).json()
    assert {i["market"] for i in lost["items"]} == {"under_over_3_5", "h2h"}
    assert all(i["event_name"] is None or isinstance(i["event_name"], str) for i in lost["items"])
    assert db_client.get("/api/v1/history/predictions", params={"status": "bogus"}).status_code == 422


@pytest.mark.asyncio
async def test_resync_is_idempotent_and_updates_settlement(tmp_path, monkeypatch):
    import json
    from pathlib import Path

    from sqlalchemy import func, select

    from app.db import session as db_session
    from app.db.models import PredictionRevision, PredictionSettlement
    from app.persistence.recorder import record_ledger
    from app.providers.soccer.ledger import map_ledger_payload

    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'idem.db'}")
    get_settings.cache_clear()
    assert await db_session.init_db()
    try:
        fixture = Path(__file__).parent.parent / "fixtures" / "soccer" / "official_plays.json"
        records = map_ledger_payload(json.loads(fixture.read_text()))
        first = await record_ledger(records)
        second = await record_ledger(records)
        assert first["new_revisions"] == 5 and second["new_revisions"] == 0
        assert second["settlements_updated"] == 0

        # Pending row settles later: revision untouched, settlement updated in place.
        pending = next(r for r in records if r.settlement_status == "pending")
        from dataclasses import replace

        settled = replace(pending, settlement_status="won", source_status="settled_win")
        third = await record_ledger([settled])
        assert third["new_revisions"] == 0 and third["settlements_updated"] == 1

        async with db_session.get_sessionmaker()() as session:
            revisions = await session.scalar(select(func.count()).select_from(PredictionRevision))
            statuses = (await session.scalars(select(PredictionSettlement.status))).all()
        assert revisions == 5
        assert sorted(statuses) == ["lost", "lost", "void", "won", "won"]
    finally:
        await db_session.close_db()
        get_settings.cache_clear()


def test_feed_observations_are_recorded_append_only(db_client):
    _wait_for_ledger(db_client)
    before = db_client.get("/api/v1/history/stats", params={"sport": "football"}).json()["totals"]
    db_client.get("/api/v1/sports/football/predictions", params={"date": "2026-09-20"})
    time.sleep(0.5)
    db_client.get("/api/v1/sports/football/predictions", params={"date": "2026-09-20"})
    time.sleep(0.5)
    # Feed observations are not official: they never enter the performance stats.
    after = db_client.get("/api/v1/history/stats", params={"sport": "football"}).json()["totals"]
    assert after == before
    items = db_client.get("/api/v1/history/predictions", params={"limit": 200}).json()["items"]
    assert all(i["settlement"]["status"] for i in items)


def test_history_requires_database(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("USE_PROVIDER_FIXTURES", "true")
    get_settings.cache_clear()
    get_providers.cache_clear()
    with TestClient(app) as client:
        res = client.get("/api/v1/history/stats")
        assert res.status_code == 503
        assert res.json()["detail"]["code"] == "persistence_disabled"
        assert client.get("/ready").json()["persistence"] is False
        # Feed still works without a database.
        assert client.get("/api/v1/feed", params={"date": "2026-09-20"}).status_code == 200
    get_settings.cache_clear()
    get_providers.cache_clear()
