from fastapi import APIRouter

from app.services import sport_service

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/providers")
async def health_providers() -> dict[str, dict]:
    return await sport_service.provider_health()
