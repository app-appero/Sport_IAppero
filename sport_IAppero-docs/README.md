# Oracle Sports (Sport_IAppero)

## Overview

Oracle Sports è un'applicazione **mobile-first / mobile-only** che aggrega predizioni sportive provenienti da più motori ML già esistenti.

Repository: `Sport_IAppero`

Layout:

```text
Sport_IAppero/
├── backend/                 # Oracle Sports BFF (FastAPI)
├── mobile/                  # App React Native / Expo
└── sport_IAppero-docs/      # Documentazione
```

La prima versione integra:

- Soccer Oracle → sport id `football`
- Tennis Oracle → sport id `tennis`

API attualmente disponibili:

- Soccer Oracle: `https://soccer-oracle-api-dev.up.railway.app/`
- Tennis Oracle: `https://tennisoracle-backend-dev.up.railway.app/`

L'obiettivo non è fondere i backend esistenti, ma costruire un nuovo livello applicativo sopra di essi.

```text
Mobile App
    ↓
Oracle Sports API / BFF
    ↓
 ┌───────────────┬───────────────┐
 ↓               ↓
Soccer Adapter   Tennis Adapter
 ↓               ↓
Soccer Oracle    Tennis Oracle
```

## Naming canonico

| Concept | Valore |
|---------|--------|
| Sport id | `football`, `tennis` |
| UI | Football, Tennis |
| Provider id | `soccer-oracle`, `tennis-oracle` |
| Env | `SOCCER_ORACLE_*`, `TENNIS_ORACLE_*` |

Non usare mai `"soccer"` come `sport` id. I provider upstream non si rinominano: gli adapter si adattano.

## Principio architetturale fondamentale

Soccer Oracle e Tennis Oracle devono rimanere servizi indipendenti.

Oracle Sports:

1. chiama le API esistenti;
2. converte le risposte in un formato comune;
3. espone API sport-scoped pensate per l'app mobile;
4. gestisce in futuro utenti, preferiti, notifiche, ranking, performance e abbonamenti.

## MVP iniziale

Navigazione per sport (tab dedicati), non ranking cross-sport:

- tab Football → campionati/competizioni → partite → predizioni e mercati;
- tab Tennis → tornei → partite → predizioni e mercati;
- dettaglio prediction / evento;
- adapter Soccer + adapter Tennis;
- schema comune `UnifiedPrediction`;
- **tutti i mercati** esposti dagli upstream.

Non implementare nella prima fase:

- Home che mescola e ordina Football + Tennis per confidence;
- pagamenti;
- social;
- sistemi complessi di recommendation;
- nuovi modelli ML;
- duplicazione completa dei database Soccer/Tennis.

## Stack consigliato

### Mobile

- React Native
- Expo
- TypeScript

### Backend

- Python
- FastAPI
- Pydantic
- httpx
- PostgreSQL (fase successiva; non obbligatorio per Phase 1 proxy)
- SQLAlchemy o SQLModel

### Infrastructure

- Railway
- PostgreSQL Railway (quando serve persistenza)
- variabili ambiente per gli URL dei provider

## Documentazione

Leggere in questo ordine:

1. `01_PRODUCT_BRIEF.md`
2. `02_ARCHITECTURE.md`
3. `03_UNIFIED_DATA_MODEL.md`
4. `04_API_SPEC.md`
5. `05_PROVIDER_ADAPTERS.md`
6. `06_MOBILE_APP.md`
7. `07_DATABASE.md`
8. `08_ROADMAP.md`
9. `09_TASKS_PHASE_1.md`
10. `10_AI_IMPLEMENTATION_PROMPT.md`
11. `11_DECISIONS_AND_CONSTRAINTS.md`

## Regola per gli AI coding assistant

Prima di modificare il codice:

- analizzare la struttura repository;
- non inventare endpoint delle API upstream;
- verificare sempre i contratti reali di Soccer Oracle e Tennis Oracle;
- mantenere i provider isolati tramite adapter;
- evitare dipendenze del frontend dalla struttura JSON originale dei provider;
- preferire implementazioni semplici e modulari;
- rispettare le ADR in `11_DECISIONS_AND_CONSTRAINTS.md`.
