from __future__ import annotations

from datetime import datetime
from typing import Any

from app.domain.models import (
    Competition,
    DecisionInfo,
    Event,
    EventScore,
    MarketInfo,
    Participant,
    PredictionValue,
    PricingInfo,
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
    0: ("draw", "Pareggio"),
    "1": ("home", "Home"),
    "2": ("away", "Away"),
    "0": ("draw", "Pareggio"),
    "X": ("draw", "Pareggio"),
    "x": ("draw", "Pareggio"),
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

    start = _parse_dt(_dig(raw, "datetime", "start_time", "kickoff", "date", "start"))
    calendar_date = None
    raw_date = _dig(raw, "date")
    if isinstance(raw_date, str) and len(raw_date) >= 10:
        calendar_date = raw_date[:10]
    elif start is not None:
        calendar_date = start.date().isoformat()

    return Event(
        id=event_id or name or "unknown",
        name=name or "Unknown match",
        competition=competition,
        start_time=start,
        calendar_date=calendar_date,
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
        label = {"home": home, "away": away, "draw": "Pareggio"}.get(key, default_label)
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
        # Keep id aligned with the human label so settlement stays stable.
        return Selection(id=label, name=label)

    return Selection(id=str(prediction_code), name=str(prediction_code))


def _line_from_market(market: str, prefix: str) -> float | None:
    try:
        return float(market.removeprefix(prefix).replace("_", "."))
    except ValueError:
        return None


def _settle_soccer_market(market: str, selection: Selection, event: Event) -> bool | None:
    """Settle from FT score / totals. Prefer this over upstream `correct` flags."""
    score = event.score
    totals = event.actual_totals or {}
    sel = (selection.id or "").lower()
    name = (selection.name or "").strip().upper()

    if market == "h2h":
        if score is None or score.home is None or score.away is None:
            return None
        h, a = int(score.home), int(score.away)
        if sel == "home":
            return h > a
        if sel == "away":
            return a > h
        if sel in {"draw", "x"} or name in {"DRAW", "PAREGGIO", "X"}:
            return h == a
        return None

    if market == "dc":
        if score is None or score.home is None or score.away is None:
            return None
        h, a = int(score.home), int(score.away)
        label = name or sel.upper()
        if label == "1X":
            return h >= a
        if label == "X2":
            return a >= h
        if label == "12":
            return h != a
        return None

    if market.startswith("under_over_"):
        if score is None or score.home is None or score.away is None:
            return None
        line = _line_from_market(market, "under_over_")
        if line is None:
            return None
        goals = int(score.home) + int(score.away)
        if sel == "over" or name.startswith("OVER"):
            return goals > line
        if sel == "under" or name.startswith("UNDER"):
            return goals < line
        return None

    if market == "goal_no_goal":
        if score is None or score.home is None or score.away is None:
            return None
        both = int(score.home) > 0 and int(score.away) > 0
        if sel == "goal":
            return both
        if sel in {"no_goal", "nogoal"}:
            return not both
        return None

    if market.startswith("cards_line_"):
        cards = totals.get("cards")
        if cards is None:
            return None
        line = _line_from_market(market, "cards_line_")
        if line is None:
            return None
        try:
            cards_n = float(cards)
        except (TypeError, ValueError):
            return None
        if sel == "over" or name.startswith("OVER"):
            return cards_n > line
        if sel == "under" or name.startswith("UNDER"):
            return cards_n < line
        return None

    return None


def _is_binary_soccer_market(market: str) -> bool:
    return (
        market.startswith("under_over_")
        or market.startswith("cards_line_")
        or market == "goal_no_goal"
    )


def _confidence_for_selection(market: str, market_payload: dict[str, Any]) -> float | None:
    """Map upstream probability to P(selected outcome).

    For binary soccer markets, `probability` is P(class 1) (over / goal), not
    always P(chosen side). When prediction is class 0 (under / no_goal), use 1-p.
    h2h / dc are multi-way: keep p as-is (already outcome probability).
    """
    p = _clamp_confidence(_dig(market_payload, "probability", "confidence", "p_model"))
    if p is None:
        return None
    if not _is_binary_soccer_market(market):
        return p

    code = market_payload.get("prediction")
    # Class 1 → show p; class 0 → show 1-p (docs: predicted_probability).
    if code in (1, "1", True, "over", "goal", "yes"):
        return p
    if code in (0, "0", False, "under", "no_goal", "nogoal", "no"):
        return max(0.0, min(1.0, 1.0 - p))
    return p


def _class1_probability(market_payload: dict[str, Any]) -> float | None:
    """Raw P(class 1) for binary markets (over / goal)."""
    return _clamp_confidence(
        _dig(
            market_payload,
            "class_1_probability",
            "probability",
            "confidence",
            "p_model",
        )
    )


def _parse_1x2_probabilities(
    payload: dict[str, Any] | None,
) -> dict[str, float] | None:
    """Parse match-detail `predictions['1x2'].probabilities` → home/draw/away."""
    if not isinstance(payload, dict):
        return None
    raw = payload.get("probabilities")
    if not isinstance(raw, dict):
        return None
    mapped: dict[str, float] = {}
    for key, value in raw.items():
        k = str(key).strip().lower()
        p = _clamp_confidence(value)
        if p is None:
            continue
        if k in {"home", "1", "h"}:
            mapped["home"] = p
        elif k in {"draw", "x", "d", "pareggio"}:
            mapped["draw"] = p
        elif k in {"away", "2", "a"}:
            mapped["away"] = p
    if {"home", "draw", "away"} <= mapped.keys():
        return mapped
    return None


def _binary_side_probabilities(
    market: str,
    market_payload: dict[str, Any],
    selection: Selection,
) -> list[Probability]:
    """Emit both sides for OU / cards / GNG using P(class 1)."""
    p1 = _class1_probability(market_payload)
    if p1 is None:
        conf = _confidence_for_selection(market, market_payload)
        if conf is None:
            return []
        return [Probability(key=selection.id or "sel", label=selection.name, value=conf)]

    p0 = max(0.0, min(1.0, 1.0 - p1))
    if market.startswith("under_over_") or market.startswith("cards_line_"):
        prefix = "under_over_" if market.startswith("under_over_") else "cards_line_"
        line = market.removeprefix(prefix).replace("_", ".")
        over_label = f"Over {line}"
        under_label = f"Under {line}"
        return [
            Probability(key="over", label=over_label, value=p1),
            Probability(key="under", label=under_label, value=p0),
        ]
    if market == "goal_no_goal":
        return [
            Probability(key="goal", label="Goal", value=p1),
            Probability(key="no_goal", label="No Goal", value=p0),
        ]
    return []


def _h2h_probabilities_from_1x2(
    three_way: dict[str, float],
    event: Event,
) -> list[Probability]:
    home = next((p.name for p in event.participants if p.role == "home"), "Home")
    away = next((p.name for p in event.participants if p.role == "away"), "Away")
    return [
        Probability(key="home", label=home, value=three_way["home"]),
        Probability(key="draw", label="Pareggio", value=three_way["draw"]),
        Probability(key="away", label=away, value=three_way["away"]),
    ]


def _dc_probabilities_from_1x2(three_way: dict[str, float]) -> list[Probability]:
    return [
        Probability(
            key="1X",
            label="1X",
            value=max(0.0, min(1.0, three_way["home"] + three_way["draw"])),
        ),
        Probability(
            key="X2",
            label="X2",
            value=max(0.0, min(1.0, three_way["draw"] + three_way["away"])),
        ),
        Probability(
            key="12",
            label="12",
            value=max(0.0, min(1.0, three_way["home"] + three_way["away"])),
        ),
    ]


def _pricing_from_card(card: dict[str, Any] | None) -> PricingInfo | None:
    if not isinstance(card, dict):
        return None

    def _num(key: str) -> float | None:
        try:
            val = card.get(key)
            if val is None:
                return None
            return float(val)
        except (TypeError, ValueError):
            return None

    pricing = PricingInfo(
        odds_decimal=_num("odd") if card.get("odd") is not None else _num("market_odd"),
        expected_value=_num("ev"),
        probability_edge=_num("prob_edge")
        if card.get("prob_edge") is not None
        else _num("edge"),
        fair_odds=_num("fair_odd")
        if card.get("fair_odd") is not None
        else _num("market_fair_odd"),
        bookmakers_count=int(card["bookmakers_count"])
        if isinstance(card.get("bookmakers_count"), (int, float))
        else None,
    )
    if (
        pricing.odds_decimal is None
        and pricing.expected_value is None
        and pricing.probability_edge is None
        and pricing.fair_odds is None
    ):
        return None
    return pricing


def _decision_from_card(card: dict[str, Any] | None) -> DecisionInfo | None:
    if not isinstance(card, dict):
        return None
    code = card.get("value_label") or card.get("decision")
    reason = card.get("value_reason")
    policy = card.get("policy_version")
    if code is None and reason is None:
        return None
    return DecisionInfo(
        code=str(code) if code is not None else None,
        reason=str(reason) if reason is not None else None,
        policy_version=str(policy) if policy is not None else None,
    )


def _index_decision_cards(raw: dict[str, Any]) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    cards = raw.get("decision_cards")
    if not isinstance(cards, list):
        return out
    for card in cards:
        if not isinstance(card, dict):
            continue
        market = card.get("market")
        if not market:
            continue
        key = str(market)
        # Prefer is_market_best when multiple cards share a market.
        prev = out.get(key)
        if prev is None or card.get("is_market_best") is True:
            out[key] = card
    best = raw.get("best_decision")
    if isinstance(best, dict) and best.get("market"):
        key = str(best["market"])
        out.setdefault(key, best)
    return out


def _resolve_correct(
    market: str,
    selection: Selection,
    event: Event,
    market_payload: dict[str, Any],
) -> bool | None:
    settled = _settle_soccer_market(market, selection, event)
    if settled is not None:
        return settled
    correct_raw = market_payload.get("correct")
    if correct_raw is True:
        return True
    if correct_raw is False:
        return False
    return None


def map_market_prediction(
    market: str,
    market_payload: dict[str, Any],
    event: Event,
    *,
    three_way: dict[str, float] | None = None,
    decision_card: dict[str, Any] | None = None,
) -> UnifiedPrediction:
    selection = _selection_for_market(
        market,
        market_payload.get("prediction"),
        event,
        market_payload,
    )

    probabilities: list[Probability] = []
    confidence: float | None

    if market == "h2h" and three_way is not None:
        probabilities = _h2h_probabilities_from_1x2(three_way, event)
        # Recommended pick stays the legacy h2h prediction; confidence from board.
        matched = next((p for p in probabilities if p.key == selection.id), None)
        confidence = matched.value if matched else three_way.get(selection.id or "", None)
    elif market == "dc" and three_way is not None:
        probabilities = _dc_probabilities_from_1x2(three_way)
        matched = next((p for p in probabilities if p.key == selection.id), None)
        confidence = matched.value if matched else _confidence_for_selection(market, market_payload)
    elif _is_binary_soccer_market(market):
        probabilities = _binary_side_probabilities(market, market_payload, selection)
        matched = next((p for p in probabilities if p.key == (selection.id or "")), None)
        confidence = (
            matched.value
            if matched
            else _confidence_for_selection(market, market_payload)
        )
    else:
        confidence = _confidence_for_selection(market, market_payload)
        if confidence is not None:
            probabilities = [
                Probability(
                    key=selection.id or "sel",
                    label=selection.name,
                    value=confidence,
                )
            ]

    # When we already have a full outcome board (1x2 / both binary sides), keep
    # those probabilities intact. Decision-card p only fills confidence if the
    # board did not yield a value for the recommended pick.
    if confidence is None and isinstance(decision_card, dict):
        confidence = _clamp_confidence(
            _dig(decision_card, "predicted_probability", "p_model")
        )

    correct = _resolve_correct(market, selection, event, market_payload)

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
        pricing=_pricing_from_card(decision_card),
        decision=_decision_from_card(decision_card),
        raw=market_payload,
    )


def _normalize_match_row(raw: dict[str, Any]) -> dict[str, Any]:
    """Flatten dashboard match / oracle-detail envelopes into a day-row shape."""
    if "fixture_id" in raw or "home" in raw:
        return raw
    fixture = raw.get("fixture")
    if isinstance(fixture, dict):
        merged = {**fixture}
        for key in (
            "predictions",
            "decision_cards",
            "best_decision",
            "actual_totals",
            "score",
            "status",
            "phase",
        ):
            if key in raw and key not in merged:
                merged[key] = raw[key]
        return merged
    return raw


def map_row_predictions(raw: dict[str, Any]) -> list[UnifiedPrediction]:
    row = _normalize_match_row(raw)
    event = map_event(row)
    nested = row.get("predictions")
    cards = _index_decision_cards(row)

    if isinstance(nested, dict):
        three_way = _parse_1x2_probabilities(
            nested.get("1x2") if isinstance(nested.get("1x2"), dict) else None
        )
        # Also accept probabilities nested directly under a match_result alias.
        if three_way is None and isinstance(nested.get("match_result"), dict):
            three_way = _parse_1x2_probabilities(nested.get("match_result"))

        out: list[UnifiedPrediction] = []
        for market, market_payload in nested.items():
            mkey = str(market)
            # Fold 1x2 board into h2h/dc — do not emit a separate market row.
            if mkey in {"1x2", "match_result"}:
                continue
            if not isinstance(market_payload, dict):
                continue
            out.append(
                map_market_prediction(
                    mkey,
                    market_payload,
                    event,
                    three_way=three_way if mkey in {"h2h", "dc"} else None,
                    decision_card=cards.get(mkey),
                )
            )

        # Detail payload with 1x2 but missing legacy h2h: synthesize recommended from argmax.
        if three_way is not None and not any(p.prediction.type == "h2h" for p in out):
            argmax = max(three_way.items(), key=lambda kv: kv[1])[0]
            code = {"home": 1, "away": 2, "draw": 0}[argmax]
            out.insert(
                0,
                map_market_prediction(
                    "h2h",
                    {"prediction": code, "probability": three_way[argmax]},
                    event,
                    three_way=three_way,
                    decision_card=cards.get("h2h") or cards.get("1x2"),
                ),
            )
        if three_way is not None and not any(p.prediction.type == "dc" for p in out):
            dc_board = {
                "1X": three_way["home"] + three_way["draw"],
                "X2": three_way["draw"] + three_way["away"],
                "12": three_way["home"] + three_way["away"],
            }
            best_dc = max(dc_board.items(), key=lambda kv: kv[1])[0]
            code = {"1X": 1, "12": 2, "X2": 0}[best_dc]
            out.append(
                map_market_prediction(
                    "dc",
                    {"prediction": code, "probability": dc_board[best_dc]},
                    event,
                    three_way=three_way,
                    decision_card=cards.get("dc"),
                )
            )
        return out

    if isinstance(nested, list):
        return [
            map_market_prediction(
                str(item.get("market") or item.get("type") or "unknown"),
                item,
                event,
                decision_card=cards.get(str(item.get("market") or "")),
            )
            for item in nested
            if isinstance(item, dict)
        ]

    if "market" in row or "probability" in row:
        market = str(row.get("market") or "match_winner")
        return [
            map_market_prediction(
                market,
                row,
                event,
                decision_card=cards.get(market),
            )
        ]
    return []


def map_day_payload(payload: Any) -> list[UnifiedPrediction]:
    predictions: list[UnifiedPrediction] = []
    for raw in _as_list(payload):
        if not isinstance(raw, dict):
            continue
        predictions.extend(map_row_predictions(raw))
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
