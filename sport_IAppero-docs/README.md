# Oracle Sports

## Overview

Oracle Sports è un'applicazione **mobile-first / mobile-only** che aggrega predizioni sportive provenienti da più motori ML già esistenti.

La prima versione integra:

- Soccer Oracle
- Tennis Oracle

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

## Principio architetturale fondamentale

Soccer Oracle e Tennis Oracle devono rimanere servizi indipendenti.

Oracle Sports:

1. chiama le API esistenti;
2. converte le risposte in un formato comune;
3. aggrega le prediction;
4. espone API pensate specificamente per l'app mobile;
5. gestisce in futuro utenti, preferiti, notifiche, ranking, performance e abbonamenti.

## MVP iniziale

La prima versione deve includere:

- Home cross-sport;
- sezione Football;
- sezione Tennis;
- dettaglio prediction;
- feed ordinato per confidence;
- adapter Soccer;
- adapter Tennis;
- schema comune `UnifiedPrediction`.

Non implementare nella prima fase:

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
- PostgreSQL
- SQLAlchemy o SQLModel

### Infrastructure

- Railway
- PostgreSQL Railway
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

## Regola per gli AI coding assistant

Prima di modificare il codice:

- analizzare la struttura repository;
- non inventare endpoint delle API upstream;
- verificare sempre i contratti reali di Soccer Oracle e Tennis Oracle;
- mantenere i provider isolati tramite adapter;
- evitare dipendenze del frontend dalla struttura JSON originale dei provider;
- preferire implementazioni semplici e modulari.
