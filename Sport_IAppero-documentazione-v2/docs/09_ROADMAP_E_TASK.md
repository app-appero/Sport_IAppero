# Roadmap e task

## Sprint 0 — chiudere discovery

| ID | Attività | Criterio di accettazione |
|---|---|---|
| D01 | Confrontare snapshot OpenAPI con deployment corrente | Elenco cambiamenti, nessun endpoint inventato |
| D02 | Confermare branch/commit effettivamente deployati | **Chiuso**: `git_sha` su `/ready` (`RAILWAY_GIT_COMMIT_SHA` / `GIT_SHA`, altrimenti `unknown`) |
| D03 | Configurare TENNIS_SERVICE_TOKEN tramite ambiente autorizzato | GET feed Tennis 200 senza secret nel log |
| D04 | Acquisire fixture Tennis autorizzate e Soccer day popolato | JSON per match winner, extra markets, null/errori; fonti/timestamp |
| D05 | Verificare timezone eventi e filtri date provider | **Chiuso**: Rome day bounds + Tennis naive → `start_time=null`; vedi `00_RIFERIMENTI` |
| D06 | Confermare label selection, linee, status e modelli attivi | **Chiuso**: tabella mapping in `00_RIFERIMENTI`; sconosciuti → label sorgente |

D03 può impedire integrazione live Tennis ma non scaffold, mapper da schemi e test mock. D05 impedisce dichiarare orari UTC attendibili, non impedisce mostrare null e metadata. La modalità mock deve essere esplicita e non apparire come prediction reale.

## Sprint 1 — BFF

| ID | Attività | Criterio di accettazione |
|---|---|---|
| B01 | Scaffold FastAPI/config/logging | health, env example, nessun import motori ML |
| B02 | Schemi normalizzati e provider Pydantic | Validazione range/null; modello/decision/probability separati |
| B03 | Soccer client e mapper day | Usa false refresh; niente N+1 di dettaglio; card/line/outcome corretti |
| B04 | Tennis client e mapper | Header server, offset, First/Second Player, extra markets separati |
| B05 | Aggregazione/cache/single-flight | Provider indipendenti, 200 parziale, 503 entrambi guasti — **implementato in-process** |
| B06 | Feed/capability/detail/cursor | `GET /api/v1/feed` + event da snapshot + cursor — **implementato**; collaudo live Railway ancora aperto |
| B07 | Test integrazione controllati | Fixture + test feed/cursor; OpenAPI via `/docs` |

Milestone: `GET /api/v1/feed` serve entrambe le fonti normalizzate quando configurate, e una risposta trasparente se una manca. Non considerare completata integrazione Tennis con sole fixture mock. BFF deployato su `https://bff-sport-iappero-dev.up.railway.app`.

## Sprint 2 — Mobile

Expo/TypeScript, API client, home e viste sport, dettaglio, filtri, cache/refresh, empty/degraded/error, preferiti locali. Accettazione: build/typecheck e flussi utente su Android/iOS; nessuna chiave provider nel bundle.

## Sprint 3+ — fiducia e prodotto

Persistenza revisioni e ledger read-only, settlement osservato, storico per mercato/modello con denominatori. Successivamente account/follow/push. Abbonamenti solo dopo validazione uso e analisi del canale di vendita. Live/schedine/Oracle Score non inclusi negli sprint iniziali.

### Stato Sprint 3 (Soccer)

| ID | Attività | Stato |
|---|---|---|
| P01 | PostgreSQL + Alembic, migrazione all'avvio | **Implementato**; senza `DATABASE_URL` il BFF funziona come prima |
| P02 | Tabelle `events`, `prediction_revisions`, `prediction_settlements`, `provider_fetch_runs` | **Implementato**; `feed_snapshots` rinviata (non serve ancora) |
| P03 | Registrazione append-only delle predizioni viste nel feed | **Implementato** (`feed_observed`, mai ufficiali) |
| P04 | Ledger ufficiale Soccer in sola lettura + settlement | **Implementato** (sync ogni 15 min, mappa enum in `providers/soccer/ledger.py`) |
| P05 | `GET /api/v1/history/stats` e `/history/predictions` con denominatori | **Implementato**; conta solo pubblicazioni con `captured_at` < kickoff |
| P06 | Ledger Tennis published | Da fare: serve token D03 e verifica `require_admin` lato Tennis |
| P07 | Schermata storico mobile | Da fare |

## Test significativi

- Soccer binary prediction=0: probabilità selezione 1-p, non p; preferenza decision_cards.
- Soccer 1X2 e doppia chance: esiti diversi, nessun calcolo binario improprio.
- Tennis First/Second Player: corretta probability e quota; label sconosciuta non “corretta” silenziosamente.
- 2.5 e 3.5, sport diversi o modelli diversi: niente collisione ID.
- Dati mancanti/NaN/out of range: warning ed esclusione record, non 0.5.
- Provider 401/timeout/429: nessun leak; feed parziale/cache stale/503 corretto.
- Pagine Tennis >200: niente duplicati; tetto budget segnala incompletezza.
- Feed vuoto 200 distinto da provider guasto.
- Cursor stabile e query diversa invalidata; snapshot scaduto 410.
- Timezone/date, DST e orari null; finished/live esclusi dal pre-match.
- Ricalcolo post-evento e draft non promossi a ufficiali/storico pre-match.

Definition of done: spiegare dati verificati, limiti residui, task bloccati e come eseguire. Nessun “tutto pronto” se le credenziali o timezone non sono collaudate.
