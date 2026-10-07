# Tennis Oracle — API Discovery (Phase 0)

**Base URL (dev):** `https://tennisoracle-backend-dev.up.railway.app`  
**OpenAPI title (when online):** `Tennis Oracle API` v0.1.0  
**Auth:** OpenAPI includes `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` — some routes may require session/token. Consumer GETs under `/api/next-fixtures*` were reachable without auth in the initial probe; **confirm per-route when online**.  
**Status at last full probe:** online with `/openapi.json` (~232KB, 88 paths).  
**Status 2026-10-07 evening:** Railway returns `Application not found` (404). Re-run discovery when back.

## Health

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness (OpenAPI: no dependency checks) |

Root `/` returned 404 when online — prefer `/health` and `/docs`.

## Primary consumer endpoints (MVP candidates)

| Method | Path | Intended use in Oracle Sports |
|--------|------|-------------------------------|
| GET | `/api/next-fixtures` | Upcoming fixtures / tournaments → events & competitions |
| GET | `/api/next-fixtures/predictions` | Predictions for next fixtures → tab Tennis |
| GET | `/api/live-beta-dashboard` | Live/beta dashboard (optional) |
| GET | `/api/public-model-registry` | Model metadata (later) |
| GET | `/api/public-model-registry/active` | Active models (later) |
| GET | `/api/probability-bands` | Calibration bands (later) |
| GET | `/api/calibration` / `latest` | Calibration (later) |
| GET | `/api/predictions/stats/daily` | Stats (later) |
| GET | `/api/predictions/stats/summary` | Stats (later) |

## Auth / payments / ops (not MVP mobile surface)

- `/api/auth/*`
- `/api/payments/*`
- `/api/betting-slips/*`
- `/api/imports/*`
- `/api/global-update/*`
- `/api/prematch-odds-snapshots*`
- `/api/ops/*`

Adapters may need credentials later if prediction routes become protected — configure via env, never commit secrets.

## Mapping to Oracle Sports

| Oracle Sports | Upstream |
|---------------|----------|
| sport id `tennis` | Tennis Oracle |
| provider `tennis-oracle` | this service |
| competitions (tournaments) | fields on next-fixtures |
| events | `/api/next-fixtures` |
| predictions + markets | `/api/next-fixtures/predictions` |
| health | `/health` |

## Open questions (blocked until API is back)

1. Auth requirement for `/api/next-fixtures/predictions`.
2. Exact JSON for fixtures, players, tournaments, markets.
3. Market catalog (match winner only vs sets/totals/etc.).
4. Stable ids (`event_key` vs numeric).
5. Capture ≥3 real fixtures under `backend/tests/fixtures/tennis/`.

## Re-discovery checklist

```bash
curl -sS "$TENNIS_ORACLE_BASE_URL/openapi.json" -o sport_IAppero-docs/samples/tennis-openapi.json
curl -sS "$TENNIS_ORACLE_BASE_URL/health" | jq .
curl -sS "$TENNIS_ORACLE_BASE_URL/api/next-fixtures" | jq .
curl -sS "$TENNIS_ORACLE_BASE_URL/api/next-fixtures/predictions" | jq .
```
