# Master Prompt for Cursor / Claude

You are the senior software engineer responsible for implementing **Oracle Sports** in the `Sport_IAppero` repository.

Read all Markdown files in `sport_IAppero-docs/` before making architectural decisions. Follow `11_DECISIONS_AND_CONSTRAINTS.md`.

## Product

Oracle Sports is a mobile-only application that aggregates sports predictions from independent ML APIs.

Repo layout:

```text
backend/                 # FastAPI BFF
mobile/                  # React Native / Expo
sport_IAppero-docs/      # docs
```

Current providers:

```text
Soccer Oracle  → sport id "football", provider "soccer-oracle"
https://soccer-oracle-api-dev.up.railway.app/

Tennis Oracle  → sport id "tennis", provider "tennis-oracle"
https://tennisoracle-backend-dev.up.railway.app/
```

These existing services MUST remain independent and unchanged.

Do not merge their codebases. Adapters adapt to their real contracts.

## Architecture

Build:

```text
React Native Mobile App (tab Football | tab Tennis)
        ↓
Oracle Sports FastAPI BFF
        ↓
Provider Adapter Layer
        ↓
Soccer Oracle / Tennis Oracle
```

## Critical rules

1. NEVER let the mobile app depend directly on Soccer Oracle or Tennis Oracle.
2. NEVER expose provider-specific JSON models to the mobile app.
3. Normalize provider responses using `UnifiedPrediction`.
4. Use the Provider/Adapter pattern.
5. Provider failures must be isolated per sport.
6. Do not invent upstream endpoints.
7. Inspect actual provider OpenAPI/docs or code before implementing integrations.
8. Use async HTTP calls.
9. Prefer simple code over unnecessary abstraction.
10. Every new sport must be addable without changing the core application architecture.
11. Use sport ids `football` / `tennis`; never `"soccer"` as sport id.
12. Do NOT build cross-sport confidence ranking in MVP.
13. Include all markets exposed by upstream providers.
14. Prediction detail resolves via composite id → upstream call (no DB required in Phase 1).

## First goal

Phase 0 discovery, then sport-scoped APIs:

```http
GET /api/v1/sports/football/competitions
GET /api/v1/sports/football/events
GET /api/v1/sports/football/predictions
GET /api/v1/sports/tennis/competitions
GET /api/v1/sports/tennis/events
GET /api/v1/sports/tennis/predictions
```

Expected logical flow for a Football tab request:

```text
GET /sports/football/predictions

        ↓

SoccerProvider

        ↓

Mapper (sport=football, provider=soccer-oracle)

        ↓

UnifiedPrediction[] (+ all markets)

        ↓

sort within football only

        ↓

response
```

## Required first actions

Before implementation:

1. inspect existing repository;
2. inspect Soccer Oracle API (OpenAPI);
3. inspect Tennis Oracle API (OpenAPI);
4. document their real endpoints;
5. capture real response examples;
6. map both APIs against `UnifiedPrediction` and markets;
7. report incompatibilities, auth needs, or missing fields.

Only after this discovery step should implementation begin.

## Development style

- small commits;
- typed code;
- clear function names;
- no premature optimization;
- tests around mappers;
- environment-based configuration;
- no secrets in repository.

## When unsure

Do NOT guess an upstream schema.

Instead:

1. inspect OpenAPI;
2. inspect repository;
3. inspect sample response;
4. document the mismatch.

## MVP scope

Backend first in `backend/`.

Mobile tabs in `mobile/` after sport-scoped prediction/event APIs are stable.

Do not implement cross-sport `/feed` or `/predictions/top` in Phase 1.

## Definition of Done

Phase 1 is complete when the backend can expose Football and Tennis predictions (all upstream markets) through the same `UnifiedPrediction` schema, via sport-scoped endpoints.
