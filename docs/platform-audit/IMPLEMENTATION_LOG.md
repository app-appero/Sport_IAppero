# Registro delle modifiche (IMPLEMENTATO)

**Sintesi per il titolare.** Sono stati fatti 47 commit sui tre branch (14 BFF e app, 18 Soccer, 15
Tennis), tra l'11/11 e il 17/11/2026. Le modifiche sono additive: nessun campo rimosso, nessuna
probabilità pubblicata cambiata, nessun deploy. Qui sotto i commit raggruppati per tema, con il
problema che ciascun gruppo risolve.

Elenco ricavato con `git -C <repo> log --oneline origin/main..HEAD` il 17/11/2026. Tutte le voci sono
**IMPLEMENTATO** nel repository indicato, branch `cursor/platform-audit-evolution-e436`. I commit di
questi documenti seguono `185d0d4` nello stesso branch di `Sport_IAppero`.

## Sport_IAppero (BFF + app) — 14 commit su `main` = `accd2b3`

| Tema | Problema risolto | Commit |
|---|---|---|
| Contratto unificato | il BFF non diceva da quale modello veniva una previsione, quanto erano freschi i dati né perché un mercato mancava; per il calcio `model`/`generated_at` erano vuoti | `516241c` Contratto unificato additivo, resilienza HTTP BFF e audit platform |
| Provenienza della decisione | non si sapeva se PLAY/NO BET veniva dal motore o era ricostruito dal BFF | `229ea96` Provenance: dichiara chi ha deciso PLAY/BORDERLINE/NO BET (decision_source) + contract test |
| Decisione tennis | il BFF decideva il tennis su 1/probabilità grezza anche quando il motore mandava `void_odds` (ridotte verso il mercato) | `e507892` Tennis: la decisione derivata preferisce void_odds del motore e dichiara la base |
| Allineamento campi motore | campi già emessi dai motori non letti: `features_defaulted`, istante del live calcio, `data_quality.status` e `prediction_warning` tennis | `54a2b3d` Calcio: legge features_defaulted e l'istante dello snapshot live del motore; `4ee6e3d` Tennis: data_quality.status limita la disponibilita', prediction_warning dichiara il mercato mancante; `185d0d4` Test contratto Tennis: data_quality con systemic_gaps come emesso oggi dal motore |
| Feed stantio | la cache scaduta veniva servita senza accendere `is_stale`; sulle pagine successive lo stato si perdeva | `84ffef1` Feed stantio: segnala is_stale anche quando la cache scaduta e' servita dopo un rebuild fallito; `80e2a81` Feed stantio: lo stato is_stale segue lo snapshot su tutte le pagine |
| Refresh admin | dopo un refresh la cache veniva cancellata: se il rebuild falliva l'app riceveva 503 invece dell'ultimo feed | `caae6e1` Refresh admin: cache feed scaduta ma conservata come ripiego stantio; `6b824b9` Test admin: invalidazione cache feed solo a refresh avviato, cooldown e audit invariati |
| Resilienza HTTP | nessun retry né breaker verso i motori; poi le POST di refresh potevano aprire il breaker e bloccare il feed | `516241c`; `58b3200` Test resilienza HTTP: 4xx senza retry, 429/timeout ritentati, tetto tentativi, reset breaker, isolamento per provider; `f77a88b` Circuit breaker: le POST di refresh non sono bloccate e non lo aprono |
| App mobile | probabilità mancante mostrata come 0%; nessun avviso di feed stantio; tipi nuovi da dichiarare | `516241c`; `b9cdfbd` Mobile: helper puri per probabilita' mancante (niente 0% fittizio) e riga feed stantio, con test; `727a14c` Mobile: tipi opzionali per provenance.decision_source e decision_basis |

## ia_predict_soccer (Soccer Oracle) — 18 commit su `main` = `18eebfe`

| Tema | Problema risolto | Commit |
|---|---|---|
| Resilienza API-Sports | retry lineari senza breaker: a provider giù ogni richiesta consumava tutti i timeout | `226d03c` Audit: resilienza API-Sports, pausa quota nello scheduler, trasparenza predizioni e benchmark 1X2; `b514fd2` Test di concorrenza e backoff per le primitive di resilienza; `572b535` Test: contratto di ApiSportsProvider verso i job |
| Pausa a quota esaurita | la funzione di pausa esisteva ma lo scheduler non la chiamava; poi tre difetti (toggle azzerati su lettura fallita, baseline salvata tardi, job dello stesso tick con stato vecchio) | `226d03c`; `d395c34` Quota pause: conserva la baseline e ricorda i toggle dell'operatore; `fc0444d` Quota pause: letture strette e sincronizzazione serializzata; `3d8ea22` Scheduler: commento sul riallineamento quota con i numeri reali |
| Settlement e aggiornamento puntuale | il settlement, dichiarato "solo DB", importava da API-Sports anche a quota esaurita; l'esito dell'import non era dichiarato | `226d03c`; `3b9d7e5` Settings: campo additivo partially_calls_api_sports per data_settlement; `3643636` Import dal provider: esito dichiarato in settlement e aggiornamento puntuale |
| Chiave The Odds API | la chiave compariva nei messaggi d'errore e nei log DEBUG di urllib3; timeout da ambiente poteva far fallire l'import | `39d7cf2` The Odds API: errori di rete senza apiKey nel messaggio; `4196864` The Odds API: apiKey mascherata nei log di urllib3; `ce7d797` The Odds API: timeout da ambiente letto senza far fallire l'import |
| Trasparenza del serving | mercati senza modello scartati in silenzio; `xg_available` vero anche con xG mai rilevato; `features_defaulted` perso al secondo accesso | `226d03c`; `d28d486` Serving: motivo esplicito per mercati senza modello e feature riempite a 0; `1b08cf4` Serving: xg_available falso quando la media xG e' zero; `903d3f9` Serving: il motivo "nessun modello" viene prima di quote e partita; `56d8770` Serving: features_defaulted anche sugli snapshot riusati, test sulle righe |
| Benchmark | nessuna misura dei modelli contro il mercato sul 1X2 | `226d03c` (script, dati esportati, risultato JSON) |
| Documentazione | documenti dell'11/11 con log locali non più disponibili | `eff8175` Documentazione platform-audit (log e test Soccer); `b2f3f64` Docs platform-audit: log e test report verificati il 2026-11-17; `bf8f3c4` Docs platform-audit: tolto il percorso dei vecchi log locali |

