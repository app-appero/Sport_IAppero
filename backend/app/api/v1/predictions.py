from fastapi import APIRouter, HTTPException, Query

from app.core.exceptions import PredictionNotFound, ProviderError
from app.domain.models import MarketListResponse, PredictionListResponse, UnifiedPrediction
from app.services import sport_service

router = APIRouter(tags=["predictions"])


@router.get("/predictions/{prediction_id}", response_model=UnifiedPrediction)
async def prediction_detail(prediction_id: str) -> UnifiedPrediction:
    try:
        from app.services import feed_service

        return await feed_service.require_prediction(prediction_id)
    except PredictionNotFound as exc:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "PREDICTION_NOT_FOUND",
                    "message": str(exc),
                }
            },
        ) from exc
    except ProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": {
                    "code": "PROVIDER_UNAVAILABLE",
                    "message": exc.message,
                    "provider": exc.provider,
                }
            },
        ) from exc


@router.get("/events/{event_id}/predictions", response_model=PredictionListResponse)
async def event_predictions(
    event_id: str,
    sport: str | None = Query(default=None),
    date: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> PredictionListResponse:
    items = await sport_service.list_event_predictions(event_id, sport=sport, date=date)
    sport_id = items[0].sport if items else (sport or "unknown")
    provider = items[0].provider.name if items else "unknown"
    from app.domain.models import ListMeta

    return PredictionListResponse(
        items=items,
        meta=ListMeta(
            count=len(items),
            sport=sport_id,
            provider=provider,
            provider_status="ok" if items else "unavailable",
        ),
    )


@router.get("/events/{event_id}/markets", response_model=MarketListResponse)
async def event_markets(event_id: str) -> MarketListResponse:
    return await sport_service.list_event_markets(event_id)
