"""Read side: stats with explicit denominators, and the read-only prediction ledger."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event, PredictionRevision, PredictionSettlement

STATUSES = ("won", "lost", "void", "pending", "not_placed", "unknown")


@dataclass
class Counts:
    won: int = 0
    lost: int = 0
    void: int = 0
    pending: int = 0
    not_placed: int = 0
    unknown: int = 0

    def add(self, status: str) -> None:
        key = status if status in STATUSES else "unknown"
        setattr(self, key, getattr(self, key) + 1)

    def as_dict(self) -> dict[str, Any]:
        decided = self.won + self.lost
        return {
            **{k: getattr(self, k) for k in STATUSES},
            "total": sum(getattr(self, k) for k in STATUSES),
            # Denominator is declared: only settled won/lost count. Void, pending
            # and not_placed are reported but never treated as losses.
            "decided": decided,
            "win_rate": round(self.won / decided, 4) if decided else None,
        }


def _start(d: date | None) -> datetime | None:
    return datetime.combine(d, time.min, tzinfo=timezone.utc) if d else None


def _end(d: date | None) -> datetime | None:
    return datetime.combine(d, time.max, tzinfo=timezone.utc) if d else None


def _base_query(
    *,
    sport: str | None,
    market: str | None,
    model_name: str | None,
    date_from: date | None,
    date_to: date | None,
):
    q = (
        select(PredictionRevision, PredictionSettlement, Event)
        .join(PredictionSettlement, PredictionSettlement.revision_id == PredictionRevision.id)
        .join(Event, Event.id == PredictionRevision.event_id)
        .where(PredictionRevision.is_official.is_(True))
    )
    if sport:
        q = q.where(PredictionRevision.sport == sport)
    if market:
        q = q.where(PredictionRevision.market == market)
    if model_name:
        q = q.where(PredictionRevision.model_name == model_name)
    if date_from:
        q = q.where(PredictionRevision.kickoff_at >= _start(date_from))
    if date_to:
        q = q.where(PredictionRevision.kickoff_at <= _end(date_to))
    return q


async def compute_stats(
    session: AsyncSession,
    *,
    sport: str | None = None,
    market: str | None = None,
    model_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    rows = (
        await session.execute(
            _base_query(
                sport=sport, market=market, model_name=model_name, date_from=date_from, date_to=date_to
            )
        )
    ).all()
    groups: dict[tuple, Counts] = {}
    total = Counts()
    excluded_timing = 0
    for rev, sett, _ev in rows:
        # Only publications verifiably made before kickoff enter the performance.
        if rev.pre_match is not True:
            excluded_timing += 1
            continue
        key = (rev.sport, rev.market, rev.model_name, rev.model_version)
        groups.setdefault(key, Counts()).add(sett.status)
        total.add(sett.status)
    return {
        "scope": "official_ledger",
        "filters": {
            "sport": sport,
            "market": market,
            "model_name": model_name,
            "from": date_from.isoformat() if date_from else None,
            "to": date_to.isoformat() if date_to else None,
            "date_field": "kickoff_at (UTC)",
        },
        "totals": total.as_dict(),
        "groups": [
            {
                "sport": k[0],
                "market": k[1],
                "model_name": k[2],
                "model_version": k[3],
                **c.as_dict(),
            }
            for k, c in sorted(groups.items(), key=lambda kv: tuple(str(x) for x in kv[0]))
        ],
        "excluded_not_pre_match": excluded_timing,
        "notes": [
            "win_rate = won / (won + lost); void, pending e not_placed sono riportati ma non contati.",
            "Le conteggi sono aggregati per gruppo; nessuna media dei win rate.",
            "Solo pubblicazioni ufficiali del provider con captured_at precedente al calcio d'inizio.",
        ],
    }


async def list_ledger(
    session: AsyncSession,
    *,
    sport: str | None = None,
    market: str | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict[str, Any]:
    q = _base_query(sport=sport, market=market, model_name=None, date_from=date_from, date_to=date_to)
    if status:
        q = q.where(PredictionSettlement.status == status)
    q = q.order_by(PredictionRevision.kickoff_at.desc(), PredictionRevision.id.desc())
    rows = (await session.execute(q.limit(limit).offset(offset))).all()
    items = [
        {
            "revision_id": rev.id,
            "source_ref": rev.source_ref,
            "sport": rev.sport,
            "event_id": ev.id,
            "event_name": ev.name,  # null when the feed never exposed the team names
            "market": rev.market,
            "line": rev.line,
            "selection": rev.selection,
            "probability": rev.probability,
            "odds": rev.odds,
            "model_name": rev.model_name,
            "model_version": rev.model_version,
            "decision": rev.decision,
            "kickoff_at": rev.kickoff_at,
            "published_at": rev.published_at,
            "pre_match": rev.pre_match,
            "settlement": {
                "status": sett.status,
                "source_status": sett.source_status,
                "settled_at": sett.settled_at,
                "actual_outcome": sett.actual_outcome,
                "pnl": sett.pnl,
            },
        }
        for rev, sett, ev in rows
    ]
    return {"items": items, "limit": limit, "offset": offset, "count": len(items)}
