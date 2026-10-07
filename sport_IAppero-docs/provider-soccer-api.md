# Soccer Oracle — API Discovery (Phase 0)

**Base URL (dev):** `https://soccer-oracle-api-dev.up.railway.app`  
**OpenAPI title (when online):** `Soccer ML Platform API` v0.1.0  
**Auth observed:** no global security schemes in OpenAPI (public GETs for consumer paths).  
**Status at last full probe:** online with `/openapi.json` (~99KB, 66 paths).  
**Status 2026-10-07 evening:** Railway returns `Application not found` (404). Discovery below is from the successful earlier probe; **re-run OpenAPI capture when the service is back**.

## Health

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | Service index: `{service, version, docs, status}` |
| GET | `/health` | Liveness |
| GET | `/health/database` | DB dependency check |

## Primary consumer endpoints (MVP candidates)

| Method | Path | Intended use in Oracle Sports |
|--------|------|-------------------------------|
| GET | `/markets` | List all markets → `GET /api/v1/sports/football/markets` |
| GET | `/dashboard/available-dates` | Date picker / filters |
| GET | `/dashboard/day` | Events + predictions for a day |
| GET | `/dashboard/bundle` | Bundled dashboard payload |
| GET | `/dashboard/overview` | Overview |
| GET | `/dashboard/live` | Live slice |
| GET | `/dashboard/match/{fixture_id}` | Event detail |
| GET | `/dashboard/match/{fixture_id}/consensus` | Consensus view |
| GET | `/dashboard/match/{fixture_id}/oracle-detail` | Rich prediction detail → detail resolve |
| GET | `/live/fixtures` | Live fixtures |
| GET | `/live/fixtures/{fixture_id}/events` | Live events |
| GET | `/live/fixtures/{fixture_id}/statistics` | Live stats |
| GET | `/metrics/summary` | Model metrics (later) |
| GET | `/metrics/{market}` | Per-market metrics (later) |

## Betslip / ops (not MVP for mobile BFF)

`/betslip/*`, `/betting/statistics`, `/jobs/*`, `/data/quality`, recompute/retrain endpoints — admin/ops. Do not expose to mobile via Oracle Sports MVP.

## Mapping to Oracle Sports

| Oracle Sports | Upstream |
|---------------|----------|
| sport id `football` | Soccer Oracle |
| provider `soccer-oracle` | this service |
| competitions | derived from day/match payloads (league/competition fields) |
| events | `/dashboard/day`, `/dashboard/match/{id}` |
| predictions + markets | `/dashboard/day`, `/oracle-detail`, `/markets` |
| health | `/health` |

## Open questions (blocked until API is back)

1. Exact query params for `/dashboard/day` (`date` format?).
2. Exact JSON shape of match + prediction + per-market probabilities.
3. Stable upstream ids for fixtures, teams, competitions, markets.
4. Whether all markets appear inline on day payload or only via `/markets` + detail.
5. Capture ≥3 real fixtures under `backend/tests/fixtures/soccer/`.

## Re-discovery checklist

```bash
curl -sS "$SOCCER_ORACLE_BASE_URL/openapi.json" -o sport_IAppero-docs/samples/soccer-openapi.json
curl -sS "$SOCCER_ORACLE_BASE_URL/markets" | jq .
curl -sS "$SOCCER_ORACLE_BASE_URL/dashboard/available-dates" | jq .
curl -sS "$SOCCER_ORACLE_BASE_URL/dashboard/day?date=YYYY-MM-DD" | jq .
```
