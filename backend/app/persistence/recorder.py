"""Append-only recording of what the BFF observes (feed predictions) and of the official ledger."""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from collections.abc import Iterable
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event, PredictionRevision, PredictionSettlement
from app.db.session import get_sessionmaker
from app.domain.models import UnifiedPrediction
from app.providers.soccer.ledger import LedgerRecord

logger = logging.getLogger(__name__)

FEED_SOURCE = "feed_observed"
_background: set[asyncio.Task] = set()


def _now() -> datetime:
    return datetime.now(UTC)


def _aware(dt: datetime | None) -> datetime | None:
    """Naive timestamps have no verifiable zone, so they are treated as unknown."""
    if dt is None or dt.tzinfo is None:
        return None
    return dt.astimezone(UTC)


def pre_match(moment: datetime | None, kickoff: datetime | None) -> bool | None:
    """True only when the publication/observation strictly precedes kickoff."""
    moment, kickoff = _aware(moment), _aware(kickoff)
    if moment is None or kickoff is None:
        return None
    return moment < kickoff


def content_hash(pred: UnifiedPrediction) -> str:
    odds = pred.pricing.odds_decimal if pred.pricing else None
    decision = pred.decision.code if pred.decision else None
    conf = pred.prediction.confidence
    blob = json.dumps(
        [
            pred.prediction.type,
            pred.prediction.selection.name,
            round(conf, 6) if conf is not None else None,
            round(odds, 4) if odds is not None else None,
            decision,
        ],
        separators=(",", ":"),
    )
    return hashlib.sha256(blob.encode()).hexdigest()[:32]


async def _upsert_event(
    session: AsyncSession,
    *,
    sport: str,
    provider: str,
    source_event_id: str,
    name: str | None,
    competition_id: str | None,
    competition_name: str | None,
    participants: list | None,
    start_time: datetime | None,
    now: datetime,
) -> str:
    event_id = f"{sport}:{source_event_id}"
    row = await session.get(Event, event_id)
    if row is None:
        session.add(
            Event(
                id=event_id,
                sport=sport,
                provider=provider,
                source_event_id=source_event_id,
                name=name,
                competition_id=competition_id,
                competition_name=competition_name,
                participants=participants,
                start_time=_aware(start_time),
                first_seen_at=now,
                last_seen_at=now,
            )
        )
        await session.flush()
    else:
        row.last_seen_at = now
        # Fill gaps only; a null from a thinner source never erases a known name.
        row.name = row.name or name
        row.competition_id = row.competition_id or competition_id
        row.competition_name = row.competition_name or competition_name
        row.participants = row.participants or participants
        row.start_time = row.start_time or _aware(start_time)
    return event_id


async def record_predictions(preds: Iterable[UnifiedPrediction]) -> int:
    """Store feed observations. Returns the number of new revisions. Never raises."""
    maker = get_sessionmaker()
    items = [p for p in preds if p.sport == "football"]
    if maker is None or not items:
        return 0
    try:
        for attempt in (1, 2):
            try:
                async with maker() as session:
                    created = await _record(session, items)
                    await session.commit()
                    return created
            except IntegrityError:
                # Concurrent request stored the same revision first: retry once.
                if attempt == 2:
                    raise
    except Exception:  # noqa: BLE001
        logger.exception("record_predictions failed")
    return 0


async def _record(session: AsyncSession, items: list[UnifiedPrediction]) -> int:
    now = _now()
    created = 0
    seen: set[tuple[str, str]] = set()
    for pred in items:
        ev = pred.event
        event_id = await _upsert_event(
            session,
            sport=pred.sport,
            provider=pred.provider.name,
            source_event_id=ev.id,
            name=ev.name or None,
            competition_id=ev.competition.id if ev.competition else None,
            competition_name=ev.competition.name if ev.competition else None,
            participants=[p.model_dump() for p in ev.participants] or None,
            start_time=ev.start_time,
            now=now,
        )
        digest = content_hash(pred)
        key = (pred.id, digest)
        if key in seen:
            continue
        seen.add(key)
        exists = await session.scalar(
            select(PredictionRevision.id).where(
                PredictionRevision.logical_id == pred.id,
                PredictionRevision.content_hash == digest,
            )
        )
        if exists:
            continue
        kickoff = _aware(ev.start_time)
        session.add(
            PredictionRevision(
                logical_id=pred.id,
                content_hash=digest,
                event_id=event_id,
                sport=pred.sport,
                source=FEED_SOURCE,
                is_official=False,
                market=pred.prediction.type,
                selection=pred.prediction.selection.name,
                probability=pred.prediction.confidence,
                odds=pred.pricing.odds_decimal if pred.pricing else None,
                model_name=None,
                model_version=pred.provider.version,
                decision=pred.decision.code if pred.decision else None,
                kickoff_at=kickoff,
                published_at=None,
                observed_at=now,
                pre_match=pre_match(now, kickoff),
            )
        )
        created += 1
    await session.flush()
    return created


