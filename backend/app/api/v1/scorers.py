from fastapi import APIRouter, HTTPException, Query

from app.core.exceptions import ProviderError
from app.services import scorers_service

router = APIRouter(tags=["scorers"])


@router.get("/scorers")
async def scorers(date: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$")) -> dict:
    try:
        return await scorers_service.get_scorers(date)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail={"code": "PROVIDER_ERROR", "message": str(exc)}) from exc


@router.get("/events/{event_id}/scorers")
async def event_scorers(event_id: str) -> dict:
    try:
        return await scorers_service.get_event_scorers(event_id)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail={"code": "PROVIDER_ERROR", "message": str(exc)}) from exc
