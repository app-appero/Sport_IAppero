# Soccer Oracle — provider, quota e serving

**Sintesi per il titolare.** Il motore calcio dipende quasi solo da API-Sports. L'audit ha reso le
chiamate più robuste, ha collegato davvero la pausa automatica a quota esaurita allo scheduler
(correggendo tre difetti) e ha reso visibile perché un mercato non ha previsione. Le probabilità
servite non sono cambiate. Il punto urgente è fuori dal codice: nella storia git ci sono
credenziali reali, da ruotare.

Repository `ia_predict_soccer`, branch `cursor/platform-audit-evolution-e436` (HEAD `bf8f3c4`,
`main` = `18eebfe`). Fonte di dettaglio: `docs/platform-audit/IMPLEMENTATION_LOG.md` e
`TEST_REPORT.md` del repository (17/11/2026).

## 1. Credenziali nella storia git — VERIFICATO, PROPOSTA urgente

| Cosa | Evidenza (solo nomi, mai valori) | Stato |
|---|---|---|
| `properties/config.env` in 11 commit (dal 17/07/2025, rimosso in `560d4c9`) | `git log --all --format=%h -- properties/config.env \| wc -l` → 11 | **VERIFICATO** |
| valori non vuoti per `API_SPORTS_KEY`, `API_ODDS_KEY_BASE`, `API_ODDS_KEY`, `TELEGRAM_TOKEN`, `STRIPE_SECRET_KEY`, `DATABASE_URL` | `git show f59f14f:properties/config.env` filtrato con `awk` (stampati solo nome e lunghezza) | **VERIFICATO** |
| `properties/client_secret.json` e un JSON di account di servizio sul ramo `origin/feature/config_drive` (`cddb54b`) | `git ls-tree -r --name-only origin/feature/config_drive` | **VERIFICATO** |
| host e porta del DB Railway in `docs/soccer_oracle_v2_detailed/IMPLEMENTATION_LOG.md:432` (password oscurata) | lettura della riga, non riportata | **VERIFICATO** |
| `backend/properties/config.env.example` su `main` contiene già `CHANGE_ME` | `git show origin/main:backend/properties/config.env.example \| grep -c CHANGE_ME` → 1 | **VERIFICATO** (l'indizio "password dall'aspetto reale nell'esempio" non è confermato; il problema reale è la storia) |
| Ruotare tutte le credenziali elencate e togliere host e porta dal documento | — | **PROPOSTA urgente** |
| Riscrivere la storia e cancellare `feature/config_drive` | richiede force push e nuovi clone per tutti | **PROPOSTA** (decisione separata, dopo la rotazione) |

## 2. Provider esterni — VERIFICATO

| Provider | Uso | Variabile della chiave | Dove |
|---|---|---|---|
| API-Sports | primario a runtime: partite, statistiche, quote, formazioni, giocatori | `API_SPORTS_KEY` (`src/service_ia/config/secret_store.py:23`), inviata solo nell'header `x-apisports-key` (`api_sports_provider.py:173`, `:450`) | `src/service_ia/pre_processing/api_sports_provider.py` |
| The Odds API | solo offline: `base_api_odds` è chiamata solo da `df_odds_service.py`, usato solo da script in `backend/scripts/` (nessun job, nessuna rotta) | `API_ODDS_KEY` (`secret_store.py:24`) | `src/service_ia/utility/request_api.py:73` |
| FotMob via RapidAPI | formazioni probabili, job `fotmob_predicted_lineups` attivo di default (`src/jobs/job_settings.py:298-307`) | `RAPIDAPI_KEY` (`src/service_ia/fotmob/client.py:46`) | `src/service_ia/fotmob/` |

Percorsi relativi a `ia_predict_soccer/backend/`.

## 3. Resilienza delle chiamate — IMPLEMENTATO

Commit `226d03c`, `b514fd2`, `572b535`. Valori di default **VERIFICATO** in
`api_sports_provider.py:15`, `:32-44` e `src/service_ia/utility/resilience.py:23-41`:

- timeout 20 s, 3 tentativi, backoff esponenziale base 1,5 s con tetto 30 s ("equal jitter");
- `Retry-After` limitato a 120 s;
- circuit breaker di processo: aperto dopo 5 fallimenti consecutivi, per 60 s;
- quota giornaliera esaurita: una sola chiamata, nessun retry (`ApiSportsQuotaExceededError`);
- errori 4xx non ritentati e non contati dal breaker.

The Odds API: timeout 30 s; chiave tolta dai messaggi d'errore (`39d7cf2`) e mascherata con `***`
nei log DEBUG di urllib3 (`4196864`, filtro su `urllib3.connectionpool`, `request_api.py:35-41`,
anche nella copia storica `backend/service_ia/utility/request_api.py`); timeout letto da ambiente
senza far fallire l'import (`ce7d797`). **IMPLEMENTATO**.

## 4. Pausa a quota esaurita — IMPLEMENTATO (con tre difetti corretti)

- `226d03c`: `_run_if_due` chiama `_sync_quota_pause_if_needed` (`src/jobs/scheduler.py:1524`)
  prima di decidere se un job è attivo, solo per i job con `calls_api_sports`
  (`QUOTA_SENSITIVE_JOB_IDS`, `job_settings.py:333`: 6 job su 16), al massimo una volta ogni 60 s
  per processo (`scheduler.py:1515`; heartbeat 30 s, `:1440`). Lo stato quota è letto dal bucket
  (`best_models/api_quota_state.json`, `src/jobs/api_quota_state.py:13`): nessuna chiamata a
  pagamento.
- `d395c34`: la baseline dei toggle viene conservata; i toggle manuali fatti durante la pausa non
  vengono annullati al ripristino.
- `fc0444d` (difetti trovati il 17/11/2026 e corretti): una lettura fallita del bucket azzerava i
  toggle dell'operatore o toglieva la pausa; la baseline veniva salvata dopo aver spento i job; due
  job nello stesso tick potevano partire con lo stato pre-pausa (ora `_quota_sync_lock`,
  `scheduler.py:1521`); job non più esistenti bloccavano il ripristino.

## 5. Settlement e aggiornamento puntuale — IMPLEMENTATO

- `226d03c`: a quota esaurita il settlement salta l'import (`api_sports_quota_exhausted_today`,
  `download_match_service.py:433`) e riconcilia comunque dal DB.
