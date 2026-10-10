"""Helpers for prediction list shaping."""

from __future__ import annotations

from app.domain.models import UnifiedPrediction


def limit_predictions_keeping_events(
    predictions: list[UnifiedPrediction],
    limit: int | None,
) -> list[UnifiedPrediction]:
    """Apply a soft item limit without truncating mid-event.

    Predictions are assumed pre-sorted (e.g. confidence desc). We include whole
    events in first-seen order until adding another event would exceed `limit`,
    always keeping at least one full event when the list is non-empty.
    """
    if limit is None or limit <= 0 or len(predictions) <= limit:
        return predictions

    by_event: dict[str, list[UnifiedPrediction]] = {}
    order: list[str] = []
    for pred in predictions:
        eid = pred.event.id
        if eid not in by_event:
            by_event[eid] = []
            order.append(eid)
        by_event[eid].append(pred)

    out: list[UnifiedPrediction] = []
    for eid in order:
        chunk = by_event[eid]
        if out and len(out) + len(chunk) > limit:
            break
        out.extend(chunk)
    return out
