from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx

from app.core.exceptions import ProviderResponseError, ProviderUnavailable

FIXTURES_ROOT = Path(__file__).resolve().parents[2] / "tests" / "fixtures"


async def request_json(
    client: httpx.AsyncClient,
    *,
    provider: str,
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    json: Any = None,
) -> Any:
    try:
        response = await client.request(method, path, params=params, json=json)
    except httpx.TimeoutException as exc:
        raise ProviderUnavailable(provider, f"Timeout calling {path}") from exc
    except httpx.HTTPError as exc:
        raise ProviderUnavailable(provider, f"HTTP error calling {path}: {exc}") from exc

    if response.status_code >= 500:
        raise ProviderUnavailable(
            provider,
            f"{path} returned {response.status_code}",
            response.status_code,
        )
    if response.status_code >= 400:
        raise ProviderResponseError(
            provider,
            f"{path} returned {response.status_code}: {response.text[:300]}",
            response.status_code,
        )
    if not response.content:
        return None
    try:
        return response.json()
    except ValueError as exc:
        raise ProviderResponseError(provider, f"{path} returned invalid JSON") from exc


def load_fixture(provider_dir: str, name: str) -> Any:
    import json

    path = FIXTURES_ROOT / provider_dir / name
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)
