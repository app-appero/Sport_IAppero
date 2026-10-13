import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.legal.privacy_text import PRIVACY_POLICY_MD
from app.legal.render import render_page
from app.db.session import close_db, init_db, persistence_enabled
from app.persistence.ledger_sync import ledger_sync_loop
from app.services.registry import close_providers, get_providers


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    sync_task: asyncio.Task | None = None
    if await init_db() and get_settings().ledger_sync_enabled:
        sync_task = asyncio.create_task(ledger_sync_loop())
    yield
    if sync_task:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass
    await close_providers()
    await close_db()


app = FastAPI(
    title="Sport IApperò API",
    version="0.2.0",
    description="BFF Sport IApperò — aggregazione Football (Soccer Oracle) e Tennis Oracle",
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
        "service": "Sport IApperò API",
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
        "feed": "/api/v1/feed",
        "git_sha": settings.deploy_sha,
    }


@app.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
async def privacy_policy() -> HTMLResponse:
    """Informativa privacy (BOZZA da completare): URL pubblico da indicare a Google e agli store."""
    return HTMLResponse(render_page(PRIVACY_POLICY_MD))


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
        "persistence": persistence_enabled(),
        "timezone": settings.app_timezone,
        "git_sha": settings.deploy_sha,
    }
