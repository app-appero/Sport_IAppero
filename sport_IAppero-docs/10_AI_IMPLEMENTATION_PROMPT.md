# Master Prompt for Cursor / Claude

You are the senior software engineer responsible for implementing **Oracle Sports**.

Read all Markdown files in `/docs` before making architectural decisions.

## Product

Oracle Sports is a mobile-only application that aggregates sports predictions from independent ML APIs.

Current providers:

```text
Soccer Oracle
https://soccer-oracle-api-dev.up.railway.app/

Tennis Oracle
https://tennisoracle-backend-dev.up.railway.app/
```

These existing services MUST remain independent.

Do not merge their codebases.

## Architecture

Build:

```text
React Native Mobile App
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
5. Provider failures must be isolated.
6. Do not invent upstream endpoints.
7. Inspect actual provider OpenAPI/docs or code before implementing integrations.
8. Use async HTTP calls.
9. Prefer simple code over unnecessary abstraction.
10. Every new sport must be addable without changing the core application architecture.

## First goal

The first important milestone is:

```http
GET /api/v1/feed
```

which combines predictions from both providers.

Expected logical flow:

```text
GET /feed

        ↓

async gather

        ↓

SoccerProvider
TennisProvider

        ↓

Mapper
Mapper

        ↓

UnifiedPrediction[]

        ↓

sort by confidence

        ↓

response
```

## Required first actions

Before implementation:

1. inspect existing repository;
2. inspect Soccer Oracle API;
3. inspect Tennis Oracle API;
4. document their real endpoints;
5. capture real response examples;
6. map both APIs against `UnifiedPrediction`;
7. report incompatibilities or missing fields.

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

Backend first.

Do not begin advanced mobile UI before `/feed` is functional and stable.

## Definition of Done

Phase 1 is complete when the backend can expose:

```text
Football prediction
Football prediction
Tennis prediction
Tennis prediction
```

through the same response schema.
