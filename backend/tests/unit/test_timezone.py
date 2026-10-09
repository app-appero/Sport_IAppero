from datetime import date, datetime, timezone

from app.core.timezone import ensure_aware_utc, is_naive, rome_day_bounds


def test_rome_day_bounds_summer_cest():
    # 2026-07-01 Europe/Rome is UTC+2 → 22:00 previous day UTC
    start, end = rome_day_bounds("2026-07-01")
    assert start == datetime(2026, 6, 30, 22, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 7, 1, 22, 0, tzinfo=timezone.utc)


def test_rome_day_bounds_winter_cet():
    # 2026-01-15 Europe/Rome is UTC+1
    start, end = rome_day_bounds(date(2026, 1, 15))
    assert start == datetime(2026, 1, 14, 23, 0, tzinfo=timezone.utc)
    assert end == datetime(2026, 1, 15, 23, 0, tzinfo=timezone.utc)


def test_rome_day_bounds_dst_spring_forward():
    # DST starts 2026-03-29 in EU; local day is still midnight→midnight (23h UTC span).
    start, end = rome_day_bounds("2026-03-29")
    assert start.tzinfo == timezone.utc
    assert (end - start).total_seconds() == 23 * 3600


def test_ensure_aware_refuses_naive_when_configured():
    naive = datetime(2026, 10, 8, 4, 0, 0)
    assert is_naive(naive)
    assert ensure_aware_utc(naive, treat_naive_as=None) is None
    assert ensure_aware_utc(naive, treat_naive_as="utc") == datetime(
        2026, 10, 8, 4, 0, 0, tzinfo=timezone.utc
    )
