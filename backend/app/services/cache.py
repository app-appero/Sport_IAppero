"""In-memory TTL cache with single-flight for feed snapshots."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, TypeVar

T = TypeVar("T")


@dataclass
class CacheEntry:
    value: Any
    created_at: float
    expires_at: float
    stale_until: float


@dataclass
class SnapshotStore:
    """Process-local snapshot registry (TTL)."""

    ttl_seconds: int
    _entries: dict[str, CacheEntry] = field(default_factory=dict)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def get(self, snapshot_id: str) -> Any | None:
        entry = self._entries.get(snapshot_id)
        if not entry:
            return None
        now = time.monotonic()
        if now > entry.stale_until:
            self._entries.pop(snapshot_id, None)
            return None
        return entry.value

    def put(self, snapshot_id: str, value: Any) -> None:
        now = time.monotonic()
        self._entries[snapshot_id] = CacheEntry(
            value=value,
            created_at=now,
            expires_at=now + self.ttl_seconds,
            stale_until=now + self.ttl_seconds,
        )
        self._purge_expired(now)

    def _purge_expired(self, now: float) -> None:
        dead = [k for k, v in self._entries.items() if now > v.stale_until]
        for key in dead:
            self._entries.pop(key, None)


class SingleFlightCache:
    """Cache keyed values; concurrent builders for the same key share one awaitable."""

    def __init__(self, ttl_seconds: int, stale_max_seconds: int) -> None:
        self.ttl_seconds = ttl_seconds
        self.stale_max_seconds = stale_max_seconds
        self._entries: dict[str, CacheEntry] = {}
        self._inflight: dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()

    def get_fresh(self, key: str) -> Any | None:
        entry = self._entries.get(key)
        if not entry:
            return None
        now = time.monotonic()
        if now <= entry.expires_at:
            return entry.value
        return None

    def get_stale(self, key: str) -> Any | None:
        entry = self._entries.get(key)
        if not entry:
            return None
        now = time.monotonic()
        if now <= entry.stale_until:
            return entry.value
        self._entries.pop(key, None)
        return None

    async def get_or_build(self, key: str, builder: Callable[[], Awaitable[T]]) -> T:
        fresh = self.get_fresh(key)
        if fresh is not None:
            return fresh

        async with self._lock:
            fresh = self.get_fresh(key)
            if fresh is not None:
                return fresh
            existing = self._inflight.get(key)
            if existing is None:
                loop = asyncio.get_running_loop()
                fut: asyncio.Future = loop.create_future()
                self._inflight[key] = fut
                owner = True
            else:
                owner = False
                fut = existing

        if not owner:
            return await fut

        try:
            value = await builder()
            now = time.monotonic()
            self._entries[key] = CacheEntry(
                value=value,
                created_at=now,
                expires_at=now + self.ttl_seconds,
                stale_until=now + self.stale_max_seconds,
            )
            fut.set_result(value)
            return value
        except Exception as exc:
            stale = self.get_stale(key)
            if stale is not None:
                fut.set_result(stale)
                return stale
            fut.set_exception(exc)
            raise
        finally:
            async with self._lock:
                self._inflight.pop(key, None)
