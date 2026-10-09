from fastapi import APIRouter, HTTPException, Query

from app.core.exceptions import (
    EventNotFound,
    InvalidCursor,
    ProviderError,
    SnapshotExpired,
)
from app.domain.models import FeedItem, FeedResponse
from app.services import feed_service

router = APIRouter(tags=["feed"])


@router.get("/feed", response_model=FeedResponse)
async def feed(
    date: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
    timezone: str | None = Query(default=None, alias="timezone"),
    sports: str | None = Query(default=None, description="CSV: football,tennis"),
    market: str | None = Query(default=None),
    competition: str | None = Query(default=None),
    sort: str = Query(default="start_time_asc"),
    limit: int = Query(default=30, ge=1, le=100),
    cursor: str | None = Query(default=None),
) -> FeedResponse:
    try:
        return await feed_service.get_feed(
            date=date,
            timezone_name=timezone,
            sports=sports,
            market=market,
            competition=competition,
            sort=sort,
            limit=limit,
            cursor=cursor,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_FILTERS", "message": str(exc)},
        ) from exc
    except InvalidCursor as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_CURSOR", "message": str(exc)},
        ) from exc
    except SnapshotExpired as exc:
        raise HTTPException(
            status_code=410,
            detail={"code": "SNAPSHOT_EXPIRED", "message": str(exc)},
        ) from exc
    except ProviderError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "PROVIDERS_UNAVAILABLE", "message": exc.message},
        ) from exc


@router.get("/events/{event_id}", response_model=FeedItem)
async def event_detail(event_id: str) -> FeedItem:
    """Event detail from a recent feed snapshot (cache)."""
    try:
        return await feed_service.get_event_from_snapshots(event_id)
    except EventNotFound as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": "EVENT_NOT_FOUND", "message": str(exc)},
        ) from exc
