from __future__ import annotations

from datetime import datetime
from typing import Any

from app.domain.models import (
    Competition,
    Event,
    EventScore,
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
        id=str(
            _dig(raw, "tournament_key", "id", "tournament_id", "competition_id", "slug") or ""
        )
        or None,
        name=str(
            _dig(raw, "tournament_name", "name", "tournament", "competition") or "Unknown"
        ),
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
    p1_name = _dig(raw, "event_first_player", "player_1", "player1")
    p2_name = _dig(raw, "event_second_player", "player_2", "player2")
    p1_id = _dig(raw, "first_player_key", "player_1_key")
    p2_id = _dig(raw, "second_player_key", "player_2_key")
    out: list[Participant] = []
    if isinstance(p1_name, dict):
        out.append(
            Participant(
                id=str(_dig(p1_name, "id", "player_id") or "") or None,
                name=str(_dig(p1_name, "name", "player_name") or "Player 1"),
                role="player_1",
            )
        )
    elif p1_name:
        out.append(
            Participant(
                id=str(p1_id) if p1_id is not None else None,
                name=str(p1_name),
                role="player_1",
            )
        )
    if isinstance(p2_name, dict):
        out.append(
            Participant(
                id=str(_dig(p2_name, "id", "player_id") or "") or None,
                name=str(_dig(p2_name, "name", "player_name") or "Player 2"),
                role="player_2",
            )
        )
    elif p2_name:
        out.append(
            Participant(
                id=str(p2_id) if p2_id is not None else None,
                name=str(p2_name),
                role="player_2",
            )
        )
    return out


def map_event(raw: dict[str, Any]) -> Event:
    event_id = str(_dig(raw, "event_key", "id", "event_id", "fixture_id", "match_id") or "")
    participants = _participants(raw)
    name = str(_dig(raw, "name", "match_name", "title") or "")
    if not name and len(participants) >= 2:
        name = f"{participants[0].name} vs {participants[1].name}"

    competition = None
    if _dig(raw, "tournament_name") or _dig(raw, "tournament_key"):
        competition = Competition(
            id=str(_dig(raw, "tournament_key") or "") or None,
            name=str(_dig(raw, "tournament_name") or "Unknown"),
        )
    else:
        tournament = _dig(raw, "tournament", "competition")
        if isinstance(tournament, dict):
            competition = map_competition(tournament)
        elif isinstance(tournament, str):
            competition = Competition(name=tournament)

    # D05: Tennis event_date + event_time have no confirmed upstream timezone.
    # Keep start_time only when the source string carries an explicit offset/Z.
    # Do not invent Europe/Rome or UTC for bare local clock times.
    start = _parse_dt(_dig(raw, "start_time", "scheduled_at", "datetime", "start"))
    if start is not None and start.tzinfo is None:
        start = None

    calendar_date = None
    raw_date = _dig(raw, "event_date", "date")
    if isinstance(raw_date, str) and len(raw_date) >= 10:
        calendar_date = raw_date[:10]

    score_obj = None
    live = _dig(raw, "live_score", "score")
    if isinstance(live, dict):
        final = live.get("final_result")
        if isinstance(final, str) and final.strip() and final.strip() != "-":
            score_obj = EventScore(display=final.strip())
        else:
            sets = live.get("event_games") or live.get("sets")
            # Prefer explicit set scores when present
            if isinstance(sets, list) and sets:
                # leave display null; UI can still show status
                pass
    elif isinstance(live, str) and live.strip() and live.strip() != "-":
        score_obj = EventScore(display=live.strip())

    return Event(
        id=event_id or name or "unknown",
        name=name or "Unknown match",
        competition=competition,
        start_time=start,
        calendar_date=calendar_date,
        participants=participants,
        status=str(_dig(raw, "event_status", "status", "match_lifecycle_status") or "") or None,
        score=score_obj,
        actual_totals=None,
    )


def _player_selection(raw_event: dict[str, Any], winner_label: str | None) -> Selection:
    participants = _participants(raw_event)
    p1 = participants[0] if participants else Participant(name="Player 1", role="player_1")
    p2 = participants[1] if len(participants) > 1 else Participant(name="Player 2", role="player_2")
    label = (winner_label or "").strip().lower()
    if label in {"first player", "player_1", "player1", "home", "1"}:
        return Selection(id="player_1", name=p1.name)
    if label in {"second player", "player_2", "player2", "away", "2"}:
        return Selection(id="player_2", name=p2.name)
    if winner_label:
        return Selection(name=str(winner_label))
    return Selection(name="Unknown")


def map_match_winner(raw: dict[str, Any], event: Event) -> UnifiedPrediction | None:
    prediction = raw.get("prediction")
    if not isinstance(prediction, dict):
        return None
    p1 = _clamp_confidence(prediction.get("prob_player_1_win"))
    conf = _clamp_confidence(prediction.get("confidence")) or (
        max(p1, 1 - p1) if p1 is not None else None
    )
    selection = _player_selection(raw, prediction.get("predicted_winner"))
    probabilities: list[Probability] = []
    if p1 is not None and len(event.participants) >= 2:
        probabilities = [
            Probability(key="player_1", label=event.participants[0].name, value=p1),
            Probability(key="player_2", label=event.participants[1].name, value=1 - p1),
        ]
    return UnifiedPrediction(
        id=f"tennis_{event.id}_match_winner",
        sport=SPORT,
        event=event,
        prediction=PredictionValue(
            type="match_winner",
            selection=selection,
            confidence=conf,
        ),
        probabilities=probabilities,
        provider=ProviderMetadata(
            name=PROVIDER,
            version=str(prediction.get("model_version") or "") or None,
        ),
        oracle_score=None,
        generated_at=_parse_dt(prediction.get("predicted_at")),
        raw=prediction,
    )


def map_extra_market(
    raw_event: dict[str, Any],
    market_payload: dict[str, Any],
    event: Event,
) -> UnifiedPrediction:
    market = str(market_payload.get("market") or "unknown")
    selection_raw = market_payload.get("selection")
    if isinstance(selection_raw, str) and selection_raw.lower() in {
        "first player",
        "second player",
    }:
        selection = _player_selection(raw_event, selection_raw)
    elif isinstance(selection_raw, str):
        selection = Selection(name=selection_raw)
    elif isinstance(selection_raw, dict):
        selection = Selection(
            id=str(selection_raw.get("id") or "") or None,
            name=str(selection_raw.get("name") or selection_raw.get("label") or "Unknown"),
        )
    else:
        selection = Selection(name="Unknown")

    confidence = _clamp_confidence(market_payload.get("probability"))
    probabilities = []
    if confidence is not None:
        probabilities = [
            Probability(key=selection.id or "sel", label=selection.name, value=confidence)
        ]
    return UnifiedPrediction(
        id=f"tennis_{event.id}_{market}",
        sport=SPORT,
        event=event,
        prediction=PredictionValue(type=market, selection=selection, confidence=confidence),
        probabilities=probabilities,
        provider=ProviderMetadata(
            name=PROVIDER,
            version=str(market_payload.get("model_version") or "") or None,
        ),
        oracle_score=None,
        generated_at=_parse_dt(market_payload.get("published_at")),
        raw=market_payload,
    )


def map_predictions_payload(payload: Any) -> list[UnifiedPrediction]:
    predictions: list[UnifiedPrediction] = []
    for raw in _as_list(payload):
        if not isinstance(raw, dict):
            continue
        event = map_event(raw)
        match_winner = map_match_winner(raw, event)
        if match_winner:
            predictions.append(match_winner)
        extras = raw.get("extra_markets")
        if isinstance(extras, list):
            for item in extras:
                if isinstance(item, dict):
                    predictions.append(map_extra_market(raw, item, event))
        # legacy synthetic shape
        nested = raw.get("predictions")
        if isinstance(nested, list):
            for item in nested:
                if isinstance(item, dict):
                    market = str(item.get("market") or "match_winner")
                    if market == "match_winner" and match_winner:
                        continue
                    predictions.append(map_extra_market(raw, {**item, "market": market}, event))
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
