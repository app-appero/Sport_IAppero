"""Helpers for prediction list shaping."""

from __future__ import annotations

from app.domain.models import UnifiedPrediction


def limit_predictions_keeping_events(
    predictions: list[UnifiedPrediction],
    limit: int | None,
) -> list[UnifiedPrediction]:
    """Keep at most `limit` **events**, including every market for each.

    Mobile cards need all markets per match. Counting prediction rows (e.g. 10
    markets × 20 matches = 200) was hiding the rest of the day — La Liga looked
    empty while only the global top-confidence events fit under the row cap.
    """
    if limit is None or limit <= 0:
        return predictions

    by_event: dict[str, list[UnifiedPrediction]] = {}
    order: list[str] = []
    for pred in predictions:
        eid = pred.event.id
        if eid not in by_event:
            by_event[eid] = []
            order.append(eid)
        by_event[eid].append(pred)

    if len(order) <= limit:
        return predictions

    out: list[UnifiedPrediction] = []
    for eid in order[:limit]:
        out.extend(by_event[eid])
    return out
