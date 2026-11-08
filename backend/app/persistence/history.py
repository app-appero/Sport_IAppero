"""Read side: stats with explicit denominators, and the read-only prediction ledger."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Event, PredictionRevision, PredictionSettlement
from app.domain.leagues import placeholder_league_id, real_league_name, soccer_league_name

# The performance shown to users is about recommended plays only; tracked-but-discarded
# rows (NO BET, BORDERLINE) stay in the database and can be requested explicitly.
DEFAULT_DECISION = "PLAY"
DECISIONS = ("PLAY", "BORDERLINE", "NO BET", "all")
# Markets the engines track but have not promoted yet: never part of the history shown to users
# (corner: not promoted). The rows stay in the database.
NOT_PROMOTED_MARKET_PREFIXES = ("corners",)
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
    return datetime.combine(d, time.min, tzinfo=UTC) if d else None


def _end(d: date | None) -> datetime | None:
    return datetime.combine(d, time.max, tzinfo=UTC) if d else None


def _base_query(
    *,
    sport: str | None,
    market: str | None,
    model_name: str | None,
    date_from: date | None,
    date_to: date | None,
    decision: str | None = DEFAULT_DECISION,
):
    q = (
        select(PredictionRevision, PredictionSettlement, Event)
        .join(PredictionSettlement, PredictionSettlement.revision_id == PredictionRevision.id)
        .join(Event, Event.id == PredictionRevision.event_id)
        .where(PredictionRevision.is_official.is_(True))
    )
    for prefix in NOT_PROMOTED_MARKET_PREFIXES:
        q = q.where(~PredictionRevision.market.like(f"{prefix}%"))
    if sport:
        q = q.where(PredictionRevision.sport == sport)
    if decision and decision != "all":
        q = q.where(PredictionRevision.decision == decision)
    if market:
        q = q.where(PredictionRevision.market == market)
    if model_name:
        q = q.where(PredictionRevision.model_name == model_name)
    if date_from:
        q = q.where(PredictionRevision.kickoff_at >= _start(date_from))
    if date_to:
        q = q.where(PredictionRevision.kickoff_at <= _end(date_to))
    return q


def _latest_versions_only(rows: list) -> list:
    """Tennis corrections share a logical_id: only the newest version counts."""
    newest: dict[str, int] = {}
    for rev, _s, _e in rows:
        if rev.source == "tennis_published":
            newest[rev.logical_id] = max(newest.get(rev.logical_id, 0), rev.id)
    return [
        r for r in rows if r[0].source != "tennis_published" or newest[r[0].logical_id] == r[0].id
    ]


async def compute_stats(
    session: AsyncSession,
    *,
    sport: str | None = None,
    market: str | None = None,
    model_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    decision: str | None = DEFAULT_DECISION,
) -> dict[str, Any]:
    rows = (
        await session.execute(
            _base_query(
                sport=sport,
                market=market,
                model_name=model_name,
                date_from=date_from,
                date_to=date_to,
                decision=decision,
            )
        )
    ).all()
    groups: dict[tuple, Counts] = {}
    total = Counts()
    excluded_timing = 0
    rows = _latest_versions_only(rows)
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
            "decision": decision or DEFAULT_DECISION,
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
            "Per default solo le giocate consigliate (decision = PLAY); "
            "decision=all include anche NO BET e BORDERLINE.",
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
    decision: str | None = DEFAULT_DECISION,
) -> dict[str, Any]:
    q = _base_query(
        sport=sport,
        market=market,
        model_name=None,
        date_from=date_from,
        date_to=date_to,
        decision=decision,
    )
    if status:
        q = q.where(PredictionSettlement.status == status)
    q = q.order_by(PredictionRevision.kickoff_at.desc(), PredictionRevision.id.desc())
    rows = (await session.execute(q.limit(limit).offset(offset))).all()
    rows = _latest_versions_only(rows)
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


_VS = re.compile(r"\s+(?:vs\.?|v|-)\s+", re.IGNORECASE)


def _participant_names(ev: Event) -> list[str]:
    """The two sides of a match: stored participants first, else the "A vs B" event name. Never invented."""
    names: list[str] = []
    for p in ev.participants or []:
        name = p.get("name") if isinstance(p, dict) else p if isinstance(p, str) else None
        if isinstance(name, str) and name.strip():
            names.append(name.strip())
    if len(names) >= 2:
        return names[:2]
    if ev.name:
        parts = [x.strip() for x in _VS.split(ev.name, maxsplit=1) if x.strip()]
        if len(parts) == 2:
            return parts
    return names


def _competition_label(ev: Event, known_names: dict[tuple[str, str], str]) -> str:
    # "League 138" is a placeholder stored when only the id was known; "League Serie A" is a real name with the
    # prefix the BFF used to add.
    real = real_league_name(ev.competition_name)
    if real:
        return real
    league_id = ev.competition_id or placeholder_league_id(ev.competition_name)
    if league_id:
        # The official ledger carries only the league id: the engine's configured leagues first, then the
        # name another event of the same league already has (seen in the feed). Never invented.
        return (
            (ev.sport == "football" and soccer_league_name(league_id))
            or known_names.get((ev.sport, league_id))
            or f"Campionato n. {league_id}"
        )
    return "Campionato non indicato"


async def _known_competition_names(session: AsyncSession) -> dict[tuple[str, str], str]:
    rows = (
        await session.execute(
            select(Event.sport, Event.competition_id, Event.competition_name)
            .where(Event.competition_id.is_not(None), Event.competition_name.is_not(None))
            .distinct()
        )
    ).all()
    names: dict[tuple[str, str], str] = {}
    for sport, cid, cname in rows:
        real = real_league_name(cname)
        if real:
            names.setdefault((sport, cid), real)
    return names


def _ranked(entities: dict[str, "_Entity"]) -> list[dict[str, Any]]:
    """Most "prese" first, then higher rate, then name. Markets of each entity by rate (then by decided)."""
    out = []
    for name, ent in entities.items():
        counts = ent.counts.as_dict()
        markets = []
        for market, mc in ent.markets.items():
            m = mc.as_dict()
            markets.append({
                "market": market, "won": m["won"], "lost": m["lost"], "decided": m["decided"],
                "total": m["total"], "win_rate": m["win_rate"],
            })
        markets.sort(key=lambda m: (-(m["win_rate"] if m["win_rate"] is not None else -1), -m["decided"], m["market"]))
        out.append({"name": name, **counts, "markets": markets})
    out.sort(key=lambda e: (-e["won"], -(e["win_rate"] if e["win_rate"] is not None else -1), -e["decided"], e["name"]))
    return out


@dataclass
class _Entity:
    counts: Counts = field(default_factory=Counts)
    markets: dict[str, Counts] = field(default_factory=dict)


@dataclass
class _Competition:
    counts: Counts = field(default_factory=Counts)
    entities: dict[str, _Entity] = field(default_factory=dict)


async def compute_breakdown(
    session: AsyncSession,
    *,
    sport: str | None = None,
    market: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    decision: str | None = DEFAULT_DECISION,
) -> dict[str, Any]:
    """Per competition: teams / players "involved" in the plays (a play counts for BOTH sides of the match),
    most "prese" first; under each, the market types by rate. Same rules as `compute_stats`: official ledger,
    verifiably pre-match, default only PLAY, markets not promoted yet excluded."""
    rows = (
        await session.execute(
            _base_query(
                sport=sport, market=market, model_name=None, date_from=date_from, date_to=date_to,
                decision=decision,
            )
        )
    ).all()
    rows = _latest_versions_only(rows)
    known_names = await _known_competition_names(session)
    comps: dict[str, _Competition] = {}
    excluded_timing = 0
    without_names = 0
    for rev, sett, ev in rows:
        if rev.pre_match is not True:
            excluded_timing += 1
            continue
        comp = comps.setdefault(_competition_label(ev, known_names), _Competition())
        comp.counts.add(sett.status)
        names = _participant_names(ev)
        if not names:
            without_names += 1
            continue
        for name in dict.fromkeys(names):
            ent = comp.entities.setdefault(name, _Entity())
            ent.counts.add(sett.status)
            ent.markets.setdefault(rev.market, Counts()).add(sett.status)
    competitions = []
    for label, comp in comps.items():
        competitions.append({"competition": label, **comp.counts.as_dict(), "entities": _ranked(comp.entities)})
    competitions.sort(key=lambda c: (-c["won"], -c["decided"], c["competition"]))
    return {
        "scope": "official_ledger",
        "filters": {
            "sport": sport, "market": market, "decision": decision or DEFAULT_DECISION,
            "from": date_from.isoformat() if date_from else None,
            "to": date_to.isoformat() if date_to else None,
        },
        "competitions": competitions,
        "excluded_not_pre_match": excluded_timing,
        "without_participant_names": without_names,
        "notes": [
            "Una giocata conta per entrambe le squadre (o i due giocatori) della partita.",
            "Ordine: più prese prima; a parità, percentuale più alta. I tipi di evento sono per percentuale.",
            "win_rate = prese / (prese + perse); annullate e in attesa non contano come perse.",
        ],
    }
