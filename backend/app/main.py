from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.services.registry import close_providers, get_providers


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    yield
    await close_providers()


app = FastAPI(
    title="Oracle Sports API",
    version="0.2.0",
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
    settings = get_settings()
    return {
        "service": "Oracle Sports API",
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "feed": "/api/v1/feed",
        "git_sha": settings.deploy_sha,
    }


@app.get("/health")
async def liveness() -> dict[str, str]:
    """Process liveness — never calls upstream providers."""
    settings = get_settings()
    return {"status": "ok", "git_sha": settings.deploy_sha}


@app.get("/ready")
async def readiness() -> dict:
    """Readiness: config loaded and providers registered (does not probe upstream)."""
    settings = get_settings()
    providers = get_providers()
    return {
        "status": "ok",
        "providers": sorted(providers.keys()),
        "fixtures": settings.use_provider_fixtures,
        "timezone": settings.app_timezone,
        "git_sha": settings.deploy_sha,
    }
