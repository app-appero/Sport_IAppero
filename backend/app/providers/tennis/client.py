from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings
from app.core.exceptions import ProviderResponseError, ProviderUnavailable
from app.domain.models import Competition, Event, MarketInfo, UnifiedPrediction
from app.providers.base import SportProvider
from app.providers.http_utils import load_fixture, request_json
from app.providers.tennis import mapper

logger = logging.getLogger(__name__)


class TennisProvider(SportProvider):
    sport = mapper.SPORT
    provider_name = mapper.PROVIDER

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self._settings = settings
        self._owns_client = client is None
        self._token: str | None = settings.tennis_oracle_bearer_token
        timeout = httpx.Timeout(
            connect=settings.provider_connect_timeout,
            read=settings.provider_read_timeout,
            write=settings.provider_read_timeout,
            pool=settings.provider_connect_timeout,
        )
        headers: dict[str, str] = {}
        if settings.tennis_oracle_api_key:
            headers["X-API-Key"] = settings.tennis_oracle_api_key
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        self._client = client or httpx.AsyncClient(
            base_url=settings.tennis_oracle_base_url.rstrip("/"),
            timeout=timeout,
            headers=headers,
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def _ensure_auth(self) -> None:
        if self._settings.use_provider_fixtures:
            return
        if self._token:
            return
        username = self._settings.tennis_oracle_username
        password = self._settings.tennis_oracle_password
        if not username or not password:
            return
        try:
            response = await self._client.post(
                "/api/auth/login",
                json={"username": username, "password": password},
            )
        except httpx.HTTPError as exc:
            raise ProviderUnavailable(self.provider_name, f"Login failed: {exc}") from exc
        if response.status_code >= 400:
            raise ProviderResponseError(
                self.provider_name,
                f"Login returned {response.status_code}",
                response.status_code,
            )
        data = response.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            raise ProviderResponseError(self.provider_name, "Login response missing access_token")
        self._token = token
        self._client.headers["Authorization"] = f"Bearer {token}"
        logger.info("Authenticated against tennis-oracle as %s", username)

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        if self._settings.use_provider_fixtures:
            return self._fixture_for(path)
        await self._ensure_auth()
        try:
            return await request_json(
                self._client,
                provider=self.provider_name,
                method="GET",
                path=path,
                params=params,
            )
        except ProviderResponseError as exc:
            # refresh token once on 401
            if exc.status_code == 401 and self._settings.tennis_oracle_username:
                self._token = None
                self._client.headers.pop("Authorization", None)
                await self._ensure_auth()
                return await request_json(
                    self._client,
                    provider=self.provider_name,
                    method="GET",
                    path=path,
                    params=params,
                )
            raise

    def _fixture_for(self, path: str) -> Any:
        if path == "/health":
            return {"status": "ok"}
        if path == "/api/ops/checks":
            return {"status": "ok", "checks": []}
        if path.startswith("/api/next-fixtures/predictions"):
            return load_fixture("tennis", "predictions.json")
        if path.startswith("/api/next-fixtures"):
            return load_fixture("tennis", "fixtures.json")
        raise ProviderUnavailable(self.provider_name, f"No fixture for {path}")

    async def healthcheck(self) -> dict[str, Any]:
        try:
            data = await self._get("/health")
            status = "ok"
            if isinstance(data, dict) and str(data.get("status", "ok")).lower() not in {
                "ok",
                "healthy",
                "up",
            }:
                status = "unavailable"
            detail = None
            # Optional ops checks (auth required) — enrich detail when available
            try:
                await self._ensure_auth()
                if self._token or self._settings.use_provider_fixtures:
                    ops = await self._get("/api/ops/checks")
                    if isinstance(ops, dict):
                        detail = f"ops={ops.get('status')}"
            except Exception:  # noqa: BLE001
                pass
            return {"provider": self.provider_name, "status": status, "detail": detail}
        except Exception as exc:  # noqa: BLE001
            return {"provider": self.provider_name, "status": "unavailable", "detail": str(exc)}

    async def get_markets(self, **filters: Any) -> list[MarketInfo]:
        preds = await self.get_predictions(**filters)
        return mapper.map_markets_from_predictions(preds)

    async def get_events(self, **filters: Any) -> list[Event]:
        try:
            payload = await self._get("/api/next-fixtures")
        except Exception:
            payload = await self._get("/api/next-fixtures/predictions")
        events = mapper.map_events(payload)
        competition_id = filters.get("competition_id")
        if competition_id:
            events = [
                e
                for e in events
                if e.competition
                and (e.competition.id == competition_id or e.competition.name == competition_id)
            ]
        return events

    async def get_competitions(self, **filters: Any) -> list[Competition]:
        events = await self.get_events(**filters)
        return mapper.map_competitions_from_events(events)

    async def get_predictions(self, **filters: Any) -> list[UnifiedPrediction]:
        params: dict[str, Any] = {}
        day = filters.get("date")
        if day:
            # Upstream day filter (same calendar day). Still filter locally below —
            # without this, every selected day returned the full upcoming bag.
            params["from"] = day
            params["to"] = day
        payload = await self._get(
            "/api/next-fixtures/predictions",
            params=params or None,
        )
        predictions = mapper.map_predictions_payload(payload)

        competition_id = filters.get("competition_id")
        event_id = filters.get("event_id")
        market = filters.get("market")
        min_confidence = filters.get("min_confidence")

        if day:
            predictions = [
                p
                for p in predictions
                if p.event.calendar_date == day
                or (
                    p.event.start_time is not None
                    and p.event.start_time.date().isoformat() == day
                )
            ]
        if competition_id:
            predictions = [
                p
                for p in predictions
                if p.event.competition
                and (
                    p.event.competition.id == competition_id
                    or p.event.competition.name == competition_id
                )
            ]
        if event_id:
            predictions = [p for p in predictions if p.event.id == str(event_id)]
        if market:
            predictions = [p for p in predictions if p.prediction.type == market]
        if min_confidence is not None:
            predictions = [
                p
                for p in predictions
                if p.prediction.confidence is not None
                and p.prediction.confidence >= float(min_confidence)
            ]

        predictions.sort(
            key=lambda p: (
                -(p.prediction.confidence or 0.0),
                p.event.start_time.isoformat() if p.event.start_time else "",
                p.event.calendar_date or "",
            )
        )
        limit = filters.get("limit")
        if limit is not None:
            predictions = predictions[: int(limit)]
        return predictions

    async def get_prediction(self, prediction_id: str) -> UnifiedPrediction | None:
        parsed = mapper.parse_prediction_id(prediction_id)
        if not parsed:
            return None
        event_id, market = parsed
        predictions = await self.get_predictions(event_id=event_id, market=market)
        for pred in predictions:
            if pred.id == prediction_id or (
                pred.event.id == event_id and pred.prediction.type == market
            ):
                return pred
        predictions = await self.get_predictions()
        for pred in predictions:
            if pred.id == prediction_id:
                return pred
        return None
