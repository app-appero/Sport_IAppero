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

SPORT = "tennis"
PROVIDER = "tennis-oracle"


def _as_list(payload: Any) -> list[Any]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in (
            "items",
            "fixtures",
            "events",
            "matches",
            "data",
            "results",
            "predictions",
            "tournaments",
            "competitions",
        ):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
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
        id=str(_dig(raw, "id", "tournament_id", "competition_id", "slug") or "") or None,
        name=str(_dig(raw, "name", "tournament", "tournament_name", "competition") or "Unknown"),
    )


def map_markets_from_predictions(predictions: list[UnifiedPrediction]) -> list[MarketInfo]:
    seen: set[str] = set()
    out: list[MarketInfo] = []
    for pred in predictions:
        key = pred.prediction.type
        if key in seen:
            continue
        seen.add(key)
        out.append(MarketInfo(key=key, name=key, sport=SPORT, provider=PROVIDER))
    return out


def _participants(raw: dict[str, Any]) -> list[Participant]:
    parts = raw.get("participants")
    if isinstance(parts, list) and parts:
        out: list[Participant] = []
        for idx, item in enumerate(parts):
            if not isinstance(item, dict):
                continue
            role = str(_dig(item, "role") or f"player_{idx + 1}")
            out.append(
                Participant(
                    id=str(_dig(item, "id", "player_id") or "") or None,
                    name=str(_dig(item, "name", "player_name") or "Unknown"),
                    role=role,
                )
            )
        return out

    p1 = _dig(raw, "player_1", "player1", "home", "player_a")
    p2 = _dig(raw, "player_2", "player2", "away", "player_b")
    out: list[Participant] = []
    for role, value in (("player_1", p1), ("player_2", p2)):
        if isinstance(value, dict):
            out.append(
                Participant(
                    id=str(_dig(value, "id", "player_id") or "") or None,
                    name=str(_dig(value, "name", "player_name") or role),
                    role=role,
                )
            )
        elif isinstance(value, str):
            out.append(Participant(name=value, role=role))
    return out


def map_event(raw: dict[str, Any]) -> Event:
    event_id = str(_dig(raw, "id", "event_id", "event_key", "fixture_id", "match_id") or "")
    participants = _participants(raw)
    name = str(_dig(raw, "name", "match_name", "title") or "")
    if not name and len(participants) >= 2:
        name = f"{participants[0].name} vs {participants[1].name}"
    tournament = _dig(raw, "tournament", "competition")
    competition = None
    if isinstance(tournament, dict):
        competition = map_competition(tournament)
    elif isinstance(tournament, str):
        competition = Competition(name=tournament)
    elif _dig(raw, "tournament_name"):
        competition = Competition(
            id=str(_dig(raw, "tournament_id") or "") or None,
            name=str(_dig(raw, "tournament_name")),
        )
    return Event(
        id=event_id or name or "unknown",
        name=name or "Unknown match",
        competition=competition,
        start_time=_parse_dt(_dig(raw, "start_time", "scheduled_at", "date", "datetime", "start")),
        participants=participants,
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
                    key=str(_dig(item, "key", "outcome", "code") or "out"),
                    label=str(_dig(item, "label", "name", "outcome") or "Outcome"),
                    value=value,
                )
            )
        return out
    if isinstance(probs, dict):
        for key, value in probs.items():
            conf = _clamp_confidence(value if not isinstance(value, dict) else value.get("value"))
            if conf is None:
                continue
            out.append(Probability(key=str(key), label=str(key), value=conf))
        return out

    for field, key in (
        ("player_1_prob", "player_1"),
        ("player_2_prob", "player_2"),
        ("prob_player_1", "player_1"),
        ("prob_player_2", "player_2"),
        ("p1", "player_1"),
        ("p2", "player_2"),
    ):
        if field in raw:
            conf = _clamp_confidence(raw[field])
            if conf is not None:
                out.append(Probability(key=key, label=key, value=conf))
    return out


def _market_type(raw: dict[str, Any]) -> str:
    return str(_dig(raw, "market", "market_key", "prediction_type", "type") or "match_winner")


def _selection(raw: dict[str, Any], probabilities: list[Probability], event: Event) -> Selection:
    sel = _dig(raw, "selection", "pick", "predicted", "prediction", "winner")
    if isinstance(sel, dict):
        return Selection(
            id=str(_dig(sel, "id", "key") or "") or None,
            name=str(_dig(sel, "name", "label") or "Unknown"),
        )
    if isinstance(sel, str):
        # map player_1/player_2 to names when possible
        if sel in {"player_1", "p1"} and event.participants:
            p = event.participants[0]
            return Selection(id=p.id or "player_1", name=p.name)
        if sel in {"player_2", "p2"} and len(event.participants) > 1:
            p = event.participants[1]
            return Selection(id=p.id or "player_2", name=p.name)
        return Selection(name=sel)
    if probabilities:
        best = max(probabilities, key=lambda p: p.value)
        name = best.label
        for p in event.participants:
            if p.role == best.key or p.id == best.key:
                name = p.name
                break
        return Selection(id=best.key, name=name)
    return Selection(name="Unknown")


def map_prediction(raw: dict[str, Any], event: Event | None = None) -> UnifiedPrediction:
    event_obj = event or map_event(raw.get("event") if isinstance(raw.get("event"), dict) else raw)
    market = _market_type(raw)
    probabilities = _probabilities(raw)
    # enrich labels with player names
    enriched: list[Probability] = []
    for prob in probabilities:
        label = prob.label
        for p in event_obj.participants:
            if p.role == prob.key:
                label = p.name
                break
        enriched.append(Probability(key=prob.key, label=label, value=prob.value))
    selection = _selection(raw, enriched, event_obj)
    confidence = _clamp_confidence(
        _dig(raw, "confidence", "model_confidence")
        or (max((p.value for p in enriched), default=None))
    )
    prediction_id = f"tennis_{event_obj.id}_{market}"
    return UnifiedPrediction(
        id=prediction_id,
        sport=SPORT,
        event=event_obj,
        prediction=PredictionValue(type=market, selection=selection, confidence=confidence),
        probabilities=enriched,
        provider=ProviderMetadata(name=PROVIDER, version=None),
        oracle_score=None,
        generated_at=_parse_dt(_dig(raw, "generated_at", "created_at", "updated_at")),
        raw=raw,
    )


def map_predictions_payload(payload: Any) -> list[UnifiedPrediction]:
    predictions: list[UnifiedPrediction] = []
    for raw in _as_list(payload):
        if not isinstance(raw, dict):
            continue
        nested = raw.get("predictions") or raw.get("markets")
        if isinstance(nested, list) and nested:
            event = map_event(raw)
            for item in nested:
                if isinstance(item, dict):
                    predictions.append(map_prediction({**item, "event": raw}, event=event))
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
    if not prediction_id.startswith("tennis_"):
        return None
    rest = prediction_id[len("tennis_") :]
    parts = rest.split("_")
    if len(parts) < 2:
        return None
    return parts[0], "_".join(parts[1:])
