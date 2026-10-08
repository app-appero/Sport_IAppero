# Architectural Decisions & Constraints

## ADR-001 — Existing ML APIs remain independent

Status: Accepted.

Reason:

- avoid regression;
- preserve existing products;
- independent deployment;
- independent ML lifecycle.

## ADR-002 — Introduce BFF

Status: Accepted.

Oracle Sports Backend acts as a Backend for Frontend.

## ADR-003 — Unified Prediction model

Status: Accepted.

The mobile frontend is provider-agnostic.

## ADR-004 — React Native + Expo

Status: Proposed / preferred.

Reason:

- mobile-only;
- single iOS/Android codebase;
- fast MVP.

## ADR-005 — FastAPI

Status: Proposed / preferred.

Reason:

- Python ecosystem;
- good fit with existing ML services;
- async;
- Pydantic contracts.

## ADR-006 — Canonical naming: sport vs provider

Status: Accepted.

| Concept | Canonical value | Notes |
|---------|-----------------|-------|
| Sport id (API / domain) | `football`, `tennis` | Always lowercase slug |
| UI label | Football, Tennis | Localized later if needed |
| Provider id | `soccer-oracle`, `tennis-oracle` | Matches existing upstream services |
| Env vars | `SOCCER_ORACLE_*`, `TENNIS_ORACLE_*` | Keep provider brand |
| Adapter folder | `providers/soccer/`, `providers/tennis/` | Provider-centric |

Rules:

- Never use `"soccer"` as `sport` id.
- Never rename upstream services; adapters adapt to them.
- JSON example: `"sport": "football"` + `"provider": { "name": "soccer-oracle" }`.

## ADR-007 — Per-sport navigation (no cross-sport ranking in MVP)

Status: Accepted.

MVP UX is tab-per-sport:

- Football tab → competitions/leagues → matches → predictions & markets
- Tennis tab → tournaments → matches → predictions & markets

Do **not** build a Home that ranks Football and Tennis predictions together by confidence.

Confidence is comparable only within the same sport/provider context in MVP.

A future Home / Oracle Score may revisit cross-sport ranking.

## ADR-008 — Oracle Sports health paths

Status: Accepted.

Oracle Sports public health:

```text
GET /api/v1/health
GET /api/v1/health/providers
```

Upstream providers keep their own contracts unchanged.

The BFF adapts: each adapter maps whatever health/liveness the provider exposes (or a cheap probe) into Oracle Sports `meta.providers` status. Do not require providers to change paths.

## ADR-009 — Sport-scoped API surface for MVP

Status: Accepted.

Primary MVP endpoints are sport-scoped (competitions/tournaments, events, predictions, markets).

Deprioritized / out of MVP unless needed later:

- cross-sport `GET /feed`
- `GET /predictions/top` as a separate ranking API

If a lightweight sport-scoped list is needed, use e.g. `GET /sports/{sport}/events` with filters instead.

## ADR-010 — Prediction detail without DB (MVP)

Status: Accepted.

MVP has no central prediction DB.

`GET /api/v1/predictions/{prediction_id}` resolves by:

1. parsing a stable composite id that embeds provider + upstream ids + market;
2. calling the upstream provider with the original identifiers;
3. remapping to `UnifiedPrediction`.

No requirement to cache/persist for detail in Phase 1 (optional in-memory cache allowed).

## ADR-011 — Upstream auth

Status: Accepted.

Adapters must discover auth requirements during Phase 0.

- Prefer public endpoints when available.
- If a provider requires login/API key for some routes, configure via env (`*_API_KEY`, tokens, etc.) and keep secrets out of git.
- Do not assume both providers share the same auth model.

## ADR-012 — All exposed markets

Status: Accepted.

MVP includes **all markets** exposed by Soccer Oracle and Tennis Oracle (not only `match_winner`).

`prediction.type` / market keys must be driven by upstream discovery, not a hardcoded shortlist.

## Constraints

- Repository name: `Sport_IAppero`.
- Layout: separate `backend/` and `mobile/` directories in the same repo (not a fused app).
- Existing APIs live on Railway and remain independent.
- Do not introduce new ML training in MVP.
- Do not duplicate provider databases.
- MVP supports Football + Tennis.
- Architecture must support more sports later (new tab + new adapter).
- Docs live under `sport_IAppero-docs/` (product name in docs: Oracle Sports).
