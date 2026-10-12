# Roadmap e task

## Sprint 0 — chiudere discovery

| ID | Attività | Criterio di accettazione |
|---|---|---|
| D01 | Confrontare snapshot OpenAPI con deployment corrente | Elenco cambiamenti, nessun endpoint inventato |
| D02 | Confermare branch/commit effettivamente deployati | **Chiuso**: `git_sha` su `/ready` (`RAILWAY_GIT_COMMIT_SHA` / `GIT_SHA`, altrimenti `unknown`) |
| D03 | Autenticazione Tennis lato server | **Chiuso**: il BFF fa login con `TENNIS_ORACLE_USERNAME`/`PASSWORD` (utente admin) e usa il bearer ottenuto; `TENNIS_SERVICE_TOKEN` non esiste nella configurazione del BFF. Feed e ledger Tennis rispondono sul deploy, senza secret nel log |
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
| B06 | Feed/capability/detail/cursor | `GET /api/v1/feed` + event da snapshot + cursor — **implementato e collaudato dal vivo** (feed del giorno `ok` e completo per Calcio e Tennis, cursor presente, `/docs` raggiungibile, `/health/providers` ok per entrambi) |
| B07 | Test integrazione controllati | Fixture + test feed/cursor; OpenAPI via `/docs` |

Milestone: `GET /api/v1/feed` serve entrambe le fonti normalizzate quando configurate, e una risposta trasparente se una manca. Non considerare completata integrazione Tennis con sole fixture mock. BFF deployato su `https://bff-sport-iappero-dev.up.railway.app`.

## Sprint 2 — Mobile

Expo/TypeScript, API client, home e viste sport, dettaglio, filtri, cache/refresh, empty/degraded/error. Accettazione: build/typecheck e flussi utente su Android/iOS; nessuna chiave provider nel bundle.

### Stato Sprint 2

| ID | Attività | Stato |
|---|---|---|
| M01 | Expo/TypeScript/Router, client API solo verso il BFF (`EXPO_PUBLIC_API_URL`), nessuna chiave provider nel bundle | **Fatto**; `tsc` pulito, build web ok |
| M02 | Home e viste sport (Calcio, Tennis), giorno, filtri competizione e mercato, dettaglio evento e predizione | **Fatto**, in una sola schermata con barra sport (nessuna tab bar, scelta di prodotto) |
| M03 | Stati vuoto, errore, parziale (`EmptyState`, `FeedBanner`, `ProviderWarning`) | **Fatto** |
| M04 | Skeleton iniziale (`EventCardSkeleton`, ferma con "riduci animazioni") | **Fatto** |
| M05 | Dati precedenti durante il cambio giorno (`placeholderData`, lista attenuata + barra) | **Fatto**; mai riusata la lista di un altro sport |
| M06 | Cache persistita (AsyncStorage, 24 h), banner offline con ora dell'ultima snapshot, polling 60 s solo in primo piano e solo per il giorno corrente | **Fatto** (`services/queryClient.ts`, `utils/staleness.ts`, test con `npm test`) |
| M07 | Preferiti locali | **Rimossi** per scelta di prodotto; non previsti ora |
| M08 | Test su dispositivo | Android: prova manuale eseguita prima delle ultime modifiche. iOS e controllo a 360/390/430 px con font ingranditi: **non verificati** |

Le modifiche fuori scope già presenti (tema scuro, branding, scala dei testi, pannello "Statistica giornata", esiti V/X sul board) non cambiano il contratto con il BFF.

## Sprint 3+ — fiducia e prodotto

Persistenza revisioni e ledger read-only, settlement osservato, storico per mercato/modello con denominatori. Successivamente account/follow/push. Abbonamenti solo dopo validazione uso e analisi del canale di vendita. Live/schedine/Oracle Score non inclusi negli sprint iniziali.

### Stato Sprint 3

| ID | Attività | Stato |
|---|---|---|
| P01 | PostgreSQL + Alembic, migrazione all'avvio | **Implementato**; senza `DATABASE_URL` il BFF funziona come prima |
| P02 | Tabelle `events`, `prediction_revisions`, `prediction_settlements`, `provider_fetch_runs` | **Implementato**; `feed_snapshots` rinviata (non serve ancora) |
| P03 | Registrazione append-only delle predizioni viste nel feed | **Implementato** (`feed_observed`, mai ufficiali) |
| P04 | Ledger ufficiale Soccer in sola lettura + settlement | **Implementato e collaudato dal vivo** (sync ogni 15 min, mappa enum in `providers/soccer/ledger.py`: win/loss/void_*/not_placed) |
| P05 | `GET /api/v1/history/stats` e `/history/predictions` con denominatori | **Implementato e collaudato dal vivo**; win rate = won/(won+lost), void/pending/non piazzate a parte, solo pubblicazioni con `captured_at` < kickoff, nessuna media di percentuali |
| P06 | Ledger Tennis published | **Implementato e collaudato dal vivo** (`/api/published-predictions` + esiti da `/api/live-beta-dashboard`, che sono decisi da Tennis Oracle); usa il login admin già configurato, nessuna modifica a Tennis Oracle. Ultime versioni delle correzioni sostituiscono le precedenti |
| P07 | Schermata Storico mobile (`/storico`, pulsante in header, link nel pannello giornata) | **Implementato**; prova su dispositivo da fare con il nuovo APK |
| P08 | Storico limitato alle giocate consigliate (`decision=PLAY` di default, `decision=all` per il resto) | **Implementato**: nel registro Soccer NO BET e BORDERLINE gonfiavano la percentuale (62,4% contro 59,7%) |
| P09 | Nomi delle partite di calcio nello storico | **Implementato**: recuperati dal provider giorno per giorno, mai inventati |

Dati osservati sul deploy dopo il rilascio: Calcio 153 giocate PLAY (89 prese su 149 decise, 59,7%), Tennis 1.744 giocate (926 prese su 1.656 decise, 55,9%), 0 righe escluse per orario. Lo storico parte dalla data di prima registrazione del provider (Tennis dal 22 luglio, Calcio dal 12 settembre): non promette osservazioni anteriori.

Differenza tra le due statistiche: "Statistica giornata" è calcolata nell'app su tutte le predizioni del giorno scelto; lo Storico conta solo giocate consigliate, ufficiali e pubblicate prima dell'inizio. Non vanno confrontate.

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
