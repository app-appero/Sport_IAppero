# Phase 1 — Implementation Tasks

## EPIC 1 — Repository bootstrap

### TASK 1.1

Struttura repo `Sport_IAppero`:

```text
Sport_IAppero/
├── backend/
├── mobile/
├── sport_IAppero-docs/
└── README.md
```

`backend/` e `mobile/` restano cartelle separate.

### TASK 1.2

Configurare backend FastAPI in `backend/`.

### TASK 1.3

Creare `.env.example`.

```env
SOCCER_ORACLE_BASE_URL=https://soccer-oracle-api-dev.up.railway.app
TENNIS_ORACLE_BASE_URL=https://tennisoracle-backend-dev.up.railway.app

PROVIDER_CONNECT_TIMEOUT=3
PROVIDER_READ_TIMEOUT=8
```

Aggiungere eventuali `*_API_KEY` / token solo dopo discovery auth (Phase 0).

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

- endpoint competizioni / eventi / predizioni / mercati;
- query params;
- schemas;
- auth se presente;
- sample response.

Output: `sport_IAppero-docs/provider-soccer-api.md`

## TASK 2.2 — Tennis Oracle

Analizzare:

```text
https://tennisoracle-backend-dev.up.railway.app
```

Stesso processo → `sport_IAppero-docs/provider-tennis-api.md`

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

Naming:

- `sport`: `football` | `tennis`
- `provider.name`: `soccer-oracle` | `tennis-oracle`

## TASK 3.2

Supportare tutti i market type scoperti upstream (`prediction.type` non limitato a `match_winner`).

## TASK 3.3

Scrivere test validazione.

---

# EPIC 4 — Provider layer

## TASK 4.1

Creare `SportProvider`.

## TASK 4.2

Implementare `SoccerOracleClient` (adattarsi ai path/auth esistenti).

## TASK 4.3

Implementare `SoccerMapper` → `sport="football"`, `provider.name="soccer-oracle"`.

## TASK 4.4

Implementare `TennisOracleClient`.

## TASK 4.5

Implementare `TennisMapper` → `sport="tennis"`, `provider.name="tennis-oracle"`.

## TASK 4.6

Unit test mapper tramite fixture reali.

---

# EPIC 5 — Sport-scoped services

## TASK 5.1

`CompetitionService` / `EventService` / `PredictionService` per sport.

## TASK 5.2

Nessun aggregatore cross-sport per ranking confidence.

## TASK 5.3

Sort solo dentro lo stesso sport (es. confidence DESC, start_time ASC).

## TASK 5.4

Prediction detail: resolve id composito → chiamata upstream → remap (senza DB).

---

# EPIC 6 — Public API

Creare:

```text
GET /api/v1/health
GET /api/v1/health/providers
GET /api/v1/sports
GET /api/v1/sports/{sport}/competitions
GET /api/v1/sports/{sport}/events
GET /api/v1/sports/{sport}/markets
GET /api/v1/sports/{sport}/predictions
GET /api/v1/events/{event_id}/predictions
GET /api/v1/events/{event_id}/markets
GET /api/v1/predictions/{id}
```

Fuori Phase 1:

```text
GET /api/v1/feed
GET /api/v1/predictions/top
```

---

# EPIC 7 — Quality

Implementare:

- Ruff;
- pytest;
- type checking;
- structured logs;
- `.env.example`;
- README run instructions in `backend/`.

## Definition of Done Phase 1

Le chiamate:

```text
GET /api/v1/sports/football/predictions
GET /api/v1/sports/tennis/predictions
```

devono restituire prediction usando esclusivamente il contratto `UnifiedPrediction`, includendo i mercati esposti dagli upstream, senza mescolare ranking cross-sport.
