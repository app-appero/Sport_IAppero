"""Periodic read-only sync of the Soccer official ledger into our own tables."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

from app.core.config import get_settings
from app.db.models import ProviderFetchRun
from app.db.session import get_sessionmaker
from app.persistence.recorder import record_ledger
from app.providers.soccer.client import SoccerProvider
from app.providers.tennis.client import TennisProvider
from app.services.registry import get_provider

logger = logging.getLogger(__name__)


async def _log_run(
    provider_name: str, endpoint: str, status: str, latency_ms: int, count: int | None, error: str | None
) -> None:
    maker = get_sessionmaker()
    if maker is None:
        return
    async with maker() as session:
        session.add(
            ProviderFetchRun(
                provider=provider_name,
                endpoint=endpoint,
                status=status,
                latency_ms=latency_ms,
                item_count=count,
                error=error[:300] if error else None,
                fetched_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()


async def _sync(sport: str, provider_cls: type, provider_name: str, endpoint: str) -> dict[str, int] | None:
    provider = get_provider(sport)
    if get_sessionmaker() is None or not isinstance(provider, provider_cls):
        return None
    started = time.monotonic()
    try:
        records = await provider.get_official_plays()
        counts = await record_ledger(records)
    except Exception as exc:  # noqa: BLE001
        logger.warning("%s ledger sync failed: %s", sport, exc)
        try:
            await _log_run(provider_name, endpoint, "error", int((time.monotonic() - started) * 1000), None, str(exc))
        except Exception:  # noqa: BLE001
            logger.exception("could not log fetch run")
        return None
    await _log_run(provider_name, endpoint, "ok", int((time.monotonic() - started) * 1000), len(records), None)
    logger.info("%s ledger sync: %s rows, %s", sport, len(records), counts)
    return counts


async def sync_soccer_ledger() -> dict[str, int] | None:
    """One Soccer pass. Returns counts, or None when persistence/provider is unavailable."""
    return await _sync("football", SoccerProvider, "soccer-oracle", "/predictions/official/plays")


async def sync_tennis_ledger() -> dict[str, int] | None:
    return await _sync("tennis", TennisProvider, "tennis-oracle", "/api/published-predictions")


async def ledger_sync_loop() -> None:
    settings = get_settings()
    while True:
        # Independent: one provider failing never blocks the other.
        await sync_soccer_ledger()
        await sync_tennis_ledger()
        await asyncio.sleep(max(60, settings.ledger_sync_interval_seconds))
