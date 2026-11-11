# Architecture Audit — Sport IApperò / Soccer Oracle / Tennis Oracle

Data: 11 novembre 2026 (Europe/Rome). Stato: **VERIFICATO** sul codice locale ai branch `cursor/platform-audit-evolution-e436`.

## Architettura reale

```text
Expo app (Sport_IAppero/mobile)
        │  HTTP
        ▼
BFF FastAPI (Sport_IAppero/backend)  — aggregazione e presentazione
   ├── SoccerProvider  →  Soccer Oracle (Railway)  — predizioni calcio
   └── TennisProvider  →  Tennis Oracle (Railway)  — predizioni tennis
```

Non esiste un ensemble trasversale calcio↔tennis. Le probabilità restano responsabilità dei due motori.

| Componente | Repo | Ruolo | Stack |
|---|---|---|---|
| Soccer Oracle | `ia_predict_soccer` | ingestione API-Sports (+ FotMob best-effort), training multi-mercato, snapshot predizioni, decision policy | FastAPI, APScheduler, PostgreSQL, sklearn, bucket modelli |
| Tennis Oracle | `tennis_oracle` | ingestione API-Tennis, training match winner/extra markets, publish predizioni | FastAPI, job CLI/scheduler, PostgreSQL, sklearn/xgboost |
| Sport IApperò | `Sport_IAppero` | BFF + app Android Expo | FastAPI BFF, Expo/RN |

## Pipeline (verificata)

### Soccer
fonte API-Sports → `ApiSportsProvider` → `download_import_matches` → tabelle `match`/`statistics`/`odds` → feature (`FilterMarketService`) → training (`train_multi_market`) → registry/bucket → `PredictionSnapshotService` → dashboard/API → BFF mapper → app.

### Tennis
fonte API-Tennis → `request_api` → import fixtures/next/standings → feature pre-match → artifact `.pkl` → `predict_fixture` → `MatchPrediction`/`PublishedPrediction` → API `/next-fixtures/predictions` → BFF mapper → app.

### Aggregazione
mobile → `/api/v1/feed` → `feed_service` (cache in-memory 60s, stale 300s) → client async httpx verso i due motori → `UnifiedPrediction`.

## Problemi ad alto impatto (ordinati)

| # | Problema | Gravità | Stato |
|---|---|---|---|
| 1 | Tennis: feature ATP di enrichment azzerate in inferenza (train/serve skew) | alta | **VERIFICATO** + misurato; **PROPOSTA** candidato senza quelle colonne |
| 2 | Tennis: client API senza retry/circuit breaker | alta | **IMPLEMENTATO** |
| 3 | Soccer: pausa quota non collegata allo scheduler | alta | **IMPLEMENTATO** |
| 4 | Soccer: settlement importa da API-Sports pur dichiarato “solo DB” | alta | **IMPLEMENTATO** (skip import a quota esaurita) |
| 5 | BFF: feed stantio senza flag | alta | **IMPLEMENTATO** |
| 6 | BFF soccer: model/generated_at assenti | alta | **IMPLEMENTATO** (campi additivi) |
| 7 | Soccer: xG mancante → 0; mercati saltati in silenzio | media/alta | **IMPLEMENTATO** trasparenza; **PROPOSTA** retrain imputazione |
| 8 | Dump PostgreSQL versionati (~425 MB) in soccer | media | **PROPOSTA** (non cancellati) |
| 9 | Nessun accesso a metriche/billing Railway | — | **blocco** dichiarato |

## Cosa non è stato fatto
Deploy, rotazione secret, attivazione modelli ritrainati, integrazione nuovi provider a pagamento, rimozione dump dalla history git.
