# Roadmap

## Phase 0 — API Discovery

Obiettivo:

capire esattamente cosa espongono Soccer Oracle e Tennis Oracle.

Task:

- verificare `/docs`;
- verificare `/openapi.json`;
- censire endpoint;
- salvare sample response;
- identificare endpoint prediction;
- identificare eventi;
- identificare ID;
- identificare timestamp;
- identificare confidence/probabilities.

Output:

```text
docs/provider-soccer-api.md
docs/provider-tennis-api.md
```

## Phase 1 — Backend Foundation

Deliverable:

Oracle Sports API funzionante.

Implementare:

- FastAPI bootstrap;
- config;
- health;
- provider interface;
- SoccerProvider;
- TennisProvider;
- mapper;
- UnifiedPrediction;
- FeedService;
- `/sports`;
- `/feed`;
- `/predictions/top`;
- test unitari mapper.

Definition of Done:

```text
GET /api/v1/feed
```

deve poter restituire prediction Soccer + Tennis nello stesso formato.

## Phase 2 — Mobile MVP

Implementare:

- Expo;
- navigation;
- Home;
- Football;
- Tennis;
- Prediction Detail;
- API client;
- TanStack Query;
- loading/error state.

Definition of Done:

un utente apre l'app e può navigare fra prediction dei due sport.

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

## Phase 5 — Oracle Score

Definire formula e calcolo.

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
new provider
new mapper
optional UI specialization
```

senza modificare il core.
