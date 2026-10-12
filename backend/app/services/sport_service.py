from app.core.exceptions import PredictionNotFound, ProviderError
from app.domain.models import (
    CompetitionListResponse,
    EventListResponse,
    ListMeta,
    MarketListResponse,
    PredictionListResponse,
    SportInfo,
    UnifiedPrediction,
)
from app.persistence.recorder import schedule_record
from app.services.registry import get_provider, get_providers

SPORT_CATALOG = [
    SportInfo(id="football", name="Football", provider="soccer-oracle", enabled=True),
    SportInfo(id="tennis", name="Tennis", provider="tennis-oracle", enabled=True),
]


def list_sports() -> list[SportInfo]:
    return SPORT_CATALOG


async def provider_health() -> dict[str, dict]:
    result: dict[str, dict] = {}
    for sport, provider in get_providers().items():
        health = await provider.healthcheck()
        result[sport] = health
    return result


def _meta(sport: str, provider_name: str, count: int, status: str = "ok") -> ListMeta:
    return ListMeta(count=count, sport=sport, provider=provider_name, provider_status=status)


async def list_competitions(sport: str, **filters) -> CompetitionListResponse:
    provider = get_provider(sport)
    if not provider:
        raise KeyError(sport)
    try:
        items = await provider.get_competitions(**filters)
        status = "ok"
    except ProviderError:
        items = []
        status = "unavailable"
    return CompetitionListResponse(
        items=items,
        meta=_meta(sport, provider.provider_name, len(items), status),
    )


async def list_events(sport: str, **filters) -> EventListResponse:
    provider = get_provider(sport)
    if not provider:
        raise KeyError(sport)
    try:
        items = await provider.get_events(**filters)
        status = "ok"
    except ProviderError:
        items = []
        status = "unavailable"
    return EventListResponse(
        items=items,
        meta=_meta(sport, provider.provider_name, len(items), status),
    )


async def list_markets(sport: str, **filters) -> MarketListResponse:
    provider = get_provider(sport)
    if not provider:
        raise KeyError(sport)
    try:
        items = await provider.get_markets(**filters)
        status = "ok"
    except ProviderError:
        items = []
        status = "unavailable"
    return MarketListResponse(
        items=items,
        meta=_meta(sport, provider.provider_name, len(items), status),
    )


async def list_predictions(sport: str, **filters) -> PredictionListResponse:
    provider = get_provider(sport)
    if not provider:
        raise KeyError(sport)
    try:
        items = await provider.get_predictions(**filters)
        status = "ok"
        schedule_record(items)
    except ProviderError:
        items = []
        status = "unavailable"
    return PredictionListResponse(
        items=items,
        meta=_meta(sport, provider.provider_name, len(items), status),
    )


async def get_prediction(
    prediction_id: str, *, date: str | None = None
) -> UnifiedPrediction:
    filters: dict = {}
    if date:
        filters["date"] = date

    if prediction_id.startswith("soccer_"):
        provider = get_provider("football")
    elif prediction_id.startswith("tennis_"):
        provider = get_provider("tennis")
    else:
        provider = None
        for candidate in get_providers().values():
            found = await candidate.get_prediction(prediction_id, **filters)
            if found:
                return found
    if not provider:
        raise PredictionNotFound(prediction_id)
    found = await provider.get_prediction(prediction_id, **filters)
    if not found:
        raise PredictionNotFound(prediction_id)
    return found


async def list_event_predictions(
    event_id: str,
    *,
    sport: str | None = None,
    date: str | None = None,
) -> list[UnifiedPrediction]:
    # Prefer live provider match detail (multi-outcome boards + EV). Feed
    # snapshots stay on the lean day shape and must not shadow the detail page.
    filters: dict = {"event_id": event_id}
    if date:
        filters["date"] = date

    items: list[UnifiedPrediction] = []
    providers = get_providers()
    ordered = []
    if sport and sport in providers:
        ordered.append(providers[sport])
        ordered.extend(p for s, p in providers.items() if s != sport)
    else:
        ordered = list(providers.values())

    for provider in ordered:
        try:
            found = await provider.get_predictions(**filters)
            if found:
                return found
        except ProviderError:
            continue

    # Last resort: recent feed snapshot (day-shaped, may lack 1x2/EV).
    try:
        from app.services import feed_service

        snap = await feed_service.get_event_from_snapshots(event_id)
        if snap.predictions:
            return snap.predictions
    except Exception:  # noqa: BLE001
        pass
    return items


async def list_event_markets(event_id: str) -> MarketListResponse:
    preds = await list_event_predictions(event_id)
    seen: set[str] = set()
    markets = []
    sport = preds[0].sport if preds else "unknown"
    provider_name = preds[0].provider.name if preds else "unknown"
    from app.domain.models import MarketInfo

    for pred in preds:
        if pred.prediction.type in seen:
            continue
        seen.add(pred.prediction.type)
        markets.append(
            MarketInfo(
                key=pred.prediction.type,
                name=pred.prediction.type,
                sport=pred.sport,
                provider=pred.provider.name,
            )
        )
    return MarketListResponse(
        items=markets,
        meta=_meta(sport, provider_name, len(markets), "ok" if preds else "unavailable"),
    )
