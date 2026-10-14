from fastapi import APIRouter, HTTPException

from app.core.exceptions import ProviderError
from app.services import player_cards_service

router = APIRouter(tags=["player-cards"])


@router.get("/events/{event_id}/player-cards")
async def event_player_cards(event_id: str) -> dict:
    try:
        return await player_cards_service.get_event_player_cards(event_id)
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail={"code": "PROVIDER_ERROR", "message": str(exc)}) from exc
