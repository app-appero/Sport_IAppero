"""Tennis published-prediction ledger → neutral records (pure functions, no I/O).

Source of truth:
- `/api/published-predictions`: the immutable publication (one row per content version).
  The provider refuses to publish or correct after the match has started, so every
  row is pre-match by construction; we still compute `kickoff_at` and check it.
- `/api/live-beta-dashboard`: read-time settlement (`outcome` won/lost/void/pending),
  computed by the provider. The BFF never decides an outcome itself.
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any
from zoneinfo import ZoneInfo

from app.providers.soccer.ledger import LedgerRecord

SPORT = "tennis"
PROVIDER = "tennis-oracle"
SOURCE = "tennis_published"
RULE_VERSION = "tennis-published-v1"
_ROME = ZoneInfo("Europe/Rome")

_OUTCOMES = {"won", "lost", "void", "pending"}


def _dt(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        # The provider stores publication instants as UTC-naive.
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def kickoff_from(event_date: Any, event_time: Any) -> datetime | None:
    """Scheduled start: provider stores Europe/Rome local date/time. No time → unknown."""
    if not isinstance(event_date, str) or not isinstance(event_time, str):
        return None
    try:
        d = date.fromisoformat(event_date)
        t = time.fromisoformat(event_time)
    except ValueError:
        return None
    return datetime.combine(d, t, tzinfo=_ROME).astimezone(timezone.utc)


def map_outcome(outcome: Any) -> str:
    value = str(outcome or "").strip().lower()
    return value if value in _OUTCOMES else "unknown"


def map_published_row(raw: dict[str, Any]) -> LedgerRecord | None:
    """One published version (optionally already carrying `outcome`)."""
    row_id = raw.get("id")
    publication_id = _text(raw.get("publication_id"))
    event_key = _text(raw.get("event_key"))
    market = _text(raw.get("market"))
    selection = _text(raw.get("selection"))
    if row_id is None or not (publication_id and event_key and market and selection):
        return None
    p1, p2 = _text(raw.get("player_1_name")), _text(raw.get("player_2_name"))
    outcome = raw.get("outcome")
    return LedgerRecord(
        source_ref=str(row_id),
        fixture_id=event_key,
        market=market,
        line=None,  # no explicit line field; never parsed from the label here
        period="first_set" if market == "first_set_winner" else "match",
        selection=selection,
        probability=_float(raw.get("probability")),
        odds=_float(raw.get("odds")),
        model_name=_text(raw.get("model_name")),
        model_version=_text(raw.get("model_version")),
        decision=_text(raw.get("value_decision")),
        kickoff_at=kickoff_from(raw.get("event_date"), raw.get("event_time")),
        published_at=_dt(raw.get("published_at")),
        competition_id=None,
        settlement_status=map_outcome(outcome) if outcome is not None else "pending",
        source_status=_text(outcome),
        settled_at=None,
        actual_outcome=None,
        pnl=_float(raw.get("profit")) if outcome in ("won", "lost") else None,
        payload=raw,
        sport=SPORT,
        provider=PROVIDER,
        source=SOURCE,
        rule_version=RULE_VERSION,
        # Stable across corrections: later versions share the publication_id.
        logical_id=f"tennis_pub_{publication_id}",
        event_name=f"{p1} vs {p2}" if p1 and p2 else None,
        competition_name=_text(raw.get("tournament_name")),
    )


def map_published_payload(payload: Any) -> list[LedgerRecord]:
    items = payload.get("items") if isinstance(payload, dict) else payload
    if not isinstance(items, list):
        return []
    out: list[LedgerRecord] = []
    for raw in items:
        if isinstance(raw, dict):
            rec = map_published_row(raw)
            if rec:
                out.append(rec)
    return out


def settled_outcomes(dashboard: Any) -> dict[str, dict[str, Any]]:
    """`{row id: settled row}` from a live-beta-dashboard payload (open + closed lists)."""
    out: dict[str, dict[str, Any]] = {}
    if not isinstance(dashboard, dict):
        return out
    for key in ("closed_predictions", "open_predictions"):
        for raw in dashboard.get(key) or []:
            if isinstance(raw, dict) and raw.get("id") is not None:
                out[str(raw["id"])] = raw
    return out