- `3b9d7e5`: campo additivo `partially_calls_api_sports` in `GET/POST /settings/jobs` (`job_settings.py:94`, `:435`).
- `3643636`: campo additivo `provider_status` (`ok` / `quota_exhausted` / `unavailable`) e
  `provider_import_skipped` (`settlement_service.py:201`) nel report del settlement e
  dell'aggiornamento puntuale `POST /dashboard/matches/{id}/refresh`.

## 6. Trasparenza del serving — IMPLEMENTATO (probabilità invariate)

| Campo additivo | Commit | Riferimento |
|---|---|---|
| `markets_missing_reasons` (`no_model_registered`, `model_retired`, `model_file_missing`, `match_not_in_db`, `no_odds_row`, `no_odds_for_market`, `not_computed`, in ordine di precedenza) | `d28d486`, `903d3f9` | `src/api/dashboard_service.py:255` |
| `data_quality` {`odds_available`, `team_statistics_available`, `xg_available`} | `226d03c`, `1b08cf4` | `dashboard_service.py:316-362` |
| `predictions[m].computed_at` | `226d03c` | snapshot delle predizioni |
| `features_defaulted`, `features_defaulted_count` | `d28d486`, `56d8770` | anche su snapshot riusati |

Presenti in `/dashboard/day`, `/dashboard/live`, `/dashboard/bundle`, `/dashboard/overview`,
`/dashboard/match/{id}` e `POST /dashboard/matches/{id}/recompute-predictions` (fonte:
IMPLEMENTATION_LOG Soccer, sezione 4).

**VERIFICATO** (messaggio del commit `1b08cf4`): `xg_available` era vero anche quando l'xG non era
mai stato rilevato, perché la media azzera l'xG assente; nell'export `h2h_raw.csv` la media xG è
zero per almeno una squadra in 7.163 righe su 15.749 (45,5%).

## 7. Indizi sul motore — VERIFICATO

- **Nessun Elo né Dixon-Coles nel serving**: grep su `backend/src` = 0 righe; esiste solo un Poisson
  indipendente per la spiegabilità (`src/ml/experts/goal_distribution/goal_distribution_expert.py:62`).
- **h2h, doppia chance e 1X2 non riconciliati**: h2h e dc sono modelli binari separati
  (`filter_market_service.py:119-124`); il 1X2 multiclasse c'è solo nel dettaglio partita
  (`dashboard_service.py:1652-1687`) e le card dc derivate finiscono nello stesso gruppo delle card
  del modello binario (`:899-934`, `:1133`). La cattura ufficiale invece è coerente
  (`official_capture_service.py:241`, `:312-316`).
- **Mercati senza modello scartati in silenzio su `main`** (`prediction_snapshot_service.py:235-236`,
  `:245-246`, `:249-250`, `:276-277`): ora dichiarati (punto 6).

## 8. Dati versionati — VERIFICATO

`backend/src/backup_db`: 14 file tracciati (12 dump + 2 query `.sql`), 434.438.069 byte
(`du -sb backend/src/backup_db`, `git ls-files backend/src/backup_db | wc -l`). Non toccati.
**PROPOSTA**: spostarli fuori dal repository (contengono dati di produzione; la rimozione dalla
storia va decisa insieme al punto 1).

## Rischi residui (VERIFICATO, non risolti)

- Il lock della pausa quota è per processo: fra i container `api` e `scheduler` resta una finestra
  di pochi istanti senza esclusione reciproca.
- `POST /settings/jobs` con bucket illeggibile ora risponde errore invece di salvare i default.
- Una risposta 4xx di API-Sports senza campo `errors` dà `[]`, indistinguibile da "nessun dato"
  (preesistente); il breaker è per istanza (`src/data/live/live_data_service.py:186`); resta uno
  `sleep(60)` sul limite al minuto (`api_sports_provider.py:388`, preesistente).
- `features_defaulted` non è salvato sullo snapshot: manca quando lo snapshot è servito senza
  ricostruire il frame.
- 17 test falliscono già su `main` (elenco in [TEST_REPORT.md](./TEST_REPORT.md)).
