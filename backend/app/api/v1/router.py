from fastapi import APIRouter

from app.api.v1 import auth, feed, health, history, predictions, sports

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(sports.router)
api_router.include_router(predictions.router)
api_router.include_router(feed.router)
api_router.include_router(history.router)
api_router.include_router(auth.router)
