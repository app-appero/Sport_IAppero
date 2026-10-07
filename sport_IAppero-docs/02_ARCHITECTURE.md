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
└──────────┬───────────┘             └──────────┬───────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐             ┌──────────────────────┐
│ Soccer Oracle API    │             │ Tennis Oracle API    │
└──────────────────────┘             └──────────────────────┘
```

## Perché utilizzare un BFF

L'app mobile NON deve chiamare direttamente Soccer Oracle o Tennis Oracle.

Il BFF gestisce:

- normalizzazione;
- aggregazione;
- caching;
- error handling;
- timeout;
- autenticazione futura;
- rate limiting;
- logging;
- provider health;
- fallback;
- feed cross-sport.

## Principi

### 1. Provider isolation

Ogni sport vive dentro un adapter.

Il resto dell'app non deve conoscere il formato upstream.

### 2. Unified Domain Model

Tutti i provider vengono convertiti verso modelli comuni:

- Sport
- Competition
- Event
- Participant
- Prediction
- Probability
- ProviderMetadata

### 3. Provider failure isolation

Se Tennis Oracle è offline, il feed Soccer deve continuare a funzionare.

Una failure upstream non deve far fallire l'intera Home.

### 4. Async I/O

Le API provider devono essere interrogate in parallelo tramite `httpx.AsyncClient`.

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

## Backend folder structure proposta

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── feed.py
│   │       ├── sports.py
│   │       ├── events.py
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
│   │   ├── feed_service.py
│   │   ├── event_service.py
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
│   │   ├── index.tsx
│   │   ├── football.tsx
│   │   ├── tennis.tsx
│   │   └── saved.tsx
│   └── prediction/
│       └── [id].tsx
│
├── components/
│   ├── PredictionCard.tsx
│   ├── SportFilter.tsx
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