## tennis_oracle (Tennis Oracle) — 15 commit su `main` = `4bd7281`

| Tema | Problema risolto | Commit |
|---|---|---|
| Client API-Tennis | nessun retry né breaker; poi chiave API nei traceback dei log (difetto preesistente su `main`) | `8d9ca20` API-Tennis client: retry con backoff esponenziale, circuit breaker e metriche; `5515aec` API-Tennis client: budget di tempo per chiamata e creazione del breaker sotto lock; `2da4346` API-Tennis client: nessuna chiave API nei traceback degli errori di trasporto; `41b6ab9` API-Tennis client: test di concorrenza sul breaker condiviso |
| Import quote | un errore del provider su `get_odds` era indistinguibile da "nessuna quota" | `676175b` Import prossimi incontri: distingue errore del provider da assenza di quote |
| Qualità dei dati | nessun segnale per giocatori senza storico o feature mancanti; nessun istante delle quote | `183c4f4` Match winner: policy feature mancanti, data_quality e freschezza quote; `2c2f8cd` Match winner: test che blocca il default della policy feature mancanti; `797e880` data_quality in lettura: feature ATP non disponibili e storico giocatori (opt-in) |
| Benchmark e scostamento train/serve | nessuna misura contro il mercato; poi un difetto del benchmark (circuito inferito con dati futuri) | `01b7fb0` Benchmark walk-forward offline del match winner e misura dello skew train/serve; `180f653` Benchmark walk-forward: circuito inferito senza dati futuri, accuratezza nello skew, report rigenerato; `a25b162` Benchmark walk-forward: riepilogo leggibile (.md) accanto al report JSON |
| Configurazione | variabili nuove non documentate | `04873ce` Documenta le nuove variabili opzionali (resilienza API-Tennis, policy feature mancanti); `9028443` Documenta API_TENNIS_RETRY_BUDGET_SECONDS negli esempi di configurazione |
| Documentazione | documenti dell'11/11 non verificati | `56ac58a` Documentazione platform-audit (log e test Tennis); `7f7b5ab` Documentazione platform-audit: log e test report aggiornati e verificati |

## Cambi di comportamento che il merge porterebbe in produzione (VERIFICATO nel codice)

Le probabilità non cambiano, ma alcuni comportamenti sì:

| Repo | Cambio | Commit |
|---|---|---|
| Sport_IAppero | calcio: `provider.version` e `model.version` valgono il `run_id` del motore invece di `None` | `516241c` |
| Sport_IAppero | a motori giù il feed in cache viene servito fino a 300 s con `meta.is_stale = true` e warning `served_from_stale_cache`; oltre, 503 | `84ffef1`, `80e2a81` |
| Sport_IAppero | dopo un refresh admin, se il rebuild fallisce, risposta 200 con feed stantio segnalato invece di 503 | `caae6e1` |
| Sport_IAppero | GET verso i motori ritentate fino a 3 volte; dopo 5 fallimenti consecutivi le GET verso quel motore falliscono subito per 30 s | `516241c`, `f77a88b` |
| Sport_IAppero | tennis: `availability.status = limited` quando il motore dichiara un buco nei dati (campo non ancora usato dall'app) | `4ee6e3d` |
| Sport_IAppero | app: "—" invece di 0% quando manca la probabilità; banner di avviso sul feed stantio | `b9cdfbd` |
| ia_predict_soccer | a quota API-Sports esaurita i 6 job che la consumano vengono spenti automaticamente e riaccesi al ripristino (prima la pausa non era collegata allo scheduler) | `226d03c`, `d395c34`, `fc0444d` |
| ia_predict_soccer | a quota esaurita il settlement non importa dal provider e riconcilia dal DB | `226d03c`, `3643636` |
| ia_predict_soccer | `POST /settings/jobs` con bucket illeggibile risponde errore invece di salvare i default | `fc0444d` |
| tennis_oracle | chiamate API-Tennis ritentate su errori transitori; a provider giù il breaker fa fallire subito le chiamate per 60 s | `8d9ca20`, `5515aec` |

La decisione del match winner tennis nel BFF oggi non cambia: il motore non manda `void_odds`, quindi
resta sulla probabilità grezza (ora dichiarato). I mercati extra tennis usavano già `void_odds` del
motore su `main`.

## Cosa non è stato modificato (VERIFICATO)

- Nessun artefatto di modello, soglia di decisione o probabilità pubblicata
  (`tennis_oracle/backend/data/models` invariato; policy `MATCH_WINNER_MISSING_FEATURE_POLICY=zero`
  bloccata da un test).
- Nessun dump, nessuna storia git riscritta, nessuna credenziale ruotata (sono **PROPOSTA**).
- Nessun deploy su Railway, nessuna PR, nessun merge in `main`.
