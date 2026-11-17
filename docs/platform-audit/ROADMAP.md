# Roadmap

**Sintesi per il titolare.** Il lavoro fatto finora è additivo e già sui branch. I prossimi passi
richiedono tue decisioni: prima la rotazione delle credenziali Soccer (urgente), poi le correzioni
che cambiano ciò che l'app mostra (probabilità tennis, decisioni tennis, dettaglio calcio), infine
pulizia e costi. Ogni voce dice se cambia il comportamento in produzione.

Tutte le voci di questa pagina sono **PROPOSTA** salvo dove indicato. Nulla è stato deployato.

## Punti critici aperti (in ordine)

| # | Punto | Stato | Cosa serve |
|---|---|---|---|
| a | Credenziali reali nella storia git di `ia_predict_soccer`: `properties/config.env` in 11 commit (chiavi API-Sports, The Odds API, Telegram, Stripe, password del DB); `client_secret.json` e account di servizio sul ramo `feature/config_drive` | **VERIFICATO**; rotazione **PROPOSTA urgente** | ruotare subito tutte le credenziali; la riscrittura della storia è una decisione separata |
| b | Tennis v4 in produzione riceve 0 sulle 13 feature ATP: log loss +0,00624, accuratezza 0,7068 → 0,7013, 7,97% di pronostici invertiti, peggio in 8 fold su 8 | **VERIFICATO** | tua decisione: correggerlo cambia le probabilità pubblicate |
| c | Tennis match winner: il BFF decide sulla probabilità grezza perché il motore non pubblica `value_decision`/`void_odds` (esempio: BFF PLAY, motore NO BET) | **VERIFICATO**; dichiarato nel contratto (**IMPLEMENTATO** `Sport_IAppero@e507892`) | il motore pubblica i due campi |
| d | Calcio, dettaglio partita: il BFF non legge le forme reali di `/oracle-detail` e `/dashboard/match/{id}` | **VERIFICATO** | attività separata sul BFF |
| e | Nessun modello batte il mercato in modo rilevante (Tennis: pochi millesimi su quote presumibilmente di chiusura; Soccer: nessuno) | **VERIFICATO** | non promettere un vantaggio sul mercato |

Dettagli: [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md).

## Prossimi passi, ordinati per impatto

Ordine: sicurezza, qualità predittiva e affidabilità prima; costo e pulizia dopo.

| Priorità | Azione | Area | Rischio | Dipendenza | Cambia la produzione |
|---|---|---|---|---|---|
| P0 | Ruotare API-Sports, The Odds API, Telegram, Stripe, password DB Soccer, client OAuth e account di servizio; togliere host e porta da `docs/soccer_oracle_v2_detailed/IMPLEMENTATION_LOG.md:432` | sicurezza | basso se coordinato; breve disservizio se una chiave nuova non viene impostata ovunque | accesso del titolare ai pannelli dei provider e alle variabili Railway | sì: nuove chiavi nelle variabili d'ambiente; nessun cambio funzionale atteso |
| P0 | Correggere lo scostamento train/serve Tennis v4 (riaddestramento senza arricchimento ATP o policy `impute`) | qualità predittiva | medio: cambiano probabilità e decisioni; da validare su dati recenti prima del rilascio | tua decisione; il benchmark è già pronto per confrontare le varianti | **sì**: probabilità pubblicate |
| P1 | Motore Tennis: pubblicare `value_decision` e `void_odds` del match winner in `MatchPredictionRead` | affidabilità della decisione | basso (campi additivi; il BFF li legge già) | nessuna | **sì**: alcune decisioni PLAY diventano NO BET/BORDERLINE nell'app |
| P1 | BFF: leggere le forme reali del dettaglio partita calcio (`overview.fixture`, `probabilities`, `decision_cards` al livello superiore) | affidabilità | medio: tocca la schermata di dettaglio | test costruiti dal codice del motore | **sì**: il dettaglio mostra predizioni e decisioni del motore |
| P1 | Registrare l'istante di cattura delle quote (anche nello storico) e ripetere i benchmark su quote coerenti con la pubblicazione | qualità predittiva | basso | modifiche ai motori, nuovo storico | no (misura) |
| P1 | Tennis: valutare la calibrazione delle probabilità (oggi nessun calibratore in inferenza; nel benchmark `market_logit_recalibrated` ha ECE 0,0084 contro 0,0181 del mercato grezzo) | qualità predittiva | medio | dopo la correzione P0 | **sì** |
| P2 | Soccer: riconciliare h2h, doppia chance e 1X2 nel dettaglio partita | coerenza | medio | decisione su quale modello è la fonte | **sì**: card mostrate |
| P2 | Soccer: gestire l'xG mancante come mancante (non 0) e salvare `features_defaulted` sullo snapshot | qualità predittiva | medio: richiede riaddestramento | promozione nel registry | **sì** (dopo riaddestramento) |
| P2 | Catturare in staging una risposta reale per ogni endpoint dei motori usato dal BFF e usarla come fixture | affidabilità | basso | ambiente di staging | no |
| P2 | Breaker e cache del BFF condivisi se si passa a più repliche; lock della pausa quota Soccer fra container `api` e `scheduler` | affidabilità | medio | decisione sul numero di repliche (oggi non verificato) | no finché resta un processo |
| P2 | Tennis: sostituire con segnaposto le password di sviluppo in `.env.example:17`, `:20-21`, `:39` | sicurezza | basso | nessuna | no |
| P3 | Riscrivere la storia di `ia_predict_soccer` (credenziali, `feature/config_drive`, dump in `backend/src/backup_db`, 434.438.069 byte) | sicurezza / costo | alto: force push, tutti devono riclonare | solo **dopo** la rotazione P0 | no (repository) |
| P3 | Railway: verificare e, se possibile, accorpare i servizi quasi inattivi (Soccer `web`, Tennis `frontend`, `telegram-bot`) | costo | basso | conferma d'uso | sì |
| P3 | Railway: capire i picchi di RAM di Soccer `api` (4,35 GB) e Tennis `scheduler-dev` (3,48 GB) prima di fissare limiti | costo / affidabilità | medio | accesso ai log | no (analisi) |
| P3 | Leggere fatturazione e piano Railway (oggi **BLOCCO**) e stimare il risparmio | costo | nessuno | accesso del titolare | no |
| P3 | Soccer: correggere i 17 test che falliscono già su `main`; BFF: correggere i 3 errori ruff preesistenti; app: configurare ESLint | qualità del codice | basso | nessuna | no |

## Da non fare senza nuove evidenze

- **PROPOSTA**: nessun ensemble calcio-tennis nel BFF; nessun nuovo mercato senza misura di
  copertura e qualità; nessun nuovo provider a pagamento attivato automaticamente.
- **PROPOSTA**: non sostituire i modelli in produzione sulla base dei benchmark attuali
  ([ML_VALIDATION_REPORT.md](./ML_VALIDATION_REPORT.md)).

## Già fatto (IMPLEMENTATO)

Contratto BFF additivo e feed stantio segnalato; resilienza HTTP nei tre repository; pausa quota
Soccer funzionante; trasparenza del serving Soccer; `data_quality` Tennis; chiavi API tolte dai log
(Tennis e The Odds API); benchmark riproducibili. Commit in [IMPLEMENTATION_LOG.md](./IMPLEMENTATION_LOG.md).
