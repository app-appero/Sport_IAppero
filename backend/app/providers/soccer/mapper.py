from __future__ import annotations

from datetime import datetime
from typing import Any

from app.domain.models import (
    Competition,
    Event,
    MarketInfo,
    Participant,
    PredictionValue,
    Probability,
    ProviderMetadata,
    Selection,
    UnifiedPrediction,
)

SPORT = "football"
PROVIDER = "soccer-oracle"


def _as_list(payload: Any) -> list[Any]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in (
            "items",
            "matches",
            "fixtures",
            "events",
            "data",
            "results",
            "predictions",
            "markets",
            "competitions",
            "leagues",
        ):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        # nested day payload
        day = payload.get("day")
        if isinstance(day, dict):
            return _as_list(day)
    return []


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value, tz=None)
        except (OverflowError, OSError, ValueError):
            return None
    if isinstance(value, str):
        text = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(text)
        except ValueError:
            return None
    return None


def _clamp_confidence(value: Any) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number > 1.0:
        number = number / 100.0
    return max(0.0, min(1.0, number))


def _dig(data: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


def map_competition(raw: dict[str, Any]) -> Competition:
    return Competition(
        id=str(_dig(raw, "id", "competition_id", "league_id", "slug") or "") or None,
        name=str(_dig(raw, "name", "competition", "league", "league_name") or "Unknown"),
    )


def map_markets(payload: Any) -> list[MarketInfo]:
    items: list[MarketInfo] = []
    for raw in _as_list(payload):
        if isinstance(raw, str):
            items.append(MarketInfo(key=raw, name=raw, sport=SPORT, provider=PROVIDER))
            continue
        if not isinstance(raw, dict):
            continue
        key = str(_dig(raw, "key", "id", "market", "slug", "code") or "")
        name = str(_dig(raw, "name", "label", "title") or key)
        if not key:
            continue
        items.append(MarketInfo(key=key, name=name, sport=SPORT, provider=PROVIDER))
    return items


def _participants(raw: dict[str, Any]) -> list[Participant]:
    parts = raw.get("participants")
    if isinstance(parts, list) and parts:
        out: list[Participant] = []
        for item in parts:
            if not isinstance(item, dict):
                continue
            out.append(
                Participant(
                    id=str(_dig(item, "id", "team_id") or "") or None,
                    name=str(_dig(item, "name", "team_name") or "Unknown"),
                    role=str(_dig(item, "role", "side") or "") or None,
                )
            )
        return out

    home = _dig(raw, "home", "home_team", "team_home")
    away = _dig(raw, "away", "away_team", "team_away")
    out = []
    if isinstance(home, dict):
        out.append(
            Participant(
                id=str(_dig(home, "id", "team_id") or "") or None,
                name=str(_dig(home, "name", "team_name") or "Home"),
                role="home",
            )
        )
    elif isinstance(home, str):
        out.append(Participant(name=home, role="home"))
    if isinstance(away, dict):
        out.append(
            Participant(
                id=str(_dig(away, "id", "team_id") or "") or None,
                name=str(_dig(away, "name", "team_name") or "Away"),
                role="away",
            )
        )
    elif isinstance(away, str):
        out.append(Participant(name=away, role="away"))
    return out


def map_event(raw: dict[str, Any]) -> Event:
    event_id = str(_dig(raw, "id", "fixture_id", "event_id", "match_id") or "")
    home_name = next((p.name for p in _participants(raw) if p.role == "home"), None)
    away_name = next((p.name for p in _participants(raw) if p.role == "away"), None)
    name = str(_dig(raw, "name", "match_name", "title") or "")
    if not name and home_name and away_name:
        name = f"{home_name} vs {away_name}"
    competition_raw = _dig(raw, "competition", "league")
    competition = None
    if isinstance(competition_raw, dict):
        competition = map_competition(competition_raw)
    elif isinstance(competition_raw, str):
        competition = Competition(name=competition_raw)
    elif _dig(raw, "league_name", "competition_name"):
        competition = Competition(
            id=str(_dig(raw, "league_id", "competition_id") or "") or None,
            name=str(_dig(raw, "league_name", "competition_name")),
        )
    return Event(
        id=event_id or name or "unknown",
        name=name or "Unknown match",
        competition=competition,
        start_time=_parse_dt(_dig(raw, "start_time", "kickoff", "date", "datetime", "start")),
        participants=_participants(raw),
        status=str(_dig(raw, "status", "state") or "") or None,
    )


def _probabilities(raw: dict[str, Any]) -> list[Probability]:
    probs = raw.get("probabilities")
    out: list[Probability] = []
    if isinstance(probs, list):
        for item in probs:
            if not isinstance(item, dict):
                continue
            value = _clamp_confidence(_dig(item, "value", "probability", "prob"))
            if value is None:
                continue
            out.append(
                Probability(
                    key=str(_dig(item, "key", "outcome", "code") or item.get("label") or "out"),
                    label=str(_dig(item, "label", "name", "outcome") or "Outcome"),
                    value=value,
                )
            )
        return out

    if isinstance(probs, dict):
        for key, value in probs.items():
            nested = value if not isinstance(value, dict) else _dig(value, "value", "prob")
            conf = _clamp_confidence(nested)
            if conf is None:
                continue
            label = key
            if isinstance(value, dict):
                label = str(_dig(value, "label", "name") or key)
            out.append(Probability(key=str(key), label=str(label), value=conf))
        return out

    # common flat keys
    mapping = [
        ("home", "home", "Home"),
        ("draw", "draw", "Draw"),
        ("away", "away", "Away"),
        ("prob_home", "home", "Home"),
        ("prob_draw", "draw", "Draw"),
        ("prob_away", "away", "Away"),
        ("home_win", "home", "Home"),
        ("away_win", "away", "Away"),
    ]
    for field, key, label in mapping:
        if field in raw:
            conf = _clamp_confidence(raw[field])
            if conf is not None:
                out.append(Probability(key=key, label=label, value=conf))
    return out


def _market_type(raw: dict[str, Any]) -> str:
    return str(_dig(raw, "market", "market_key", "prediction_type", "type") or "match_winner")


def _selection(raw: dict[str, Any], probabilities: list[Probability]) -> Selection:
    sel = _dig(raw, "selection", "pick", "predicted", "prediction")
    if isinstance(sel, dict):
        return Selection(
            id=str(_dig(sel, "id", "key") or "") or None,
            name=str(_dig(sel, "name", "label") or "Unknown"),
        )
    if isinstance(sel, str):
        return Selection(name=sel)
    if probabilities:
        best = max(probabilities, key=lambda p: p.value)
        return Selection(id=best.key, name=best.label)
    return Selection(name="Unknown")


def map_prediction(raw: dict[str, Any], event: Event | None = None) -> UnifiedPrediction:
    event_obj = event or map_event(raw.get("event") if isinstance(raw.get("event"), dict) else raw)
    market = _market_type(raw)
    probabilities = _probabilities(raw)
    if not probabilities and isinstance(raw.get("oracle"), dict):
        probabilities = _probabilities(raw["oracle"])
    selection = _selection(raw, probabilities)
    confidence = _clamp_confidence(
        _dig(raw, "confidence", "model_confidence", "score")
        or (max((p.value for p in probabilities), default=None))
    )
    prediction_id = str(
        _dig(raw, "id", "prediction_id") or f"{PROVIDER.split('-')[0]}_{event_obj.id}_{market}"
    )
    # normalize to soccer_<event>_<market>
    if not prediction_id.startswith("soccer_"):
        prediction_id = f"soccer_{event_obj.id}_{market}"

    generated = _parse_dt(_dig(raw, "generated_at", "created_at", "updated_at"))
    return UnifiedPrediction(
        id=prediction_id,
        sport=SPORT,
        event=event_obj,
        prediction=PredictionValue(type=market, selection=selection, confidence=confidence),
        probabilities=probabilities,
        provider=ProviderMetadata(name=PROVIDER, version=None),
        oracle_score=None,
        generated_at=generated,
        raw=raw,
    )


def map_day_payload(payload: Any) -> list[UnifiedPrediction]:
    predictions: list[UnifiedPrediction] = []
    for raw in _as_list(payload):
        if not isinstance(raw, dict):
            continue
        # match object with nested predictions/markets
        nested = raw.get("predictions") or raw.get("markets") or raw.get("oracle_predictions")
        if isinstance(nested, list) and nested:
            event = map_event(raw)
            for item in nested:
                if isinstance(item, dict):
                    merged = {**item, "event": raw}
                    predictions.append(map_prediction(merged, event=event))
            continue
        predictions.append(map_prediction(raw))
    return predictions


def map_events(payload: Any) -> list[Event]:
    events: list[Event] = []
    seen: set[str] = set()
    for raw in _as_list(payload):
        if not isinstance(raw, dict):
            continue
        event = map_event(raw)
        if event.id in seen:
            continue
        seen.add(event.id)
        events.append(event)
    return events


def map_competitions_from_events(events: list[Event]) -> list[Competition]:
    seen: set[str] = set()
    out: list[Competition] = []
    for event in events:
        if not event.competition:
            continue
        key = event.competition.id or event.competition.name
        if key in seen:
            continue
        seen.add(key)
        out.append(event.competition)
    return out


def parse_prediction_id(prediction_id: str) -> tuple[str, str] | None:
    """Return (fixture_id, market) from soccer_<fixture>_<market>."""
    if not prediction_id.startswith("soccer_"):
        return None
    rest = prediction_id[len("soccer_") :]
    if "_" not in rest:
        return None
    parts = rest.split("_")
    if len(parts) < 2:
        return None
    # common case: soccer_123456_match_winner / soccer_123456_over_under_2_5
    if parts[0].isdigit():
        return parts[0], "_".join(parts[1:])
    return parts[0], "_".join(parts[1:])
