# Roadmap

## Phase 0 — API Discovery

Obiettivo:

capire esattamente cosa espongono Soccer Oracle e Tennis Oracle (OpenAPI/docs reali).

Task:

- verificare `/docs` e `/openapi.json` di ciascun provider;
- censire endpoint per competizioni/tornei, eventi, predizioni, mercati;
- salvare sample response;
- identificare ID upstream;
- identificare timestamp;
- identificare confidence/probabilities;
- identificare auth richiesta per endpoint utili;
- mappare tutti i mercati esposti.

Output:

```text
sport_IAppero-docs/provider-soccer-api.md
sport_IAppero-docs/provider-tennis-api.md
```

## Phase 1 — Backend Foundation

Deliverable:

Oracle Sports API funzionante, sport-scoped.

Implementare:

- FastAPI bootstrap in `backend/`;
- config;
- `GET /api/v1/health`;
- `GET /api/v1/health/providers` (adattandosi ai health upstream);
- provider interface;
- SoccerProvider (`sport=football`);
- TennisProvider (`sport=tennis`);
- mapper → `UnifiedPrediction` + mercati;
- `GET /api/v1/sports`;
- `GET /api/v1/sports/{sport}/competitions`;
- `GET /api/v1/sports/{sport}/events`;
- `GET /api/v1/sports/{sport}/predictions`;
- `GET /api/v1/events/{event_id}/predictions`;
- `GET /api/v1/predictions/{id}` (resolve via upstream ids);
- test unitari mapper.

Definition of Done:

```text
GET /api/v1/sports/football/predictions
GET /api/v1/sports/tennis/predictions
```

restituiscono prediction nello stesso schema `UnifiedPrediction`, con i mercati esposti dagli upstream.

Non richiesti in Phase 1:

- cross-sport `/feed`
- `/predictions/top`

## Phase 2 — Mobile MVP

Implementare in `mobile/`:

- Expo;
- tab Football;
- tab Tennis;
- Saved placeholder;
- competition / tournament lists;
- event lists;
- prediction/event detail con mercati;
- API client;
- TanStack Query;
- loading/error state.

Definition of Done:

un utente apre l'app e naviga campionati/tornei → partite → predizioni/mercati per Football e Tennis.

## Phase 3 — Data Persistence

Implementare:

- PostgreSQL;
- prediction history;
- result tracking;
- metriche accuracy.

## Phase 4 — Personalization

Implementare:

- auth;
- favorites;
- follow;
- push notifications.

## Phase 5 — Oracle Score / optional Home

Definire formula Oracle Score.

Eventuale Home cross-sport solo dopo calibrazione/score (non prima).

## Phase 6 — Subscription

Possibili piani:

### Free

- prediction base;
- eventi principali;
- confidence.

### Pro

- tutte le prediction;
- top picks;
- filtri avanzati;
- notifiche;
- storico;
- analytics.

## Phase 7 — New Sports

Ogni nuovo sport deve richiedere principalmente:

```text
new provider adapter
new mapper
new mobile tab
optional UI specialization
```

senza modificare il core.
