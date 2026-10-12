"""Soccer official ledger (`/predictions/official/plays`) → neutral records.

Pure functions: no I/O. Status values come from the provider code
(`oracle/ledger/prediction_ledger.py`); anything unlisted maps to `unknown`
and keeps the source string, never a guessed win/loss.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

SPORT = "football"
PROVIDER = "soccer-oracle"
SOURCE = "soccer_official"
RULE_VERSION = "soccer-ledger-v1"

_WON = {"settled_win"}
_LOST = {"settled_loss"}
_VOID = {
    "void_cancelled",
    "void_postponed",
    "void_abandoned",
    "void_push",
    "void_no_result",
    "void_market_rule",
}
_NOT_PLACED = {"not_placed_missing_odd"}


@dataclass(frozen=True)
class LedgerRecord:
    source_ref: str
    fixture_id: str
    market: str
    line: str | None
    period: str | None
    selection: str
    probability: float | None
    odds: float | None
    model_name: str | None
    model_version: str | None  # policy_version of the decision rule
    decision: str | None
    kickoff_at: datetime | None
    published_at: datetime | None
    competition_id: str | None
    settlement_status: str
    source_status: str | None
    settled_at: datetime | None
    actual_outcome: str | None
    pnl: float | None
    payload: dict[str, Any]


def _dt(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    # A naive timestamp has no verifiable zone: treat as unknown, not as UTC.
    return parsed if parsed.tzinfo else None


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


def map_settlement_status(
    source_status: str | None, is_settled: Any, won: Any
) -> str:
    """pending | won | lost | void | not_placed | unknown."""
    status = (source_status or "").strip().lower()
    if status in _WON:
        return "won"
    if status in _LOST:
        return "lost"
    if status in _VOID:
        return "void"
    if status in _NOT_PLACED:
        return "not_placed"
    if status == "settled":  # legacy rows: rely on the explicit boolean
        if won is True:
            return "won"
        if won is False:
            return "lost"
        return "unknown"
    if not status and not is_settled:
        return "pending"
    if status in {"pending", "open"} and not is_settled:
        return "pending"
    return "unknown"


def map_ledger_row(raw: dict[str, Any]) -> LedgerRecord | None:
    ref = _text(raw.get("id_prediction"))
    fixture = _text(raw.get("fixture_id"))
    market = _text(raw.get("market"))
    selection = _text(raw.get("outcome"))
    if not (ref and fixture and market and selection):
        return None  # incomplete row: skip rather than invent fields
    source_status = _text(raw.get("settlement_status"))
    return LedgerRecord(
        source_ref=ref,
        fixture_id=fixture,
        market=market,
        line=_text(raw.get("line")),
        period=_text(raw.get("period")),
        selection=selection,
        probability=_float(raw.get("p_model")),
        odds=_float(raw.get("odd")),
        model_name=_text(raw.get("model_name")),
        model_version=_text(raw.get("policy_version")),
        decision=_text(raw.get("decision")),
        kickoff_at=_dt(raw.get("kickoff_at")),
        published_at=_dt(raw.get("captured_at")),
        competition_id=_text(raw.get("league")),
        settlement_status=map_settlement_status(
            source_status, raw.get("is_settled"), raw.get("won")
        ),
        source_status=source_status,
        settled_at=_dt(raw.get("settled_at")),
        actual_outcome=_text(raw.get("actual_outcome")),
        pnl=_float(raw.get("pnl")),
        payload=raw,
    )


def map_ledger_payload(payload: Any) -> list[LedgerRecord]:
    rows = payload.get("rows") if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        return []
    out: list[LedgerRecord] = []
    for raw in rows:
        if isinstance(raw, dict):
            rec = map_ledger_row(raw)
            if rec:
                out.append(rec)
    return out
