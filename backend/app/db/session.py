"""Optional database: with no DATABASE_URL the BFF runs exactly as before."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def async_url(url: str) -> str:
    """Railway hands out postgres:// or postgresql://; SQLAlchemy async needs asyncpg."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]
    return url


def persistence_enabled() -> bool:
    return _sessionmaker is not None


def get_sessionmaker() -> async_sessionmaker[AsyncSession] | None:
    return _sessionmaker


def _run_migrations(url: str) -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config()
    cfg.set_main_option("script_location", str(Path(__file__).parent / "migrations"))
    cfg.set_main_option("sqlalchemy.url", url.replace("%", "%%"))
    command.upgrade(cfg, "head")


async def init_db() -> bool:
    """Create the engine and migrate. Never raises: persistence just stays off on failure."""
    global _engine, _sessionmaker
    settings = get_settings()
    if not settings.database_url:
        logger.info("DATABASE_URL not set: persistence disabled")
        return False
    url = async_url(settings.database_url)
    try:
        await asyncio.to_thread(_run_migrations, url)
        _engine = create_async_engine(url, pool_pre_ping=True)
        _sessionmaker = async_sessionmaker(_engine, expire_on_commit=False)
    except Exception:  # noqa: BLE001 — a broken DB must not take the feed down
        logger.exception("Database init failed: persistence disabled")
        _engine = None
        _sessionmaker = None
        return False
    logger.info("Persistence enabled")
    return True


async def close_db() -> None:
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _sessionmaker = None
