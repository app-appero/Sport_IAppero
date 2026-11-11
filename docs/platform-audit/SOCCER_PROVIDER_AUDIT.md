# Soccer Oracle — Provider & Motore

## Provider esterni (VERIFICATO)

| Provider | Uso runtime | Auth (nome var) | Robustezza pre-fix | Post-fix |
|---|---|---|---|---|
| API-Sports / API-Football | primario (fixtures, stats, odds, lineups, players, predictions, status) | `API_SPORTS_KEY` / secret_store `api_sports_key` | timeout 20s, 3 retry lineari, gestione quota | + backoff esponenziale con jitter + circuit breaker (`resilience.py`) |
| The Odds API | solo ETL storico/offline | `API_ODDS_KEY` | **senza timeout** | timeout + fix parse; non in scheduler |
| FotMob via RapidAPI | lineups previste (job giornaliero) | `RAPIDAPI_KEY` | timeout + backoff | invariato; best-effort / rischio ToS wrapper |

Top 5 europei in `APP_LEAGUES`: Serie A 135, Premier 39, LaLiga 140, Bundesliga 78, Ligue 1 61.

## Problemi e interventi

| Problema | Stato |
|---|---|
| `sync_job_settings_with_quota` non chiamata dallo scheduler | **IMPLEMENTATO** in `_run_if_due` (throttle 60s) |
| Settlement chiama import API ma `calls_api_sports=False` | **IMPLEMENTATO**: a quota esaurita salta solo l’import |
| Mercati senza predizione saltati senza motivo | **IMPLEMENTATO**: `markets_missing_reasons` + `data_quality` (xg_available, odds, stats) |
| Feature assenti riempite con 0 | log di misurazione; **PROPOSTA** retrain con missingness |
| Dump DB versionati | **PROPOSTA**: rimuovere dalla history (non fatto) |
| Password dall’aspetto reale in `config.env.example` | **IMPLEMENTATO**: sostituita con segnaposto |

## ML (sintesi)

- Mercati serviti: h2h (binario home-vs-resto), dc binario, 1x2 multiclasse (detail), U/O, BTTS, corners/cards, scorers.
- Artifact in bucket S3-compatibile; nessuna `.pkl` di produzione nel checkout.
- Baseline offline 1X2 top-5: vedi `ML_VALIDATION_REPORT.md`. **Il mercato no-vig resta il migliore**; Elo/Dixon-Coles/Poisson non lo battono. Nessun cambio modello in produzione.
