from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app.core.config import Settings
from app.core.exceptions import ProviderResponseError, ProviderUnavailable
from app.domain.models import Competition, Event, MarketInfo, UnifiedPrediction
from app.providers.base import SportProvider
from app.providers.http_utils import load_fixture, request_json
from app.providers.prediction_utils import limit_predictions_keeping_events
from app.providers.soccer import ledger, mapper
from app.providers.soccer.ledger import LedgerRecord

logger = logging.getLogger(__name__)

_PUBLIC_PATHS = {"/health", "/health/database"}
_ROME = ZoneInfo("Europe/Rome")


def _progress(value: Any, state: str) -> int | None:
    """Avanzamento 0-100 dichiarato dal motore; 100 a lavoro finito, None se non noto."""
    if state == "success":
        return 100
    try:
        return max(0, min(100, int(float(value))))
    except (TypeError, ValueError):
        return None


class SoccerProvider(SportProvider):
    sport = mapper.SPORT
    provider_name = mapper.PROVIDER

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None):
        self._settings = settings
        self._owns_client = client is None
        self._token: str | None = None
        timeout = httpx.Timeout(
            connect=settings.provider_connect_timeout,
            read=settings.provider_read_timeout,
            write=settings.provider_read_timeout,
            pool=settings.provider_connect_timeout,
        )
        headers: dict[str, str] = {}
        if settings.soccer_oracle_api_key:
            headers["X-API-Key"] = settings.soccer_oracle_api_key
        self._client = client or httpx.AsyncClient(
            base_url=settings.soccer_oracle_base_url.rstrip("/"),
            timeout=timeout,
            headers=headers,
        )

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    def _extract_token(self, data: Any) -> str | None:
        if not isinstance(data, dict):
            return None
        nested = data.get("data") if isinstance(data.get("data"), dict) else {}
        for key in ("access_token", "token", "accessToken", "jwt", "id_token"):
            value = data.get(key) or nested.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    async def _ensure_auth(self) -> None:
        if self._settings.use_provider_fixtures:
            return
        if self._token:
            return
        # Static API key alone may be enough for some deployments.
        if self._settings.soccer_oracle_api_key and not (
            self._settings.soccer_oracle_username and self._settings.soccer_oracle_password
        ):
            self._token = "api-key"
            return
        username = self._settings.soccer_oracle_username
        password = self._settings.soccer_oracle_password
        if not username or not password:
            raise ProviderResponseError(
                self.provider_name,
                "Missing SOCCER_ORACLE_USERNAME/PASSWORD",
                401,
            )
        try:
            response = await self._client.post(
                "/auth/login",
                json={"username": username, "password": password},
            )
        except httpx.HTTPError as exc:
            raise ProviderUnavailable(self.provider_name, f"Login failed: {exc}") from exc
        if response.status_code >= 400:
            raise ProviderResponseError(
                self.provider_name,
                f"Login returned {response.status_code}",
                response.status_code,
            )

        data: Any = {}
        if response.content:
            try:
                data = response.json()
            except ValueError:
                data = {}

        token = self._extract_token(data)
        if token:
            self._token = token
            self._client.headers["Authorization"] = f"Bearer {token}"
            logger.info("Authenticated against soccer-oracle as %s (bearer)", username)
            return

        # Session/cookie auth: httpx keeps cookies on the shared client.
        if response.cookies or "set-cookie" in {k.lower() for k in response.headers.keys()}:
            self._token = "cookie-session"
            logger.info("Authenticated against soccer-oracle as %s (session cookie)", username)
            return

        raise ProviderResponseError(
            self.provider_name,
            "Login succeeded but no access_token or session cookie was returned",
        )

    async def _get(
        self, path: str, params: dict[str, Any] | None = None, *, method: str = "GET", json: Any = None
    ) -> Any:
        if self._settings.use_provider_fixtures:
            return self._fixture_for(path, params)
        if path not in _PUBLIC_PATHS:
            await self._ensure_auth()
        try:
            return await request_json(
                self._client,
                provider=self.provider_name,
                method=method,
                path=path,
                params=params,
                json=json,
            )
        except ProviderResponseError as exc:
            # refresh token once on 401 for protected routes
            if (
                exc.status_code == 401
                and path not in _PUBLIC_PATHS
                and self._settings.soccer_oracle_username
            ):
                self._token = None
                self._client.headers.pop("Authorization", None)
                await self._ensure_auth()
                return await request_json(
                    self._client,
                    provider=self.provider_name,
                    method=method,
                    path=path,
                    params=params,
                    json=json,
                )
            raise

    def _fixture_for(self, path: str, params: dict[str, Any] | None) -> Any:
        if path == "/health":
            return {"status": "ok"}
        if path == "/health/database":
            return load_fixture("soccer", "health_database.json")
        if path == "/markets":
            return load_fixture("soccer", "markets.json")
        if path.startswith("/dashboard/match/") and path.endswith("/oracle-detail"):
            return load_fixture("soccer", "oracle_detail.json")
        if path.startswith("/dashboard/match/"):
            return load_fixture("soccer", "match.json")
        if path == "/dashboard/day":
            return load_fixture("soccer", "day.json")
        if path == "/dashboard/available-dates":
            return load_fixture("soccer", "available_dates.json")
        if path == "/predictions/official/plays":
            return load_fixture("soccer", "official_plays.json")
        if path == "/jobs/daily-refresh":
            return {"queued": True, "message": "Daily refresh job queued", "details": {"job_id": "fixture-job-1"}}
        if path.startswith("/jobs/fixture-job"):
            return {"job_id": "fixture-job-1", "job_type": "daily_refresh", "status": "success"}
        if path == "/scorers/day":
            return load_fixture("soccer", "scorers_day.json")
        if path.startswith("/scorers/fixture/"):
            fixture = load_fixture("soccer", "scorers_day.json")
            wanted = path.rsplit("/", 1)[-1]
            fixture["rows"] = [r for r in fixture["rows"] if str(r["fixture_id"]) == wanted]
            fixture["supported"] = wanted != "9002"  # 9002 = fixture di una competizione non coperta
            return fixture
        if path.startswith("/player-cards/fixture/"):
            fixture = load_fixture("soccer", "player_cards_day.json")
            wanted = path.rsplit("/", 1)[-1]
            fixture["rows"] = [r for r in fixture["rows"] if str(r["fixture_id"]) == wanted]
            fixture["supported"] = wanted != "9002"
            return fixture
        raise ProviderUnavailable(self.provider_name, f"No fixture for {path} params={params}")

    async def get_official_plays(
        self, *, limit: int = 2000, market: str | None = None
    ) -> list[LedgerRecord]:
        """Official ledger rows (read-only). Upstream has no date filter or offset."""
        params: dict[str, Any] = {"limit": limit}
        if market:
            params["market"] = market
        payload = await self._get("/predictions/official/plays", params=params)
        if isinstance(payload, dict):
            total, rows = payload.get("total"), payload.get("rows")
            if isinstance(total, int) and isinstance(rows, list) and len(rows) < total:
                logger.warning("Soccer official ledger truncated: %s of %s", len(rows), total)
        return ledger.map_ledger_payload(payload)

    async def start_refresh(self, *, force_outside_hours: bool = False) -> dict[str, Any]:
        """"Aggiorna tutto" of the Soccer engine: yesterday's results + upcoming calendar (async job)."""
        payload = await self._get(
            "/jobs/daily-refresh", method="POST", json={"days_ahead": 7, "async_run": True}
        )
        details = payload.get("details") if isinstance(payload, dict) else None
        job_id = (details or {}).get("job_id") if isinstance(details, dict) else None
        return {"ref": str(job_id) if job_id else None, "message": (payload or {}).get("message")}

    async def refresh_status(self, ref: str) -> dict[str, Any]:
        payload = await self._get(f"/jobs/{ref}")
        status = str((payload or {}).get("status") or "unknown").lower()
        state = {"queued": "queued", "running": "running", "success": "success", "failed": "failed"}.get(
            status, "unknown"
        )
        error = (payload or {}).get("error")
        summary = (payload or {}).get("summary") or {}
        detail = (error or {}).get("message") if isinstance(error, dict) else summary.get("phase")
        return {"state": state, "detail": detail, "progress": _progress(summary.get("progress_pct"), state)}

    async def get_scorers(self, day: str) -> list[dict[str, Any]]:
        """Probabilita' "il giocatore segna" delle partite del giorno (calendario Europe/Rome).

        L'engine filtra per data UTC del kickoff: si chiedono anche i giorni adiacenti e si tiene
        solo cio' che cade nel giorno di Roma richiesto (stesso criterio degli eventi)."""
        rows: list[dict[str, Any]] = []
        for utc_day in self._adjacent_dates(day):
            payload = await self._get("/scorers/day", params={"date": utc_day})
            rows.extend(payload.get("rows") or [] if isinstance(payload, dict) else [])
        out, seen = [], set()
        for row in rows:
            key = (row.get("fixture_id"), row.get("player_id"), row.get("revision"))
            if key in seen:
                continue
            seen.add(key)
            try:
                ko = datetime.fromisoformat(str(row.get("kickoff")))
            except ValueError:
                continue
            if ko.tzinfo is None:
                ko = ko.replace(tzinfo=ZoneInfo("UTC"))
            if ko.astimezone(_ROME).date().isoformat() == day:
                out.append(row)
        return out

    async def get_scorers_for_fixture(self, fixture_id: str) -> dict[str, Any]:
        """Probabilita' marcatori (ultima revisione) di una partita: {"rows": [...], "supported": bool}.
        `rows` vuoto con `supported=True` = formazione ufficiale non ancora pubblicata; `supported=False` =
        competizione non coperta dal mercato. Un motore piu' vecchio senza `supported` conta come supportato."""
        payload = await self._get(f"/scorers/fixture/{fixture_id}")
        if not isinstance(payload, dict):
            return {"rows": [], "supported": True}
        return {"rows": list(payload.get("rows") or []), "supported": payload.get("supported", True) is not False}

    async def get_player_cards_for_fixture(self, fixture_id: str) -> dict[str, Any]:
        """Probabilita' "il giocatore prende un giallo" (ultima revisione): stessa forma dei marcatori."""
        payload = await self._get(f"/player-cards/fixture/{fixture_id}")
        if not isinstance(payload, dict):
            return {"rows": [], "supported": True}
        return {"rows": list(payload.get("rows") or []), "supported": payload.get("supported", True) is not False}

    async def healthcheck(self) -> dict[str, Any]:
        try:
            data = await self._get("/health")
            status = "ok"
            if isinstance(data, dict) and str(data.get("status", "ok")).lower() not in {
                "ok",
                "healthy",
                "up",
            }:
                status = "unavailable"
            detail = None
            try:
                db = await self._get("/health/database")
                if isinstance(db, dict):
                    detail = f"database={db.get('status')}"
                    if db.get("status") not in {None, "ok"}:
                        status = "unavailable"
            except Exception:  # noqa: BLE001
                pass
            return {"provider": self.provider_name, "status": status, "detail": detail}
        except Exception as exc:  # noqa: BLE001 — health must never raise
            return {"provider": self.provider_name, "status": "unavailable", "detail": str(exc)}

    async def get_markets(self, **filters: Any) -> list[MarketInfo]:
        payload = await self._get("/markets")
        markets = mapper.map_markets(payload)
        if not markets:
            # fallback from predictions
            preds = await self.get_predictions(**filters)
            seen: set[str] = set()
            for pred in preds:
                if pred.prediction.type not in seen:
                    seen.add(pred.prediction.type)
                    markets.append(
                        MarketInfo(
                            key=pred.prediction.type,
                            name=pred.prediction.type,
                            sport=self.sport,
                            provider=self.provider_name,
                        )
                    )
        return markets

    @staticmethod
    def _adjacent_dates(day: str) -> list[str]:
        """UTC day ±1 around the requested calendar day.

        Soccer `/dashboard/day` filters by UTC `date_match` prefix, while the
        mobile day scroller uses Europe/Rome. Fetching neighbours recovers
        kickoffs that fall on a different UTC date than the Rome calendar day.
        """
        try:
            center = date.fromisoformat(day)
        except ValueError:
            return [day]
        return [
            (center + timedelta(days=offset)).isoformat()
            for offset in (-1, 0, 1)
        ]

    @staticmethod
    def _event_rome_day(event: Event) -> str | None:
        if event.start_time is not None:
            dt = event.start_time
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=ZoneInfo("UTC"))
            return dt.astimezone(_ROME).date().isoformat()
        return event.calendar_date

    def _filter_events_by_day(self, events: list[Event], day: str) -> list[Event]:
        return [e for e in events if self._event_rome_day(e) == day]

    def _filter_predictions_by_day(
        self, predictions: list[UnifiedPrediction], day: str
    ) -> list[UnifiedPrediction]:
        return [p for p in predictions if self._event_rome_day(p.event) == day]

    async def _day_payload(
        self,
        target_date: str | None,
        *,
        with_predictions: bool = True,
        phase: str | None = None,
        limit: int | None = None,
    ) -> Any:
        # Upstream has total/returned but no offset — request the full safety ceiling.
        day_limit = limit if limit is not None else int(self._settings.provider_max_items)
        params: dict[str, Any] = {
            "with_predictions": with_predictions,
            "limit": day_limit,
            "force_refresh": False,
        }
        if target_date:
            params["target_date"] = target_date
        if phase:
            params["phase"] = phase
        payload = await self._get("/dashboard/day", params=params)
        if isinstance(payload, dict):
            try:
                total = int(payload["total"]) if payload.get("total") is not None else None
                returned = int(payload["returned"]) if payload.get("returned") is not None else None
            except (TypeError, ValueError):
                total = returned = None
            if total is not None and returned is not None and returned < total:
                logger.warning(
                    "Soccer /dashboard/day truncated: returned=%s total=%s target_date=%s limit=%s",
                    returned,
                    total,
                    target_date,
                    day_limit,
                )
        return payload

    async def _day_payloads_for_calendar_day(
        self,
        day: str,
        *,
        with_predictions: bool = True,
    ) -> list[Any]:
        payloads: list[Any] = []
        for target in self._adjacent_dates(day):
            try:
                payloads.append(
                    await self._day_payload(
                        target,
                        with_predictions=with_predictions,
                    )
                )
            except Exception as exc:  # noqa: BLE001 — neighbour miss is non-fatal
                logger.info("Soccer day neighbour %s failed: %s", target, exc)
        # Past days: upstream may keep finished rows under phase=finished only
        # on some deployments; if the window is empty, retry centre day once.
        if not any(
            isinstance(p, dict) and (p.get("rows") or p.get("total")) for p in payloads
        ):
            try:
                payloads.append(
                    await self._day_payload(
                        day,
                        with_predictions=with_predictions,
                        phase="finished",
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logger.info("Soccer finished-phase fallback for %s failed: %s", day, exc)
        return payloads

    async def get_events(self, **filters: Any) -> list[Event]:
        day = filters.get("date")
        with_predictions = filters.get("with_predictions")
        wp = True if with_predictions is None else bool(with_predictions)

        if day:
            events: list[Event] = []
            seen: set[str] = set()
            for payload in await self._day_payloads_for_calendar_day(str(day), with_predictions=wp):
                for event in mapper.map_events(payload):
                    if event.id in seen:
                        continue
                    seen.add(event.id)
                    events.append(event)
            events = self._filter_events_by_day(events, str(day))
        else:
            payload = await self._day_payload(None, with_predictions=wp)
            events = mapper.map_events(payload)

        competition_id = filters.get("competition_id")
        if competition_id:
            events = [
                e
                for e in events
                if e.competition
                and (e.competition.id == competition_id or e.competition.name == competition_id)
            ]
        return events

    async def get_competitions(self, **filters: Any) -> list[Competition]:
        # Leagues with at least one prediction on the requested day (not the full
        # fixture bag), so filter chips match what the feed can show.
        pred_filters = {k: v for k, v in filters.items() if k != "competition_id"}
        predictions = await self.get_predictions(**pred_filters)
        events: list[Event] = []
        seen: set[str] = set()
        for pred in predictions:
            if pred.event.id in seen:
                continue
            seen.add(pred.event.id)
            events.append(pred.event)
        return mapper.map_competitions_from_events(events)

    @staticmethod
    def _is_past_rome_day(day: str | None) -> bool:
        """True when `day` is strictly before today's Europe/Rome calendar date."""
        if not day:
            return False
        try:
            return date.fromisoformat(str(day)) < datetime.now(_ROME).date()
        except ValueError:
            return False

    async def get_predictions(self, **filters: Any) -> list[UnifiedPrediction]:
        event_id = filters.get("event_id")
        market = filters.get("market")
        day = filters.get("date")

        # Today / unknown day: prefer match detail (1x2 board + decision_cards).
        # Past calendar days: day feed first — match detail often 404s/times out
        # on finished fixtures and made event/prediction detail feel broken + slow.
        prefer_match = bool(event_id) and not self._is_past_rome_day(
            str(day) if day else None
        )
        if prefer_match:
            detail_preds = await self._predictions_from_match(str(event_id))
            if detail_preds:
                if market:
                    detail_preds = [
                        p for p in detail_preds if p.prediction.type == market
                    ]
                return detail_preds

        if day:
            predictions: list[UnifiedPrediction] = []
            seen: set[str] = set()
            for payload in await self._day_payloads_for_calendar_day(
                str(day), with_predictions=True
            ):
                for pred in mapper.map_day_payload(payload):
                    if pred.id in seen:
                        continue
                    seen.add(pred.id)
                    predictions.append(pred)
            # Always filter locally — fixtures mode ignores target_date, and
            # live upstream may return neighbour UTC days from the window.
            predictions = self._filter_predictions_by_day(predictions, str(day))
        else:
            payload = await self._day_payload(None, with_predictions=True)
            predictions = mapper.map_day_payload(payload)

        competition_id = filters.get("competition_id")
        min_confidence = filters.get("min_confidence")

        if competition_id:
            predictions = [
                p
                for p in predictions
                if p.event.competition
                and (
                    p.event.competition.id == competition_id
                    or p.event.competition.name == competition_id
                )
            ]
        if event_id:
            eid = str(event_id)
            predictions = [p for p in predictions if p.event.id == eid]
        if market:
            predictions = [p for p in predictions if p.prediction.type == market]
        if min_confidence is not None:
            predictions = [
                p
                for p in predictions
                if p.prediction.confidence is not None
                and p.prediction.confidence >= float(min_confidence)
            ]

        predictions.sort(
            key=lambda p: (
                -(p.prediction.confidence or 0.0),
                p.event.start_time.isoformat() if p.event.start_time else "",
            )
        )
        # Day-scoped feed: always return every match for that calendar day.
        # Optional `limit` only applies when no date filter is set.
        # Never apply a global limit when filtering a single event.
        if not day and not event_id:
            limit = filters.get("limit")
            if limit is not None:
                predictions = limit_predictions_keeping_events(predictions, int(limit))

        # Past-day event detail: if the day feed had nothing, one last match try
        # (richer boards) — skipped when we already preferred match above.
        if (
            event_id
            and not predictions
            and self._is_past_rome_day(str(day) if day else None)
        ):
            detail_preds = await self._predictions_from_match(str(event_id))
            if market:
                detail_preds = [
                    p for p in detail_preds if p.prediction.type == market
                ]
            return detail_preds

        return predictions

    async def _predictions_from_match(self, fixture_id: str) -> list[UnifiedPrediction]:
        detail: Any = None
        try:
            detail = await self._get(f"/dashboard/match/{fixture_id}/oracle-detail")
        except Exception:
            try:
                detail = await self._get(f"/dashboard/match/{fixture_id}")
            except Exception:
                return []
        if not isinstance(detail, dict):
            return []
        return mapper.map_day_payload({"rows": [detail]})

    async def get_prediction(
        self, prediction_id: str, **filters: Any
    ) -> UnifiedPrediction | None:
        parsed = mapper.parse_prediction_id(prediction_id)
        if not parsed:
            return None
        fixture_id, market = parsed

        lookup = {
            "event_id": fixture_id,
            "market": market,
        }
        if filters.get("date"):
            lookup["date"] = filters["date"]

        # Single path — get_predictions already chooses day vs match wisely.
        for candidate in await self.get_predictions(**lookup):
            if candidate.id == prediction_id or candidate.prediction.type == market:
                return candidate
        return None
