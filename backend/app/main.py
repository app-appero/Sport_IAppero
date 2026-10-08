from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Allow Expo web / local clients during MVP development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
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
