"""Periodic read-only sync of the Soccer official ledger into our own tables."""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

from app.core.config import get_settings
from app.db.models import ProviderFetchRun
from app.db.session import get_sessionmaker
from app.persistence.recorder import apply_event_names, missing_name_days, record_ledger
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


_names_tried: set[str] = set()


async def enrich_football_names(max_days: int = 15) -> int:
    """Ledger rows carry only the fixture id: ask the provider for that day's matches.

    Days the provider cannot resolve are not retried until restart, and a name is never invented.
    """
    provider = get_provider("football")
    if get_sessionmaker() is None or not isinstance(provider, SoccerProvider):
        return 0
    filled = 0
    for day in [d for d in await missing_name_days("football", 60) if d not in _names_tried][:max_days]:
        try:
            events = await provider.get_events(date=day, with_predictions=False)
        except Exception as exc:  # noqa: BLE001 — retry on the next pass
            logger.info("football names for %s unavailable: %s", day, exc)
            continue
        _names_tried.add(day)
        filled += await apply_event_names("football", events)
    if filled:
        logger.info("football event names filled: %s", filled)
    return filled


async def sync_tennis_ledger() -> dict[str, int] | None:
    return await _sync("tennis", TennisProvider, "tennis-oracle", "/api/published-predictions")


async def ledger_sync_loop() -> None:
    settings = get_settings()
    while True:
        # Independent: one provider failing never blocks the other.
        await sync_soccer_ledger()
        try:
            await enrich_football_names()
        except Exception:  # noqa: BLE001
            logger.exception("name enrichment failed")
        await sync_tennis_ledger()
        await asyncio.sleep(max(60, settings.ledger_sync_interval_seconds))
