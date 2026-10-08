from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.logging import setup_logging
from app.services.registry import close_providers


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    yield
    await close_providers()


app = FastAPI(
    title="Oracle Sports API",
    version="0.1.0",
    description="BFF aggregating Football (Soccer Oracle) and Tennis Oracle predictions",
    lifespan=lifespan,
)
app.include_router(api_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "Oracle Sports API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
