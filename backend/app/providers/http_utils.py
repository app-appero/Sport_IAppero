from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.exceptions import ProviderResponseError, ProviderUnavailable

FIXTURES_ROOT = Path(__file__).resolve().parents[2] / "tests" / "fixtures"


@dataclass
class _CircuitState:
    failures: int = 0
    opened_until: float = 0.0


_circuits: dict[str, _CircuitState] = {}
_circuit_lock = asyncio.Lock()


def reset_provider_circuits() -> None:
    """Test helper: clear all in-process circuit breakers."""
    _circuits.clear()


def _retryable_status(status_code: int) -> bool:
    return status_code in {429, 500, 502, 503, 504}


async def _circuit_guard(provider: str) -> None:
    async with _circuit_lock:
        state = _circuits.setdefault(provider, _CircuitState())
        now = time.monotonic()
        if state.opened_until > now:
            raise ProviderUnavailable(
                provider,
                f"Circuit open for {provider} ({int(state.opened_until - now)}s left)",
            )


async def _record_success(provider: str) -> None:
    async with _circuit_lock:
        state = _circuits.setdefault(provider, _CircuitState())
        state.failures = 0
        state.opened_until = 0.0


async def _record_failure(provider: str) -> None:
    settings = get_settings()
    async with _circuit_lock:
        state = _circuits.setdefault(provider, _CircuitState())
        state.failures += 1
        if state.failures >= max(1, settings.provider_circuit_failure_threshold):
            state.opened_until = time.monotonic() + max(1.0, settings.provider_circuit_open_seconds)
            state.failures = 0


async def request_json(
    client: httpx.AsyncClient,
    *,
    provider: str,
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    json: Any = None,
    timeout: float | None = None,
) -> Any:
    settings = get_settings()
    method_upper = method.upper()
    # Mutations stay single-shot: a refresh must not be retried blindly.
    max_attempts = (
        max(1, settings.provider_get_max_attempts) if method_upper == "GET" else 1
    )
    extra = {"timeout": timeout} if timeout is not None else {}
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        await _circuit_guard(provider)
        try:
            response = await client.request(method, path, params=params, json=json, **extra)
        except httpx.TimeoutException as exc:
            last_error = ProviderUnavailable(provider, f"Timeout calling {path}")
            await _record_failure(provider)
            if attempt >= max_attempts:
                raise last_error from exc
        except httpx.HTTPError as exc:
            last_error = ProviderUnavailable(provider, f"HTTP error calling {path}: {exc}")
            await _record_failure(provider)
            if attempt >= max_attempts:
                raise last_error from exc
        else:
            if response.status_code >= 500 or response.status_code == 429:
                last_error = ProviderUnavailable(
                    provider,
                    f"{path} returned {response.status_code}",
                    response.status_code,
                )
                await _record_failure(provider)
                if attempt >= max_attempts or not _retryable_status(response.status_code):
                    raise last_error
            elif response.status_code >= 400:
                raise ProviderResponseError(
                    provider,
                    f"{path} returned {response.status_code}: {response.text[:300]}",
                    response.status_code,
                )
            else:
                await _record_success(provider)
                if not response.content:
                    return None
                try:
                    return response.json()
                except ValueError as exc:
                    raise ProviderResponseError(provider, f"{path} returned invalid JSON") from exc

        backoff = settings.provider_get_backoff_seconds * (2 ** (attempt - 1))
        jitter = random.uniform(0.0, backoff * 0.25)
        await asyncio.sleep(backoff + jitter)

    assert last_error is not None
    raise last_error


def load_fixture(provider_dir: str, name: str) -> Any:
    import json

    path = FIXTURES_ROOT / provider_dir / name
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)
