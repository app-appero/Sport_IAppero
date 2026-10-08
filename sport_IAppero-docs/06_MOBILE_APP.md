# Mobile App Specification

## Technology

- React Native
- Expo
- TypeScript
- Expo Router

## Target

Solo mobile:

- iOS
- Android

Non ottimizzare per desktop/web nella fase iniziale.

## Navigation

Bottom navigation iniziale:

```text
Football
Tennis
Saved
```

`Saved` può essere placeholder finché non viene implementata autenticazione/persistenza.

Non c'è una Home cross-sport nell'MVP: ogni sport ha il proprio tab e chiama le API del proprio sport.

## Screens

## 1. Football

Flusso:

```text
Lista campionati / competizioni
        ↓
Lista partite
        ↓
Dettaglio evento / prediction (mercati)
```

Il tab Football chiama solo endpoint `sport=football` (backed by `soccer-oracle`).

Filtri possibili:

- Today
- Tomorrow
- Calendar
- Competition

MVP: Today + lista competizioni/partite.

## 2. Tennis

Flusso:

```text
Lista tornei
        ↓
Lista partite
        ↓
Dettaglio evento / prediction (mercati)
```

Il tab Tennis chiama solo endpoint `sport=tennis` (backed by `tennis-oracle`).

Filtri possibili:

- ATP
- WTA
- Today
- Tournament

MVP: lista giornaliera / tornei disponibili.

## 3. Prediction / event detail

Mostrare:

- sport;
- competition / tournament;
- data;
- partecipanti;
- prediction;
- confidence;
- distribuzione probabilità;
- market type;
- provider;
- eventuale Oracle Score (null nell'MVP).

## Componenti condivisi

```text
PredictionCard
SportBadge
CompetitionBadge
ConfidenceBar
ProbabilityRow
MarketList
EventParticipants
EmptyState
ProviderWarning
```

## Data fetching

Il frontend deve chiamare esclusivamente Oracle Sports API.

Mai:

```text
mobile → soccer oracle
mobile → tennis oracle
```

Sempre:

```text
mobile → oracle sports backend
```

Esempi MVP:

```text
GET /api/v1/sports/football/competitions
GET /api/v1/sports/football/events
GET /api/v1/sports/football/predictions
GET /api/v1/sports/tennis/competitions
GET /api/v1/sports/tennis/events
GET /api/v1/events/{id}/predictions
GET /api/v1/predictions/{id}
```

## State

Per MVP valutare:

- TanStack Query

Usarla per:

- fetch;
- cache;
- refetch;
- loading;
- errors.

Evitare Redux salvo necessità reale.

## Design principles

- dark mode friendly;
- UI sportiva premium;
- card dense ma leggibili;
- confidence immediatamente visibile;
- colori per sport ma non dipendere solo dal colore;
- tap target mobile >= 44px;
- mercati multipli leggibili (non solo match winner).
