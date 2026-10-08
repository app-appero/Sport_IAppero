from fastapi import APIRouter, HTTPException, Query

from app.domain.models import (
    CompetitionListResponse,
    EventListResponse,
    MarketListResponse,
    PredictionListResponse,
    SportInfo,
)
from app.services import sport_service

router = APIRouter(tags=["sports"])


@router.get("/sports", response_model=list[SportInfo])
async def sports() -> list[SportInfo]:
    return sport_service.list_sports()


@router.get("/sports/{sport}/competitions", response_model=CompetitionListResponse)
async def competitions(
    sport: str,
    date: str | None = Query(default=None),
) -> CompetitionListResponse:
    try:
        return await sport_service.list_competitions(sport, date=date)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}") from exc


@router.get("/sports/{sport}/events", response_model=EventListResponse)
async def events(
    sport: str,
    date: str | None = Query(default=None),
    competition_id: str | None = Query(default=None),
) -> EventListResponse:
    try:
        return await sport_service.list_events(
            sport, date=date, competition_id=competition_id
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}") from exc


@router.get("/sports/{sport}/markets", response_model=MarketListResponse)
async def markets(sport: str) -> MarketListResponse:
    try:
        return await sport_service.list_markets(sport)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}") from exc


@router.get("/sports/{sport}/predictions", response_model=PredictionListResponse)
async def predictions(
    sport: str,
    date: str | None = Query(default=None),
    competition_id: str | None = Query(default=None),
    event_id: str | None = Query(default=None),
    market: str | None = Query(default=None),
    min_confidence: float | None = Query(default=None, ge=0.0, le=1.0),
    limit: int | None = Query(default=None, ge=1, le=200),
) -> PredictionListResponse:
    try:
        return await sport_service.list_predictions(
            sport,
            date=date,
            competition_id=competition_id,
            event_id=event_id,
            market=market,
            min_confidence=min_confidence,
            limit=limit,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown sport: {sport}") from exc
