"""Timezone helpers for feed day queries (Europe/Rome MVP)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

ROME = ZoneInfo("Europe/Rome")
UTC = timezone.utc


def rome_day_bounds(day: date | str) -> tuple[datetime, datetime]:
    """Return half-open [start, end) UTC bounds for a calendar day in Europe/Rome.

    Accepts YYYY-MM-DD or date. Used to document/verify date filters; providers
    still receive the calendar date string (target_date / from-to) as-is.
    """
    if isinstance(day, str):
        day = date.fromisoformat(day)
    start_local = datetime.combine(day, time.min, tzinfo=ROME)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def ensure_aware_utc(dt: datetime | None, *, treat_naive_as: str | None = "utc") -> datetime | None:
    """Normalize datetimes for sorting.

    - aware → UTC
    - naive + treat_naive_as='utc' → attach UTC (legacy sort path; not a claim of source TZ)
    - naive + treat_naive_as=None → None (refuse silent conversion)
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        if treat_naive_as is None:
            return None
        if treat_naive_as == "utc":
            return dt.replace(tzinfo=UTC)
        raise ValueError(f"Unsupported treat_naive_as={treat_naive_as!r}")
    return dt.astimezone(UTC)


def is_naive(dt: datetime | None) -> bool:
    return dt is not None and dt.tzinfo is None
