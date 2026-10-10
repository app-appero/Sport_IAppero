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


def test_limit_is_by_events_not_prediction_rows():
    # 3 markets × 2 events — a row-based cap of 4 would drop B; event cap keeps both.
    items = [
        _pred("A", "m1", 0.9),
        _pred("A", "m2", 0.8),
        _pred("A", "m3", 0.7),
        _pred("B", "m1", 0.6),
        _pred("B", "m2", 0.5),
        _pred("B", "m3", 0.4),
    ]
    out = limit_predictions_keeping_events(items, limit=2)
    assert {p.event.id for p in out} == {"A", "B"}
    assert len(out) == 6


def test_limit_truncates_extra_events():
    items = [
        _pred("A", "m1", 0.9),
        _pred("A", "m2", 0.8),
        _pred("B", "m1", 0.6),
        _pred("C", "m1", 0.5),
    ]
    out = limit_predictions_keeping_events(items, limit=2)
    assert [p.event.id for p in out] == ["A", "A", "B"]


def test_limit_none_returns_all():
    items = [_pred("A", "m1", 0.9), _pred("B", "m1", 0.8)]
    assert limit_predictions_keeping_events(items, None) == items
