from fastapi import APIRouter

from app.api.v1 import admin, auth, feed, health, history, player_cards, predictions, scorers, sports

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(sports.router)
api_router.include_router(predictions.router)
api_router.include_router(feed.router)
api_router.include_router(history.router)
api_router.include_router(scorers.router)
api_router.include_router(player_cards.router)
api_router.include_router(auth.router)
api_router.include_router(admin.router)
