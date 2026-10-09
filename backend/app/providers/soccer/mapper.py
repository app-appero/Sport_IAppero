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

SPORT = "football"
PROVIDER = "soccer-oracle"

# Soccer Oracle h2h uses 1=home, X/0?=draw variants, 2=away in several exports.
# Observed live payload: prediction int 1 with home win => home.
H2H_LABELS = {
    1: ("home", "Home"),
    2: ("away", "Away"),
    0: ("draw", "Draw"),
    "1": ("home", "Home"),
    "2": ("away", "Away"),
    "0": ("draw", "Draw"),
    "X": ("draw", "Draw"),
    "x": ("draw", "Draw"),
}


def _as_list(payload: Any) -> list[Any]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in (
            "rows",
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
    return []


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        text = value.replace("Z", "+00:00")
        # "10:15 UTC" alone is not a datetime; ignore
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
    raw_list: list[Any]
    if isinstance(payload, dict) and isinstance(payload.get("markets"), list):
        raw_list = payload["markets"]
    else:
        raw_list = _as_list(payload)
    for raw in raw_list:
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
    home = _dig(raw, "home", "home_team", "team_home")
    away = _dig(raw, "away", "away_team", "team_away")
    out: list[Participant] = []
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
    event_id = str(_dig(raw, "fixture_id", "id", "event_id", "match_id") or "")
    participants = _participants(raw)
    home_name = next((p.name for p in participants if p.role == "home"), None)
    away_name = next((p.name for p in participants if p.role == "away"), None)
    name = str(_dig(raw, "name", "match_name", "title") or "")
    if not name and home_name and away_name:
        name = f"{home_name} vs {away_name}"

    competition = None
    league = _dig(raw, "competition", "league")
    if isinstance(league, dict):
        competition = map_competition(league)
    elif isinstance(league, (str, int)):
        competition = Competition(
            id=str(league),
            name=str(_dig(raw, "league_name", "competition_name") or f"League {league}"),
        )
    elif _dig(raw, "league_name"):
        competition = Competition(
            id=str(_dig(raw, "league_id") or "") or None,
            name=str(_dig(raw, "league_name")),
        )

    score_obj = None
    score_raw = _dig(raw, "score", "ft_score", "result")
    if isinstance(score_raw, dict):
        home_s = _dig(score_raw, "home", "home_goals", "goals_home")
        away_s = _dig(score_raw, "away", "away_goals", "goals_away")
        try:
            home_n = int(home_s) if home_s is not None else None
            away_n = int(away_s) if away_s is not None else None
        except (TypeError, ValueError):
            home_n, away_n = None, None
        display = None
        if home_n is not None and away_n is not None:
            display = f"{home_n}-{away_n}"
        if home_n is not None or away_n is not None or display:
            score_obj = EventScore(home=home_n, away=away_n, display=display)
    elif isinstance(score_raw, str) and score_raw.strip() and score_raw.strip() != "-":
        score_obj = EventScore(display=score_raw.strip())

    totals = _dig(raw, "actual_totals", "totals", "stats")
    actual_totals = totals if isinstance(totals, dict) else None

    return Event(
        id=event_id or name or "unknown",
        name=name or "Unknown match",
        competition=competition,
        start_time=_parse_dt(_dig(raw, "datetime", "start_time", "kickoff", "date", "start")),
        participants=participants,
        status=str(_dig(raw, "status", "phase", "state") or "") or None,
        score=score_obj,
        actual_totals=actual_totals,
    )


def _selection_for_market(
    market: str,
    prediction_code: Any,
    event: Event,
    market_payload: dict[str, Any],
) -> Selection:
    home = next((p.name for p in event.participants if p.role == "home"), "Home")
    away = next((p.name for p in event.participants if p.role == "away"), "Away")

    if market == "h2h":
        fallback = (str(prediction_code), str(prediction_code))
        key, default_label = H2H_LABELS.get(prediction_code, fallback)
        label = {"home": home, "away": away, "draw": "Draw"}.get(key, default_label)
        return Selection(id=key, name=label)

    if market.startswith("under_over_"):
        line = market.replace("under_over_", "").replace("_", ".")
        if prediction_code in (1, "1", True, "over"):
            return Selection(id="over", name=f"Over {line}")
        return Selection(id="under", name=f"Under {line}")

    if market == "goal_no_goal":
        if prediction_code in (1, "1", True, "goal", "yes"):
            return Selection(id="goal", name="Goal")
        return Selection(id="no_goal", name="No Goal")

    if market.startswith("cards_line_"):
        signal = market_payload.get("line_market_signal")
        if isinstance(signal, dict) and signal.get("direction"):
            direction = str(signal["direction"]).lower()
            line = market.replace("cards_line_", "").replace("_", ".")
            return Selection(id=direction, name=f"{direction.title()} {line}")
        if prediction_code in (1, "1"):
            return Selection(id="over", name="Over")
        return Selection(id="under", name="Under")

    if market == "dc":
        mapping = {1: "1X", 2: "12", 0: "X2", "1": "1X", "2": "12", "0": "X2"}
        label = mapping.get(prediction_code, str(prediction_code))
        return Selection(id=str(prediction_code), name=label)

    return Selection(id=str(prediction_code), name=str(prediction_code))


def _probabilities_for_market(
    market: str,
    confidence: float | None,
    selection: Selection,
    event: Event,
) -> list[Probability]:
    del market, event  # full distribution often unavailable upstream
    if confidence is None:
        return []
    # Only the selected-outcome probability is typically present upstream.
    return [Probability(key=selection.id or "sel", label=selection.name, value=confidence)]


def map_market_prediction(
    market: str,
    market_payload: dict[str, Any],
    event: Event,
) -> UnifiedPrediction:
    confidence = _clamp_confidence(
        _dig(market_payload, "probability", "confidence", "p_model")
    )
    selection = _selection_for_market(
        market,
        market_payload.get("prediction"),
        event,
        market_payload,
    )
    probabilities = _probabilities_for_market(market, confidence, selection, event)
    correct_raw = market_payload.get("correct")
    correct: bool | None
    if correct_raw is True:
        correct = True
    elif correct_raw is False:
        correct = False
    else:
        correct = None

    return UnifiedPrediction(
        id=f"soccer_{event.id}_{market}",
        sport=SPORT,
        event=event,
        prediction=PredictionValue(type=market, selection=selection, confidence=confidence),
        probabilities=probabilities,
        provider=ProviderMetadata(name=PROVIDER, version=None),
        oracle_score=None,
        generated_at=None,
        correct=correct,
        raw=market_payload,
    )


def map_day_payload(payload: Any) -> list[UnifiedPrediction]:
    predictions: list[UnifiedPrediction] = []
    for raw in _as_list(payload):
        if not isinstance(raw, dict):
            continue
        event = map_event(raw)
        nested = raw.get("predictions")
        if isinstance(nested, dict):
            for market, market_payload in nested.items():
                if isinstance(market_payload, dict):
                    predictions.append(map_market_prediction(str(market), market_payload, event))
            continue
        if isinstance(nested, list):
            for item in nested:
                if isinstance(item, dict):
                    market = str(item.get("market") or item.get("type") or "unknown")
                    predictions.append(map_market_prediction(market, item, event))
            continue
        # flat single-market row
        if "market" in raw or "probability" in raw:
            market = str(raw.get("market") or "match_winner")
            predictions.append(map_market_prediction(market, raw, event))
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
    if not prediction_id.startswith("soccer_"):
        return None
    rest = prediction_id[len("soccer_") :]
    parts = rest.split("_")
    if len(parts) < 2:
        return None
    if parts[0].isdigit():
        return parts[0], "_".join(parts[1:])
    return parts[0], "_".join(parts[1:])
