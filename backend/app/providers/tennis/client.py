from __future__ import annotations

from typing import Any

import httpx

from app.core.config import Settings
from app.core.exceptions import ProviderUnavailable
from app.domain.models import Competition, Event, MarketInfo, UnifiedPrediction
from app.providers.base import SportProvider
from app.providers.http_utils import load_fixture, request_json
from app.providers.tennis import mapper


class TennisProvider(SportProvider):
    sport = mapper.SPORT
    provider_name = mapper.PROVIDER

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self._settings = settings
        self._owns_client = client is None
        timeout = httpx.Timeout(
            connect=settings.provider_connect_timeout,
            read=settings.provider_read_timeout,
            write=settings.provider_read_timeout,
            pool=settings.provider_connect_timeout,
        )
        headers: dict[str, str] = {}
        if settings.tennis_oracle_api_key:
            headers["X-API-Key"] = settings.tennis_oracle_api_key
        if settings.tennis_oracle_bearer_token:
            headers["Authorization"] = f"Bearer {settings.tennis_oracle_bearer_token}"
        self._client = client or httpx.AsyncClient(
            base_url=settings.tennis_oracle_base_url.rstrip("/"),
            timeout=timeout,
            headers=headers,
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        if self._settings.use_provider_fixtures:
            return self._fixture_for(path)
        return await request_json(
            self._client,
            provider=self.provider_name,
            method="GET",
            path=path,
            params=params,
        )

    def _fixture_for(self, path: str) -> Any:
        if path == "/health":
            return {"status": "ok"}
        if path == "/api/next-fixtures/predictions":
            return load_fixture("tennis", "predictions.json")
        if path == "/api/next-fixtures":
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
            return {"provider": self.provider_name, "status": status, "detail": None}
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
        payload = await self._get("/api/next-fixtures/predictions")
        predictions = mapper.map_predictions_payload(payload)

        competition_id = filters.get("competition_id")
        event_id = filters.get("event_id")
        market = filters.get("market")
        min_confidence = filters.get("min_confidence")

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
            predictions = [p for p in predictions if p.event.id == event_id]
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
        # broader search
        predictions = await self.get_predictions()
        for pred in predictions:
            if pred.id == prediction_id:
                return pred
        return None
