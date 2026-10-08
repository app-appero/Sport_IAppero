from __future__ import annotations

from typing import Any

import httpx

from app.core.config import Settings
from app.core.exceptions import ProviderUnavailable
from app.domain.models import Competition, Event, MarketInfo, UnifiedPrediction
from app.providers.base import SportProvider
from app.providers.http_utils import load_fixture, request_json
from app.providers.soccer import mapper


class SoccerProvider(SportProvider):
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
        if settings.soccer_oracle_api_key:
            headers["X-API-Key"] = settings.soccer_oracle_api_key
        self._client = client or httpx.AsyncClient(
            base_url=settings.soccer_oracle_base_url.rstrip("/"),
            timeout=timeout,
            headers=headers,
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        if self._settings.use_provider_fixtures:
            return self._fixture_for(path, params)
        return await request_json(
            self._client,
            provider=self.provider_name,
            method="GET",
            path=path,
            params=params,
        )

    def _fixture_for(self, path: str, params: dict[str, Any] | None) -> Any:
        if path == "/health":
            return {"status": "ok"}
        if path == "/health/database":
            return load_fixture("soccer", "health_database.json")
        if path == "/markets":
            return load_fixture("soccer", "markets.json")
        if path.startswith("/dashboard/match/") and path.endswith("/oracle-detail"):
            return load_fixture("soccer", "oracle_detail.json")
        if path.startswith("/dashboard/match/"):
            return load_fixture("soccer", "match.json")
        if path == "/dashboard/day":
            return load_fixture("soccer", "day.json")
        if path == "/dashboard/available-dates":
            return load_fixture("soccer", "available_dates.json")
        raise ProviderUnavailable(self.provider_name, f"No fixture for {path} params={params}")

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
            try:
                db = await self._get("/health/database")
                if isinstance(db, dict):
                    detail = f"database={db.get('status')}"
                    if db.get("status") not in {None, "ok"}:
                        status = "unavailable"
            except Exception:  # noqa: BLE001
                pass
            return {"provider": self.provider_name, "status": status, "detail": detail}
        except Exception as exc:  # noqa: BLE001 — health must never raise
            return {"provider": self.provider_name, "status": "unavailable", "detail": str(exc)}

    async def get_markets(self, **filters: Any) -> list[MarketInfo]:
        payload = await self._get("/markets")
        markets = mapper.map_markets(payload)
        if not markets:
            # fallback from predictions
            preds = await self.get_predictions(**filters)
            seen: set[str] = set()
            for pred in preds:
                if pred.prediction.type not in seen:
                    seen.add(pred.prediction.type)
                    markets.append(
                        MarketInfo(
                            key=pred.prediction.type,
                            name=pred.prediction.type,
                            sport=self.sport,
                            provider=self.provider_name,
                        )
                    )
        return markets

    async def get_events(self, **filters: Any) -> list[Event]:
        params: dict[str, Any] = {}
        # Upstream query param is target_date (not date)
        if filters.get("date"):
            params["target_date"] = filters["date"]
        if filters.get("with_predictions") is not None:
            params["with_predictions"] = filters["with_predictions"]
        payload = await self._get("/dashboard/day", params=params or None)
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
        params: dict[str, Any] = {"with_predictions": True}
        if filters.get("date"):
            params["target_date"] = filters["date"]
        payload = await self._get("/dashboard/day", params=params or None)
        predictions = mapper.map_day_payload(payload)

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
        fixture_id, market = parsed

        # Prefer scanning day/list payloads mapped to UnifiedPrediction
        for candidate in await self.get_predictions(event_id=fixture_id, market=market):
            if candidate.id == prediction_id or candidate.prediction.type == market:
                return candidate

        try:
            detail = await self._get(f"/dashboard/match/{fixture_id}/oracle-detail")
        except Exception:
            try:
                detail = await self._get(f"/dashboard/match/{fixture_id}")
            except Exception:
                return None

        if not isinstance(detail, dict):
            return None
        mapped = mapper.map_day_payload({"rows": [detail]})
        for pred in mapped:
            if pred.id == prediction_id or pred.prediction.type == market:
                return pred
        return mapped[0] if mapped else None
