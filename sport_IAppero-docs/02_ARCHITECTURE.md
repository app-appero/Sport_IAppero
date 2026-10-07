# Architecture

## High-level architecture

```text
                   ┌──────────────────────┐
                   │   Oracle Sports App  │
                   │ React Native / Expo  │
                   └──────────┬───────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │ Oracle Sports API    │
                   │ FastAPI / BFF        │
                   └──────────┬───────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌──────────────────────┐             ┌──────────────────────┐
│ SoccerProvider       │             │ TennisProvider       │
│ Adapter + Mapper     │             │ Adapter + Mapper     │
│ sport: football      │             │ sport: tennis        │
└──────────┬───────────┘             └──────────┬───────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐             ┌──────────────────────┐
│ Soccer Oracle API    │             │ Tennis Oracle API    │
│ (unchanged)          │             │ (unchanged)          │
└──────────────────────┘             └──────────────────────┘
```

## Perché utilizzare un BFF

L'app mobile NON deve chiamare direttamente Soccer Oracle o Tennis Oracle.

Il BFF gestisce:

- normalizzazione;
- API sport-scoped per tab Football / Tennis;
- caching opzionale;
- error handling;
- timeout;
- autenticazione futura (Oracle Sports) e auth upstream se richiesta;
- rate limiting;
- logging;
- provider health (adattandosi ai path esistenti);
- fallback per-sport.

## Principi

### 1. Provider isolation

Ogni sport vive dentro un adapter.

Il resto dell'app non deve conoscere il formato upstream.

I provider restano come sono: timeout, path, auth e schema upstream si gestiscono nell'adapter.

### 2. Unified Domain Model

Tutti i provider vengono convertiti verso modelli comuni:

- Sport
- Competition
- Event
- Participant
- Prediction
- Probability
- Market
- ProviderMetadata

### 3. Provider failure isolation

Se Tennis Oracle è offline, il tab Football deve continuare a funzionare.

Una failure upstream non deve far fallire l'intero backend: fallisce solo lo sport interessato.

### 4. Async I/O

Le API provider devono essere interrogate tramite `httpx.AsyncClient`.

Le chiamate multi-provider in parallelo servono solo dove ha senso (es. health aggregato), non per mescolare ranking cross-sport nell'MVP.

### 5. Timeout

Ogni provider deve avere timeout espliciti.

Esempio:

```text
connect: 3 sec
read: 8 sec
```

Configurabili tramite environment variables.

### 6. No tight coupling

Mai usare nel frontend proprietà specifiche come:

```text
soccer_probability_home
tennis_player_1_probability
```

Usare invece:

```text
prediction.probabilities[]
```

### 7. Naming

- `sport`: `football` | `tennis`
- `provider.name`: `soccer-oracle` | `tennis-oracle`

## Backend folder structure proposta

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── health.py
│   │       ├── sports.py
│   │       ├── competitions.py
│   │       ├── events.py
│   │       ├── markets.py
│   │       └── predictions.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── logging.py
│   │   └── exceptions.py
│   │
│   ├── domain/
│   │   ├── event.py
│   │   ├── prediction.py
│   │   ├── market.py
│   │   └── sport.py
│   │
│   ├── providers/
│   │   ├── base.py
│   │   ├── soccer/
│   │   │   ├── client.py
│   │   │   ├── mapper.py
│   │   │   └── schemas.py
│   │   └── tennis/
│   │       ├── client.py
│   │       ├── mapper.py
│   │       └── schemas.py
│   │
│   ├── services/
│   │   ├── competition_service.py
│   │   ├── event_service.py
│   │   ├── market_service.py
│   │   └── prediction_service.py
│   │
│   ├── repositories/
│   ├── db/
│   └── main.py
│
├── tests/
├── pyproject.toml
├── Dockerfile
└── .env.example
```

## Mobile structure proposta

```text
mobile/
├── app/
│   ├── (tabs)/
│   │   ├── football.tsx
│   │   ├── tennis.tsx
│   │   └── saved.tsx
│   ├── competition/
│   │   └── [id].tsx
│   ├── event/
│   │   └── [id].tsx
│   └── prediction/
│       └── [id].tsx
│
├── components/
│   ├── PredictionCard.tsx
│   ├── CompetitionList.tsx
│   ├── MarketList.tsx
│   ├── ConfidenceBar.tsx
│   └── EventHeader.tsx
│
├── services/
│   └── api.ts
│
├── hooks/
├── types/
└── constants/
```
