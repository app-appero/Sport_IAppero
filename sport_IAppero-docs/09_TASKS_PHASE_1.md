# Phase 1 — Implementation Tasks

## EPIC 1 — Repository bootstrap

### TASK 1.1

Creare repository.

Suggested structure:

```text
oracle-sports/
├── backend/
├── mobile/
├── docs/
└── README.md
```

### TASK 1.2

Configurare backend FastAPI.

### TASK 1.3

Creare `.env.example`.

```env
SOCCER_ORACLE_BASE_URL=https://soccer-oracle-api-dev.up.railway.app
TENNIS_ORACLE_BASE_URL=https://tennisoracle-backend-dev.up.railway.app

PROVIDER_CONNECT_TIMEOUT=3
PROVIDER_READ_TIMEOUT=8
```

---

# EPIC 2 — API discovery

## TASK 2.1 — Soccer Oracle

Analizzare:

```text
https://soccer-oracle-api-dev.up.railway.app
```

Provare:

```text
/docs
/openapi.json
/redoc
```

Documentare:

- endpoint;
- query params;
- schemas;
- prediction response;
- event response.

## TASK 2.2 — Tennis Oracle

Analizzare:

```text
https://tennisoracle-backend-dev.up.railway.app
```

Stesso processo.

## TASK 2.3

Salvare almeno 3 sample payload reali per provider nei test fixtures.

---

# EPIC 3 — Domain model

## TASK 3.1

Creare Pydantic models:

```text
Competition
Participant
Event
Selection
PredictionValue
Probability
ProviderMetadata
UnifiedPrediction
```

## TASK 3.2

Scrivere test validazione.

---

# EPIC 4 — Provider layer

## TASK 4.1

Creare `SportProvider`.

## TASK 4.2

Implementare `SoccerOracleClient`.

## TASK 4.3

Implementare `SoccerMapper`.

## TASK 4.4

Implementare `TennisOracleClient`.

## TASK 4.5

Implementare `TennisMapper`.

## TASK 4.6

Unit test mapper tramite fixture reali.

---

# EPIC 5 — Aggregation

## TASK 5.1

Creare `FeedService`.

## TASK 5.2

Interrogare provider in parallelo.

## TASK 5.3

Gestire partial failures.

## TASK 5.4

Sort:

```text
confidence DESC
start_time ASC
```

---

# EPIC 6 — Public API

Creare:

```text
GET /api/v1/health
GET /api/v1/health/providers
GET /api/v1/sports
GET /api/v1/feed
GET /api/v1/predictions/top
GET /api/v1/predictions/{id}
```

---

# EPIC 7 — Quality

Implementare:

- Ruff;
- pytest;
- type checking;
- structured logs;
- `.env.example`;
- README run instructions.

## Definition of Done Phase 1

La chiamata:

```text
GET /api/v1/feed
```

deve restituire un array misto di prediction Soccer e Tennis utilizzando esclusivamente il contratto `UnifiedPrediction`.