def schedule_record(preds: Iterable[UnifiedPrediction]) -> None:
    """Fire-and-forget so persistence never adds latency or failures to a response."""
    if get_sessionmaker() is None:
        return
    items = list(preds)
    if not items:
        return
    task = asyncio.create_task(record_predictions(items))
    _background.add(task)
    task.add_done_callback(_background.discard)


async def record_ledger(records: list[LedgerRecord]) -> dict[str, int]:
    """Upsert official ledger rows: revisions are append-only, settlements follow the provider."""
    maker = get_sessionmaker()
    counts = {"new_revisions": 0, "settlements_updated": 0, "skipped": 0}
    if maker is None or not records:
        return counts
    now = _now()
    async with maker() as session:
        for rec in records:
            event_id = await _upsert_event(
                session,
                sport=rec.sport,
                provider=rec.provider,
                source_event_id=rec.fixture_id,
                name=rec.event_name,
                competition_id=rec.competition_id,
                competition_name=rec.competition_name,
                participants=None,
                start_time=rec.kickoff_at,
                now=now,
            )
            revision = await session.scalar(
                select(PredictionRevision).where(
                    PredictionRevision.source == rec.source,
                    PredictionRevision.source_ref == rec.source_ref,
                )
            )
            if revision is None:
                revision = PredictionRevision(
                    logical_id=rec.logical_id or f"soccer_{rec.fixture_id}_{rec.market}",
                    content_hash=rec.source_ref.replace("-", "")[:32],
                    event_id=event_id,
                    sport=rec.sport,
                    source=rec.source,
                    source_ref=rec.source_ref,
                    is_official=True,
                    market=rec.market,
                    line=rec.line,
                    period=rec.period,
                    selection=rec.selection,
                    probability=rec.probability,
                    odds=rec.odds,
                    model_name=rec.model_name,
                    model_version=rec.model_version,
                    decision=rec.decision,
                    kickoff_at=_aware(rec.kickoff_at),
                    published_at=_aware(rec.published_at),
                    observed_at=now,
                    # Provider's own capture time, not our observation time.
                    pre_match=pre_match(rec.published_at, rec.kickoff_at),
                    payload=rec.payload,
                )
                session.add(revision)
                await session.flush()
                counts["new_revisions"] += 1

            settlement = await session.get(PredictionSettlement, revision.id)
            if settlement is None:
                session.add(
                    PredictionSettlement(
                        revision_id=revision.id,
                        status=rec.settlement_status,
                        source_status=rec.source_status,
                        settled_at=_aware(rec.settled_at),
                        actual_outcome=rec.actual_outcome,
                        pnl=rec.pnl,
                        rule_version=rec.rule_version,
                        updated_at=now,
                    )
                )
                counts["settlements_updated"] += 1
            elif (settlement.status, settlement.source_status) != (
                rec.settlement_status,
                rec.source_status,
            ):
                settlement.status = rec.settlement_status
                settlement.source_status = rec.source_status
                settlement.settled_at = _aware(rec.settled_at)
                settlement.actual_outcome = rec.actual_outcome
                settlement.pnl = rec.pnl
                settlement.rule_version = rec.rule_version
                settlement.updated_at = now
                counts["settlements_updated"] += 1
        await session.commit()
    return counts


async def missing_name_days(sport: str, limit: int = 15) -> list[str]:
    """Europe/Rome days (newest first) of events stored without a name."""
    from zoneinfo import ZoneInfo

    maker = get_sessionmaker()
    if maker is None:
        return []
    async with maker() as session:
        starts = (
            await session.scalars(
                select(Event.start_time).where(
                    Event.sport == sport, Event.name.is_(None), Event.start_time.is_not(None)
                )
            )
        ).all()
    rome = ZoneInfo("Europe/Rome")
    # Stored values are UTC; SQLite (tests) hands them back naive.
    days = {
        (t if t.tzinfo else t.replace(tzinfo=UTC)).astimezone(rome).date().isoformat()
        for t in starts
    }
    return sorted(days, reverse=True)[:limit]


async def apply_event_names(sport: str, events: list) -> int:
    """Fill names/competition/participants for stored events. Never overwrites known values."""
    maker = get_sessionmaker()
    if maker is None or not events:
        return 0
    updated = 0
    async with maker() as session:
        for ev in events:
            row = await session.get(Event, f"{sport}:{ev.id}")
            if row is None or row.name or not ev.name:
                continue
            row.name = ev.name
            row.competition_id = row.competition_id or (ev.competition.id if ev.competition else None)
            row.competition_name = row.competition_name or (ev.competition.name if ev.competition else None)
            row.participants = row.participants or ([p.model_dump() for p in ev.participants] or None)
            updated += 1
        await session.commit()
    return updated
