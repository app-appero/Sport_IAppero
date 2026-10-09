"""Unified feed aggregation with snapshot pagination (B05–B06)."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import (
    EventNotFound,
    InvalidCursor,
    PredictionNotFound,
    ProviderError,
    SnapshotExpired,
)
from app.domain.models import (
    FeedItem,
    FeedMeta,
    FeedPage,
    FeedQuery,
    FeedResponse,
    ProviderFeedStatus,
    UnifiedPrediction,
)
from app.services.cache import SingleFlightCache, SnapshotStore
from app.services.registry import get_provider

ALLOWED_SPORTS = ("football", "tennis")
ALLOWED_SORTS = ("start_time_asc", "probability_desc")

_feed_cache: SingleFlightCache | None = None
_snapshots: SnapshotStore | None = None


def _caches() -> tuple[SingleFlightCache, SnapshotStore]:
    global _feed_cache, _snapshots
    settings = get_settings()
    if _feed_cache is None:
        _feed_cache = SingleFlightCache(
            ttl_seconds=settings.cache_ttl_seconds,
            stale_max_seconds=settings.cache_stale_max_seconds,
        )
    if _snapshots is None:
        _snapshots = SnapshotStore(ttl_seconds=settings.snapshot_ttl_seconds)
    return _feed_cache, _snapshots


def reset_feed_state() -> None:
    """Test helper."""
    global _feed_cache, _snapshots
    _feed_cache = None
    _snapshots = None


@dataclass
class ProviderSlice:
    sport: str
    provider: str
    status: str
    predictions: list[UnifiedPrediction] = field(default_factory=list)
    truncated: bool = False
    warning: str | None = None


@dataclass
class FeedSnapshot:
    snapshot_id: str
    generated_at: datetime
    query: FeedQuery
    filter_hash: str
    items: list[FeedItem]
    providers: list[ProviderFeedStatus]
    warnings: list[str]
    is_complete: bool
    meta_status: str
    predictions_by_id: dict[str, UnifiedPrediction] = field(default_factory=dict)
    events_by_id: dict[str, FeedItem] = field(default_factory=dict)


def _filter_hash(query: FeedQuery) -> str:
    payload = {
        "date": query.date,
        "timezone": query.timezone,
        "sports": sorted(query.sports),
        "market": query.market,
        "competition": query.competition,
        "sort": query.sort,
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _encode_cursor(snapshot_id: str, offset: int, filter_hash: str) -> str:
    blob = json.dumps(
        {"s": snapshot_id, "o": offset, "h": filter_hash},
        separators=(",", ":"),
    ).encode()
    return base64.urlsafe_b64encode(blob).decode().rstrip("=")


def _decode_cursor(cursor: str) -> tuple[str, int, str]:
    try:
        pad = "=" * (-len(cursor) % 4)
        data = json.loads(base64.urlsafe_b64decode(cursor + pad).decode())
        return str(data["s"]), int(data["o"]), str(data["h"])
    except Exception as exc:
        raise InvalidCursor() from exc


def _parse_sports(sports_csv: str | None) -> list[str]:
    if not sports_csv or not sports_csv.strip():
        return list(ALLOWED_SPORTS)
    parts = [p.strip().lower() for p in sports_csv.split(",") if p.strip()]
    unknown = [p for p in parts if p not in ALLOWED_SPORTS]
    if unknown:
        raise ValueError(f"Invalid sports: {', '.join(unknown)}")
    # preserve order, unique
    seen: set[str] = set()
    ordered: list[str] = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            ordered.append(p)
    return ordered


def _provider_status_from_error(exc: ProviderError) -> str:
    if exc.status_code == 401:
        return "unauthorized"
    return "unavailable"


async def _fetch_sport(
    sport: str,
    *,
    date: str | None,
    competition: str | None,
    market: str | None,
) -> ProviderSlice:
    settings = get_settings()
    provider = get_provider(sport)
    if not provider:
        return ProviderSlice(
            sport=sport,
            provider="unknown",
            status="unavailable",
            warning=f"{sport} provider not configured",
        )

    filters: dict[str, Any] = {}
    if date:
        filters["date"] = date
    if competition:
        filters["competition_id"] = competition
    if market:
        filters["market"] = market

    try:
        preds = await asyncio.wait_for(
            provider.get_predictions(**filters),
            timeout=settings.feed_deadline_seconds,
        )
        truncated = len(preds) > settings.provider_max_items
        if truncated:
            preds = preds[: settings.provider_max_items]
        return ProviderSlice(
            sport=sport,
            provider=provider.provider_name,
            status="ok",
            predictions=preds,
            truncated=truncated,
            warning="Provider results truncated" if truncated else None,
        )
    except ProviderError as exc:
        status = _provider_status_from_error(exc)
        label = "Tennis" if sport == "tennis" else "Football"
        warn = f"{label} temporaneamente non disponibile"
        if status == "unauthorized":
            warn = f"{label} non autorizzato"
        return ProviderSlice(
            sport=sport,
            provider=provider.provider_name,
            status=status,
            warning=warn,
        )
    except (asyncio.TimeoutError, Exception):
        label = "Tennis" if sport == "tennis" else "Football"
        return ProviderSlice(
            sport=sport,
            provider=provider.provider_name,
            status="unavailable",
            warning=f"{label} temporaneamente non disponibile",
        )


def _group_items(slices: list[ProviderSlice], sort: str) -> list[FeedItem]:
    grouped: dict[str, FeedItem] = {}
    for sl in slices:
        for pred in sl.predictions:
            key = f"{pred.sport}:{pred.event.id}"
            item = grouped.get(key)
            if item is None:
                grouped[key] = FeedItem(
                    event=pred.event,
                    predictions=[pred],
                    sport=pred.sport,
                )
            else:
                item.predictions.append(pred)

    items = list(grouped.values())

    def _aware(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    def start_key(item: FeedItem) -> tuple:
        st = _aware(item.event.start_time)
        # None last
        return (st is None, st or datetime.min.replace(tzinfo=timezone.utc), item.event.id)

    def prob_key(item: FeedItem) -> tuple:
        confs = [p.prediction.confidence for p in item.predictions if p.prediction.confidence is not None]
        best = max(confs) if confs else -1.0
        return (-best, item.event.id)

    if sort == "probability_desc":
        items.sort(key=prob_key)
    else:
        items.sort(key=start_key)
    return items


def _meta_status(providers: list[ProviderFeedStatus], item_count: int) -> tuple[str, bool, bool]:
    """Returns (status, is_complete, all_failed)."""
    statuses = [p.status for p in providers]
    all_ok = all(s == "ok" for s in statuses)
    all_failed = all(s != "ok" for s in statuses)
    any_failed = any(s != "ok" for s in statuses)
    truncated = any(p.truncated for p in providers)
    is_complete = all_ok and not truncated

    if all_failed:
        return "unavailable", False, True
    if any_failed:
        return "degraded", False, False
    if item_count == 0:
        return "empty", is_complete, False
    if truncated:
        return "ok", False, False
    return "ok", True, False


async def _build_snapshot(query: FeedQuery) -> FeedSnapshot:
    tasks = [
        _fetch_sport(
            sport,
            date=query.date,
            competition=query.competition,
            market=query.market,
        )
        for sport in query.sports
    ]
    slices = await asyncio.gather(*tasks)
    items = _group_items(list(slices), query.sort)

    providers = [
        ProviderFeedStatus(
            provider=sl.provider,
            status=sl.status,
            item_count=len({p.event.id for p in sl.predictions}),
            truncated=sl.truncated,
        )
        for sl in slices
    ]
    warnings = [sl.warning for sl in slices if sl.warning]
    status, is_complete, all_failed = _meta_status(providers, len(items))
    if all_failed:
        # Signal caller — no usable snapshot
        raise ProviderError("feed", "All providers unavailable", status_code=503)

    snapshot_id = uuid.uuid4().hex
    pred_index: dict[str, UnifiedPrediction] = {}
    event_index: dict[str, FeedItem] = {}
    for item in items:
        # namespaced + raw event id for lookup convenience
        event_index[f"{item.sport}:{item.event.id}"] = item
        event_index[item.event.id] = item
        for pred in item.predictions:
            pred_index[pred.id] = pred

    return FeedSnapshot(
        snapshot_id=snapshot_id,
        generated_at=datetime.now(timezone.utc),
        query=query,
        filter_hash=_filter_hash(query),
        items=items,
        providers=providers,
        warnings=warnings,
        is_complete=is_complete,
        meta_status=status,
        predictions_by_id=pred_index,
        events_by_id=event_index,
    )


def _cache_key(query: FeedQuery) -> str:
    return f"feed:{_filter_hash(query)}"


async def get_feed(
    *,
    date: str | None,
    timezone_name: str | None,
    sports: str | None,
    market: str | None,
    competition: str | None,
    sort: str,
    limit: int,
    cursor: str | None,
) -> FeedResponse:
    settings = get_settings()
    tz = timezone_name or settings.app_timezone
    if tz != "Europe/Rome":
        raise ValueError("Only timezone Europe/Rome is supported in MVP")
    if sort not in ALLOWED_SORTS:
        raise ValueError(f"Invalid sort: {sort}")

    sport_list = _parse_sports(sports)
    query = FeedQuery(
        date=date,
        timezone=tz,
        sports=sport_list,
        market=market,
        competition=competition,
        sort=sort,
        limit=limit,
    )
    fhash = _filter_hash(query)
    feed_cache, snapshots = _caches()

    offset = 0
    snapshot: FeedSnapshot | None = None

    if cursor:
        snap_id, offset, cursor_hash = _decode_cursor(cursor)
        if cursor_hash != fhash:
            raise InvalidCursor("Cursor does not match current filters")
        snapshot = snapshots.get(snap_id)
        if snapshot is None:
            raise SnapshotExpired(snap_id)
        offset = max(0, offset)

    if snapshot is None:
        try:
            snapshot = await feed_cache.get_or_build(
                _cache_key(query),
                lambda: _build_snapshot(query),
            )
            # Re-key into snapshot store under snapshot_id
            snapshots.put(snapshot.snapshot_id, snapshot)
        except ProviderError as exc:
            stale = feed_cache.get_stale(_cache_key(query))
            if stale is not None:
                snapshot = stale
                snapshots.put(snapshot.snapshot_id, snapshot)
            else:
                raise ProviderError("feed", exc.message, status_code=503) from exc

    page_items = snapshot.items[offset : offset + limit]
    next_offset = offset + limit
    next_cursor = None
    if next_offset < len(snapshot.items):
        next_cursor = _encode_cursor(snapshot.snapshot_id, next_offset, snapshot.filter_hash)

    return FeedResponse(
        schema_version="1",
        snapshot_id=snapshot.snapshot_id,
        generated_at=snapshot.generated_at,
        query=query,
        items=page_items,
        page=FeedPage(limit=limit, next_cursor=next_cursor),
        meta=FeedMeta(
            status=snapshot.meta_status,
            is_complete=snapshot.is_complete,
            providers=snapshot.providers,
            warnings=snapshot.warnings,
        ),
    )


async def get_event_from_snapshots(event_id: str) -> FeedItem:
    _, snapshots = _caches()
    # Search newest snapshots (dict insertion order)
    for entry in reversed(list(snapshots._entries.values())):
        snap: FeedSnapshot = entry.value
        found = snap.events_by_id.get(event_id)
        if found:
            return found
        # try namespaced keys
        for sport in ALLOWED_SPORTS:
            found = snap.events_by_id.get(f"{sport}:{event_id}")
            if found:
                return found
    raise EventNotFound(event_id)


async def get_prediction_from_snapshots(prediction_id: str) -> UnifiedPrediction | None:
    _, snapshots = _caches()
    for entry in reversed(list(snapshots._entries.values())):
        snap: FeedSnapshot = entry.value
        found = snap.predictions_by_id.get(prediction_id)
        if found:
            return found
    return None


async def require_prediction(prediction_id: str) -> UnifiedPrediction:
    found = await get_prediction_from_snapshots(prediction_id)
    if found:
        return found
    # Fallback to live provider lookup (existing behaviour)
    from app.services import sport_service

    try:
        return await sport_service.get_prediction(prediction_id)
    except PredictionNotFound:
        raise
