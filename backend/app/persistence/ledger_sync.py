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
from app.services.registry import get_provider

logger = logging.getLogger(__name__)


async def _log_run(status: str, latency_ms: int, count: int | None, error: str | None) -> None:
    maker = get_sessionmaker()
    if maker is None:
        return
    async with maker() as session:
        session.add(
            ProviderFetchRun(
                provider="soccer-oracle",
                endpoint="/predictions/official/plays",
                status=status,
                latency_ms=latency_ms,
                item_count=count,
                error=error[:300] if error else None,
                fetched_at=datetime.now(timezone.utc),
            )
        )
        await session.commit()


async def sync_soccer_ledger() -> dict[str, int] | None:
    """One sync pass. Returns counts, or None when persistence/provider is unavailable."""
    provider = get_provider("football")
    if get_sessionmaker() is None or not isinstance(provider, SoccerProvider):
        return None
    started = time.monotonic()
    try:
        records = await provider.get_official_plays()
        counts = await record_ledger(records)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Soccer ledger sync failed: %s", exc)
        try:
            await _log_run("error", int((time.monotonic() - started) * 1000), None, str(exc))
        except Exception:  # noqa: BLE001
            logger.exception("could not log fetch run")
        return None
    await _log_run("ok", int((time.monotonic() - started) * 1000), len(records), None)
    logger.info("Soccer ledger sync: %s rows, %s", len(records), counts)
    return counts


async def ledger_sync_loop() -> None:
    settings = get_settings()
    while True:
        await sync_soccer_ledger()
        await asyncio.sleep(max(60, settings.ledger_sync_interval_seconds))
