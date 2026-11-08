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


@pytest.mark.asyncio
async def test_default_counts_only_recommended_plays_and_names_are_filled(tmp_path, monkeypatch):
    import json
    from dataclasses import replace
    from pathlib import Path

    from app.db import session as db_session
    from app.domain.models import Event as DomainEvent
    from app.persistence import history
    from app.persistence.recorder import apply_event_names, missing_name_days, record_ledger
    from app.providers.soccer.ledger import map_ledger_payload

    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'dec.db'}")
    get_settings.cache_clear()
    assert await db_session.init_db()
    try:
        fixture = Path(__file__).parent.parent / "fixtures" / "soccer" / "official_plays.json"
        records = map_ledger_payload(json.loads(fixture.read_text()))
        no_bet = replace(
            records[1], source_ref="no-bet-1", fixture_id="999", decision="NO BET", settlement_status="won"
        )
        await record_ledger(records + [no_bet])

        async with db_session.get_sessionmaker()() as session:
            default = await history.compute_stats(session, sport="football")
            everything = await history.compute_stats(session, sport="football", decision="all")
            only_nobet = await history.compute_stats(session, sport="football", decision="NO BET")
            listed = await history.list_ledger(session, sport="football")
        assert default["filters"]["decision"] == "PLAY"
        assert default["totals"]["won"] == 1  # the NO BET win is not counted
        assert everything["totals"]["won"] == 2
        assert only_nobet["totals"]["total"] == 1
        assert all(i["decision"] == "PLAY" for i in listed["items"])

        # Names: only filled where missing, never overwritten.
        assert "2026-10-03" in await missing_name_days("football")
        evs = [DomainEvent(id="1579486", name="Roma vs Lazio"), DomainEvent(id="404", name="Ghost")]
        assert await apply_event_names("football", evs) == 1
        assert await apply_event_names("football", [DomainEvent(id="1579486", name="Other")]) == 0
        async with db_session.get_sessionmaker()() as session:
            items = (await history.list_ledger(session, sport="football", limit=50))["items"]
        assert "Roma vs Lazio" in {i["event_name"] for i in items}
    finally:
        await db_session.close_db()
        get_settings.cache_clear()


async def test_history_hides_markets_not_promoted_yet(tmp_path, monkeypatch):
    import json
    from dataclasses import replace
    from pathlib import Path

    from app.db import session as db_session
    from app.persistence import history
    from app.persistence.recorder import record_ledger
    from app.providers.soccer.ledger import map_ledger_payload

    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'hide.db'}")
    get_settings.cache_clear()
    assert await db_session.init_db()
    try:
        fixture = Path(__file__).parent.parent / "fixtures" / "soccer" / "official_plays.json"
        records = map_ledger_payload(json.loads(fixture.read_text()))
        corners = [
            replace(records[1], source_ref="corners-1", fixture_id="998", market="corners", line=None,
                    settlement_status="won"),
            replace(records[1], source_ref="corners-2", fixture_id="997", market="corners_line_9_5",
                    settlement_status="lost"),
        ]
        await record_ledger(records + corners)

        async with db_session.get_sessionmaker()() as session:
            stats = await history.compute_stats(session, sport="football", decision="all")
            listed = await history.list_ledger(session, sport="football", decision="all", limit=200)
            only_corners = await history.compute_stats(session, sport="football", market="corners", decision="all")
        assert not any(g["market"].startswith("corners") for g in stats["groups"])
        assert not any(i["market"].startswith("corners") for i in listed["items"])
        assert only_corners["totals"]["total"] == 0
        assert stats["totals"]["total"] == 4  # the five fixture rows minus the one excluded for timing
    finally:
        await db_session.close_db()
        get_settings.cache_clear()


async def test_breakdown_by_competition_counts_both_sides_and_orders_by_prese(tmp_path, monkeypatch):
    import json
    from dataclasses import replace
    from pathlib import Path

    from app.db import session as db_session
    from app.domain.models import Event as DomainEvent
    from app.persistence import history
    from app.persistence.recorder import apply_event_names, record_ledger
    from app.providers.soccer.ledger import map_ledger_payload

    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'brk.db'}")
    get_settings.cache_clear()
    assert await db_session.init_db()
    try:
        fixture = Path(__file__).parent.parent / "fixtures" / "soccer" / "official_plays.json"
        records = map_ledger_payload(json.loads(fixture.read_text()))
        # 1579486 under_over_3_5 lost (Roma-Lazio), 1579487 h2h won (Roma-Milan), 1579490 h2h lost (post-kickoff: excluded)
        extra_win = replace(records[1], source_ref="extra-win", market="goal_no_goal", settlement_status="won")
        corners = replace(records[1], source_ref="corners-x", market="corners", settlement_status="won")
        await record_ledger(records + [extra_win, corners])
        await apply_event_names("football", [
            DomainEvent(id="1579486", name="Roma vs Lazio"),
            DomainEvent(id="1579487", name="Roma vs Milan"),
            DomainEvent(id="1579488", name="Napoli vs Inter"),
        ])

        async with db_session.get_sessionmaker()() as session:
            res = await history.compute_breakdown(session, sport="football")
        comps = res["competitions"]
        assert len(comps) == 1 and comps[0]["competition"] == "Campionato n. 492"
        ents = {e["name"]: e for e in comps[0]["entities"]}
        # Roma is in 3 plays (loss, win, win): both sides of every match count.
        assert (ents["Roma"]["won"], ents["Roma"]["lost"]) == (2, 1)
        assert ents["Milan"]["won"] == 2 and ents["Lazio"]["lost"] == 1
        names_in_order = [e["name"] for e in comps[0]["entities"]]
        # Roma and Milan both have 2 prese: the higher rate (Milan 100% vs Roma 67%) goes first.
        assert names_in_order[:2] == ["Milan", "Roma"]
        assert names_in_order.index("Roma") < names_in_order.index("Lazio")
        # Under Roma: market types by rate (goal_no_goal 100%, h2h 100%, under_over_3_5 0%).
        rates = [m["win_rate"] for m in ents["Roma"]["markets"]]
        assert rates == sorted(rates, reverse=True) and ents["Roma"]["markets"][-1]["market"] == "under_over_3_5"
        assert not any(m["market"].startswith("corners") for e in comps[0]["entities"] for m in e["markets"])
        assert res["excluded_not_pre_match"] >= 1
    finally:
        await db_session.close_db()
        get_settings.cache_clear()


async def test_breakdown_names_competition_from_other_events_of_the_same_league(tmp_path, monkeypatch):
    import json
    from pathlib import Path

    from sqlalchemy import update

    from app.db import session as db_session
    from app.db.models import Event
    from app.persistence import history
    from app.persistence.recorder import record_ledger
    from app.providers.soccer.ledger import map_ledger_payload

    monkeypatch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{tmp_path / 'brk2.db'}")
    get_settings.cache_clear()
    assert await db_session.init_db()
    try:
        fixture = Path(__file__).parent.parent / "fixtures" / "soccer" / "official_plays.json"
        await record_ledger(map_ledger_payload(json.loads(fixture.read_text())))
        async with db_session.get_sessionmaker()() as session:
            await session.execute(
                update(Event).where(Event.source_event_id == "1579487").values(competition_name="Serie A")
            )
            await session.commit()
            res = await history.compute_breakdown(session, sport="football")
        assert [c["competition"] for c in res["competitions"]] == ["Serie A"]
    finally:
        await db_session.close_db()
        get_settings.cache_clear()
