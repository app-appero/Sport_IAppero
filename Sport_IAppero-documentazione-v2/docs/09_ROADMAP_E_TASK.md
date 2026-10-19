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
| P07 | Schermata Storico mobile (`/storico`, pulsante in header, link nel pannello giornata; si apre sullo sport corrente, barra sport per Calcio/Tennis) | **Implementato**; prova su dispositivo da fare con il nuovo APK |
| P08 | Storico limitato alle giocate consigliate (`decision=PLAY` di default, `decision=all` per il resto) | **Implementato**: nel registro Soccer NO BET e BORDERLINE gonfiavano la percentuale (62,4% contro 59,7%) |
| P09 | Nomi delle partite di calcio nello storico | **Implementato**: recuperati dal provider giorno per giorno, mai inventati |
| P10 | `git_sha` reale su `/ready` | **Corretto**: il valore `unknown` incorporato nel Dockerfile oscurava `RAILWAY_GIT_COMMIT_SHA`; ora viene ignorato. Da verificare dopo il deploy |
| P11 | Elenco Storico paginato (50 righe per pagina, caricamento allo scorrimento) | **Implementato**: prima l'app mostrava solo le prime 100 su 1.744 del Tennis |
| P12 | Filtro periodo nello Storico (sempre / 30 giorni / 7 giorni, sul giorno d'inizio partita) | **Implementato**; usa `from` del BFF già presente |
| P13 | Backup e retention di PostgreSQL | **Da configurare su Railway** (vedi `08_DATI_E_STORICO.md`): lo storico non è ricostruibile |

Dati osservati sul deploy dopo il rilascio: Calcio 153 giocate PLAY (89 prese su 149 decise, 59,7%), Tennis 1.744 giocate (926 prese su 1.656 decise, 55,9%), 0 righe escluse per orario. Lo storico parte dalla data di prima registrazione del provider (Tennis dal 22 luglio, Calcio dal 12 settembre): non promette osservazioni anteriori.

Differenza tra le due statistiche: "Statistica giornata" è calcolata nell'app su tutte le predizioni del giorno scelto; lo Storico conta solo giocate consigliate, ufficiali e pubblicate prima dell'inizio. Non vanno confrontate.

## Sprint 4 — account facoltativo

Decisioni di prodotto: accesso **facoltativo** (l'app resta usabile senza account), **solo Google** per ora. Apple arriva con iPhone (regola App Store: chi offre Google deve offrire anche Apple). Nessun pagamento in questo sprint.

| ID | Attività | Stato |
|---|---|---|
| A01 | Tabelle `users` e `user_identities` (provider generico, pronta per Apple) | **Implementato** (migrazione 0002) |
| A02 | `POST /api/v1/auth/google`: verifica del token Google (firma RS256, audience, issuer, scadenza), crea o ritrova l'utente, emette una sessione del BFF (JWT, 30 giorni) | **Implementato** con test (token scaduti, altra app, firma sbagliata) |
| A03 | `GET /api/v1/me` e `DELETE /api/v1/me` (cancellazione account: il token smette di valere subito) | **Implementato** |
| A04 | App: pulsante "Accedi" / avatar nell'header, schermata Profilo (accedi, esci, elimina account con conferma), sessione in `expo-secure-store` | **Implementato**; pulsante nascosto se manca `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| A05 | Configurazione Google Cloud (consenso OAuth, client Web e Android con SHA-1), variabili su Railway (`GOOGLE_CLIENT_IDS`, `SESSION_SECRET`) | **Da fare a mano** |
| A06 | Prova del login su Android con APK nuovo | **Da fare** |
| A07 | Informativa privacy (URL richiesto da Google e dagli store) | **Da fare** |
| A08 | Accedi con Apple | Rinviato a quando si va su iPhone (serve plugin `iosUrlScheme` e account Apple Developer) |

I dati salvati per utente: nome, email verificata e foto del profilo Google. Il resto dell'API resta pubblico: l'account non sblocca nulla finora.

## Sprint 5 — marcatori, gialli e aggiornamento (ottobre 2026)

Lavori consegnati dopo il 12 ottobre. Il contratto dettagliato dei marcatori resta in `13_MARCATORI_PROPOSTA.md` (documento nato come proposta: le domande aperte con il motore sono state risolte nel codice, ma il testo non è stato riscritto).

| ID | Attività | Stato |
|---|---|---|
| S01 | Marcatori probabili: sezione nell'app e nel dettaglio partita, dati dal motore Soccer (formazione ufficiale, ultima revisione per partita); il BFF non calcola nulla | **Implementato** |
| S02 | Gialli probabili dei giocatori: rotta BFF `/events/{id}/bookings`, sezione "Gialli probabili", accesi di default (`BOOKINGS_API_READY`); solo gialli, non i rossi | **Implementato** |
| S03 | "Aggiorna tutto" per Calcio e Tennis con percentuale di avanzamento per sport e totale, attesa di 20 minuti tra due avvii, aggiornamento che continua cambiando pagina; il Tennis rilancia sempre (`force=true`, niente 409 "già completato oggi"); bottone separato "Forza schedine Tennis (dopo le 10)" solo nel provider Tennis | **Implementato** |
| S04 | Ruoli nel BFF (super admin da ambiente, admin con permessi), elenco utenti, audit | **Implementato** |
| S05 | Filtro Tutti / Play / Borderline / No bet sopra i mercati; mercati su striscia di cerchi a scorrimento; chip Tutte / Live / Concluse accanto a "Statistica giornata"; live del calcio | **Implementato**; prova su dispositivo da fare |
| S06 | Modelli grezzi `cards` e `corners` nascosti in tutte le risposte (nessuna etichetta leggibile); nomi dei modelli nascosti nello Storico | **Implementato** |
| S07 | Ospiti: oggi e futuro limitati (3 mercati, marcatori e gialli, dettaglio, statistica giornata); giorni passati e Storico liberi. icona lucchetto sui contenuti bloccati e foglio "Accedi" | **Implementato**: primo pezzo di una futura distinzione ospite / account, senza pagamenti |
| S08 | Avviso "Affidabilità ridotta" (barre di segnale ambra) nel dettaglio previsione quando il motore segnala `low_reliability` (cartellini 6.5 senza quota): il BFF passa il campo, l'app mostra il badge | **Implementato** (PR #82); serve nuovo APK e motore aggiornato |
| S09 | Accesso: il pulsante resta visibile; senza modulo nativo Google (Expo Go, build vecchie) messaggio chiaro e nessun blocco ospite | **Implementato** |

Lato motore Soccer (altro repository) nello stesso periodo: anagrafica unica dei giocatori API-Sports / FotMob e rotte `/players/*` per altri progetti, protette da `X-Service-Key` (PR #28), cartellini giocatori (gialli), quote "Non casa" con la X2 e motivi chiari per le linee non quotate (PR #29), fix dei duplicati delle formazioni previste (PR #30). Feature v2 dei giocatori mergiate ma spente (`docs/player_features_v2.md` nel repository del motore).

### Aperti dello Sprint 5

| ID | Attività | Chi |
|---|---|---|
| S10 | Redeploy del motore Soccer (migrazione dell'anagrafica, quote, avviso 6.5), poi del BFF e nuovo APK | Titolare |
| S11 | Riaccendere i job fermati dalla pausa automatica per quota, se l'errore del provider era transitorio; i job spenti per scelta restano spenti | Titolare |
| S12 | Marcatori e gialli dipendono dalla formazione ufficiale (circa 75 minuti prima del calcio d'inizio): senza i job di sincronizzazione accesi la previsione ufficiale non si crea. Rimisurare la regolarità con i job accesi | Motore |
| S13 | Riscrivere `13_MARCATORI_PROPOSTA.md` come documento di stato, non di proposta | Documentazione |

## Sprint 6 — abbonamenti (da definire, nessun pagamento implementato)

Oggi non esiste nulla di pagamento nell'app né nel BFF. Sprint 4 dice "nessun pagamento", Sprint 3+ dice "abbonamenti solo dopo validazione uso e analisi del canale di vendita". Questa sezione elenca cosa va deciso e cosa è già pronto; i valori (prezzi, piani, cosa è gratis) **non sono decisi** e non vanno inventati.

**Già pronto:**
- Accesso Google facoltativo, sessione del BFF di 30 giorni, cancellazione account (Sprint 4).
- Distinzione ospite / account nell'app (S07): è il punto da cui far partire un livello a pagamento.
- Ledger ufficiale e Storico con denominatori (Sprint 3): servono per mostrare risultati senza gonfiarli.
- Il bot Telegram del Tennis ha già una sua infrastruttura di abbonamenti (`/abbonati`) e un piano "beta gratuita → monetizzazione" (`docs/BETA_TO_MONETIZATION_PLAN.md` nel repository Tennis).

**Da decidere prima di scrivere codice:**

| ID | Decisione | Note |
|---|---|---|
| B01 | Cosa resta gratis e cosa diventa a pagamento (oggi l'ospite è già limitato su oggi e futuro) | Scelta di prodotto |
| B02 | Piani e prezzi | Da fissare dopo la validazione dell'uso |
| B03 | Canale di pagamento: acquisti in-app dello store o altro | Su iPhone le regole dell'App Store impongono anche "Accedi con Apple" (A08) e l'uso dei loro acquisti; da verificare prima di scegliere |
| B04 | Soglie di avvio: il piano Tennis chiede almeno 300 tip chiuse, 8 settimane consecutive di osservazione, ROI live cumulato di almeno -2% e nessun drawdown critico. Per il Calcio serve misurare il ROI live delle giocate PLAY: oggi lo Storico mostra la percentuale di successo (59,7% su 149 decise al rilascio), non il rendimento | Da definire con i dati |
| B05 | Testi legali: dati del titolare nell'informativa privacy (A07), termini di servizio, avvertenza sul rischio. Nessuna promessa di guadagno | Prerequisito di qualunque pagamento |
| B06 | Come l'app riconosce un account a pagamento (campo sull'utente nel BFF, verifica della ricevuta) | Dopo B03 |

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
