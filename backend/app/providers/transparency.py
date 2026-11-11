"""Shared builders for the additive transparency fields of UnifiedPrediction.

Both engine mappers go through these helpers so football and tennis expose the
same fields with the same meaning. Nothing here computes or adjusts a
prediction: values are read from the engine payload and passed on, and what the
engine does not send stays empty.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any

from app.domain.models import (
    Availability,
    DataFreshness,
    ModelInfo,
    Provenance,
    UnavailableMarket,
)

ANOMALY_PROBABILITY_MISSING = "probability_missing"
ANOMALY_PROBABILITY_NOT_NUMERIC = "probability_not_numeric"
ANOMALY_PROBABILITY_AS_PERCENT = "probability_sent_as_percent"
ANOMALY_PROBABILITY_OUT_OF_RANGE = "probability_out_of_range"

_MAX_ANOMALIES = 12
_MAX_ANOMALY_LENGTH = 200


def clean_text(value: Any) -> str | None:
    if value is None or isinstance(value, bool):
        return None
    text = str(value).strip()
    return text or None


def parse_timestamp(value: Any) -> datetime | None:
    """ISO timestamp as sent by the engine. A naive value stays naive: the zone is
    not known here and is not assumed."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def model_info(name: Any, version: Any) -> ModelInfo | None:
    model_name = clean_text(name)
    model_version = clean_text(version)
    if model_name is None and model_version is None:
        return None
    return ModelInfo(name=model_name, version=model_version)


def probability_anomalies(raw_value: Any, confidence: float | None) -> list[str]:
    """Problems with the probability as the engine sent it. `raw_value` is the
    engine field, `confidence` what ends up in the unified prediction."""
    if confidence is None:
        if raw_value is not None and not _is_number(raw_value):
            return [ANOMALY_PROBABILITY_NOT_NUMERIC]
        return [ANOMALY_PROBABILITY_MISSING]
    if raw_value is None or not _is_number(raw_value):
        return []
    number = float(raw_value)
    if number < 0.0 or number > 100.0:
        return [ANOMALY_PROBABILITY_OUT_OF_RANGE]
    if number > 1.0:
        return [ANOMALY_PROBABILITY_AS_PERCENT]
    return []


def engine_warnings(*values: Any) -> list[str]:
    """Warning strings declared by the engine, de-duplicated, order kept."""
    out: list[str] = []
    for value in values:
        items = value if isinstance(value, (list, tuple)) else [value]
        for item in items:
            text = clean_text(item)
            if text is None:
                continue
            text = text[:_MAX_ANOMALY_LENGTH]
            if text not in out:
                out.append(text)
    return out[:_MAX_ANOMALIES]


def merge_anomalies(*groups: list[str]) -> list[str]:
    out: list[str] = []
    for group in groups:
        for item in group:
            if item not in out:
                out.append(item)
    return out[:_MAX_ANOMALIES]


def availability(confidence: float | None, limited_reason: str | None = None) -> Availability:
    if confidence is None:
        return Availability(status="unavailable", reason="no_probability")
    if limited_reason:
        return Availability(status="limited", reason=limited_reason)
    return Availability(status="available")


def data_freshness(
    *,
    predicted_at: datetime | None = None,
    event_data_updated_at: datetime | None = None,
    live_updated_at: datetime | None = None,
    odds_captured_at: datetime | None = None,
) -> DataFreshness | None:
    stamps = [predicted_at, event_data_updated_at, live_updated_at, odds_captured_at]
    present = [s for s in stamps if s is not None]
    if not present:
        return None
    return DataFreshness(
        predicted_at=predicted_at,
        event_data_updated_at=event_data_updated_at,
        live_updated_at=live_updated_at,
        odds_captured_at=odds_captured_at,
        timezone_explicit=all(s.tzinfo is not None for s in present),
    )


def provenance(engine: str, *, source: Any = None, data_quality: Any = None) -> Provenance:
    return Provenance(
        engine=engine,
        source=clean_text(source),
        data_quality=data_quality if isinstance(data_quality, dict) and data_quality else None,
    )


def unavailable_markets(
    markets: Any,
    reasons: Any = None,
    *,
    default_reason: str | None = None,
) -> list[UnavailableMarket]:
    """Markets without a prediction. `reasons` (market -> code) wins over
    `default_reason`; a market present only in `reasons` is listed too."""
    reason_by_market: dict[str, str | None] = {}
    if isinstance(markets, (list, tuple)):
        for market in markets:
            key = clean_text(market)
            if key is not None:
                reason_by_market.setdefault(key, default_reason)
    if isinstance(reasons, dict):
        for market, reason in reasons.items():
            key = clean_text(market)
            if key is None:
                continue
            reason_by_market[key] = clean_text(reason) or reason_by_market.get(key)
    return [UnavailableMarket(market=m, reason=r) for m, r in reason_by_market.items()]


def _is_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False
