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
Home
Football
Tennis
Saved
```

`Saved` può essere placeholder finché non viene implementata autenticazione/persistenza.

## Screens

## 1. Home

Componenti:

- app header;
- sport selector;
- Top Predictions;
- lista prediction;
- loading state;
- error/partial provider state.

Card base:

```text
┌────────────────────────────┐
│ ⚽ Serie A                  │
│ Inter vs Juventus          │
│                            │
│ Prediction                 │
│ INTER                      │
│                            │
│ Confidence 81%             │
└────────────────────────────┘
```

## 2. Football

Filtri possibili:

- Today
- Tomorrow
- Calendar
- Competition

MVP: Today + lista.

## 3. Tennis

Filtri possibili:

- ATP
- WTA
- Today
- Tournament

MVP: lista giornaliera.

## 4. Prediction detail

Mostrare:

- sport;
- competition;
- data;
- partecipanti;
- prediction;
- confidence;
- distribuzione probabilità;
- provider;
- eventuale Oracle Score.

## Componenti condivisi

```text
PredictionCard
SportBadge
CompetitionBadge
ConfidenceBar
ProbabilityRow
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
- tap target mobile >= 44px.
