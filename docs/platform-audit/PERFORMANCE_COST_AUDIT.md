# Performance & Cost Audit (Railway)

**Blocco:** da questo ambiente **non** risultano accessibili metriche CPU/RAM né la fatturazione Railway. Nessun risparmio monetario dichiarato.

Analisi basata solo sul codice (VERIFICATO).

## Topologia processi

| Servizio | Processo | Note costo |
|---|---|---|
| Soccer API | uvicorn | cache in-process 60s |
| Soccer scheduler | APScheduler heartbeat 30s | training giornaliero nello stesso processo scheduler |
| Tennis API | uvicorn | può avviare thread scheduler in-process |
| Tennis jobs | compose profile `jobs`/`scheduler` | global update + report |
| Sport IApperò BFF | uvicorn | cache feed in-memory; niente Redis |

## Stime richieste esterne (assunzioni esplicite)

### Soccer API-Sports
- `data_sync_today` ogni 30 min × N leghe (default ~18) → ordine **decine** di chiamate/ora se ogni lega fa 1 request fixtures (+ odds/stats per fixture aggiornata).
- `data_settlement` ogni 60 min: prima faceva sempre import FT su finestra 4 giorni; ora a quota esaurita **0** chiamate import.
- `data_daily_refresh` + `data_future_sync` entrambi sync calendario → **doppio consumo** documentato (PROPOSTA: disabilitare uno dei due di default).
- Live sync 90s: disabilitato di default (bene).

### Tennis API-Tennis
- Upcoming import: ~2 chunk date + **1 get_odds per singles match** → densità calendario dipendente; rischio rate-limit (mitigato da retry/CB, non da batching — PROPOSTA batching se API lo consente).
- Closing odds job: disabilitato di default.

## Quick win costo (senza migrate invasive)

| Azione | Impatto atteso | Stato |
|---|---|---|
| Pausa quota nello scheduler soccer | evita import inutili a quota 100% | **IMPLEMENTATO** |
| Settlement senza import a quota esaurita | riduce chiamate orarie | **IMPLEMENTATO** |
| Circuit breaker tennis/soccer | riduce hammering su outage | **IMPLEMENTATO** |
| Invalidazione cache BFF post-refresh | meno dati stantii (qualità, non costo) | **IMPLEMENTATO** |
| Disabilitare uno fra daily_refresh/future_sync | −1 sync calendario/giorno | **PROPOSTA** |
| Separare training soccer dal container scheduler | isolamento CPU | **PROPOSTA** |
| Spostare dump 425MB fuori dal repo | clone/build più leggeri | **PROPOSTA** |
