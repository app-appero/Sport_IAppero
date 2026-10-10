from datetime import datetime, timezone

from app.domain.models import Event, PredictionValue, ProviderMetadata, Selection, UnifiedPrediction
from app.providers.prediction_utils import limit_predictions_keeping_events


def _pred(event_id: str, market: str, conf: float) -> UnifiedPrediction:
    return UnifiedPrediction(
        id=f"{event_id}_{market}",
        sport="football",
        event=Event(id=event_id, name=f"Match {event_id}"),
        prediction=PredictionValue(
            type=market,
            selection=Selection(id="over", name="Over"),
            confidence=conf,
        ),
        provider=ProviderMetadata(name="test"),
        generated_at=datetime.now(timezone.utc),
    )


def test_limit_keeps_all_markets_for_included_events():
    # Sorted by confidence: A markets first, then B.
    items = [
        _pred("A", "m1", 0.9),
        _pred("A", "m2", 0.8),
        _pred("A", "m3", 0.7),
        _pred("B", "m1", 0.6),
        _pred("B", "m2", 0.5),
    ]
    out = limit_predictions_keeping_events(items, limit=4)
    # 3 from A fit under 4; adding B (2) would exceed → only A, complete.
    assert [p.event.id for p in out] == ["A", "A", "A"]
    assert {p.prediction.type for p in out} == {"m1", "m2", "m3"}


def test_limit_includes_at_least_one_full_event():
    items = [
        _pred("A", "m1", 0.9),
        _pred("A", "m2", 0.8),
        _pred("A", "m3", 0.7),
    ]
    out = limit_predictions_keeping_events(items, limit=1)
    assert len(out) == 3
    assert all(p.event.id == "A" for p in out)


def test_limit_none_returns_all():
    items = [_pred("A", "m1", 0.9), _pred("B", "m1", 0.8)]
    assert limit_predictions_keeping_events(items, None) == items
