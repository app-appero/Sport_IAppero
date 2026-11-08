from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.db.session import get_sessionmaker
from app.persistence import history
from app.persistence.history import DEFAULT_DECISION

router = APIRouter(prefix="/history", tags=["history"])


def _maker():
    maker = get_sessionmaker()
    if maker is None:
        raise HTTPException(
            status_code=503,
            detail={"code": "persistence_disabled", "message": "Storico non disponibile: database non configurato"},
        )
    return maker


@router.get("/stats")
async def stats(
    sport: str | None = Query(default=None),
    market: str | None = Query(default=None),
    model_name: str | None = Query(default=None),
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    decision: str = Query(default=DEFAULT_DECISION, pattern="^(PLAY|BORDERLINE|NO BET|all)$"),
) -> dict:
    async with _maker()() as session:
        return await history.compute_stats(
            session, sport=sport, market=market, model_name=model_name, date_from=date_from, date_to=date_to,
            decision=decision,
        )


@router.get("/breakdown")
async def breakdown(
    sport: str | None = Query(default=None),
    market: str | None = Query(default=None),
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    decision: str = Query(default=DEFAULT_DECISION, pattern="^(PLAY|BORDERLINE|NO BET|all)$"),
) -> dict:
    """Per campionato: squadre/tennisti coinvolti nelle giocate, dal più "preso", con i tipi di evento per percentuale."""
    async with _maker()() as session:
        return await history.compute_breakdown(
            session, sport=sport, market=market, date_from=date_from, date_to=date_to, decision=decision,
        )


@router.get("/predictions")
async def predictions(
    sport: str | None = Query(default=None),
    market: str | None = Query(default=None),
    status: str | None = Query(default=None, pattern="^(won|lost|void|pending|not_placed|unknown)$"),
    date_from: date | None = Query(default=None, alias="from"),
    date_to: date | None = Query(default=None, alias="to"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    decision: str = Query(default=DEFAULT_DECISION, pattern="^(PLAY|BORDERLINE|NO BET|all)$"),
) -> dict:
    async with _maker()() as session:
        return await history.list_ledger(
            session,
            sport=sport,
            market=market,
            status=status,
            date_from=date_from,
            date_to=date_to,
            limit=limit,
            offset=offset,
            decision=decision,
        )
