from fastapi import APIRouter

from app.api.v1 import health, predictions, sports

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(sports.router)
api_router.include_router(predictions.router)
