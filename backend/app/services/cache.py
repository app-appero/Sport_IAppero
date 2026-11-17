"""In-memory TTL cache with single-flight for feed snapshots."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any, TypeVar

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

    def clear(self) -> None:
        self._entries.clear()

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
        # Bumped by expire_all(): a build that started before it is stored already expired.
        self._generation = 0

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

    def expire_all(self) -> None:
        """Mark every cached value as expired without dropping it.

        The next read rebuilds; if that rebuild fails the old value is still served
        as a stale fallback until its original `stale_until` (the stale window is
        not extended). A build already in flight is stored expired as well."""
        self._generation += 1
        for entry in self._entries.values():
            entry.expires_at = float("-inf")

    def age_seconds(self, key: str) -> float | None:
        entry = self._entries.get(key)
        if not entry:
            return None
        return max(0.0, time.monotonic() - entry.created_at)

    async def get_or_build(self, key: str, builder: Callable[[], Awaitable[T]]) -> T:
        value, _stale = await self.get_or_build_ex(key, builder)
        return value

    async def get_or_build_ex(
        self, key: str, builder: Callable[[], Awaitable[T]]
    ) -> tuple[T, bool]:
        """Like get_or_build, but also says whether the value is a stale fallback
        (the rebuild failed and an expired entry was served instead)."""
        fresh = self.get_fresh(key)
        if fresh is not None:
            return fresh, False

        async with self._lock:
            fresh = self.get_fresh(key)
            if fresh is not None:
                return fresh, False
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

        generation = self._generation
        try:
            value = await builder()
            now = time.monotonic()
            # Invalidated while building: keep the value only as a stale fallback.
            superseded = generation != self._generation
            self._entries[key] = CacheEntry(
                value=value,
                created_at=now,
                expires_at=float("-inf") if superseded else now + self.ttl_seconds,
                stale_until=now + self.stale_max_seconds,
            )
            fut.set_result((value, False))
            return value, False
        except Exception as exc:
            stale = self.get_stale(key)
            if stale is not None:
                fut.set_result((stale, True))
                return stale, True
            fut.set_exception(exc)
            fut.exception()  # mark retrieved: no waiter may exist, avoids asyncio log noise
            raise
        finally:
            async with self._lock:
                self._inflight.pop(key, None)
