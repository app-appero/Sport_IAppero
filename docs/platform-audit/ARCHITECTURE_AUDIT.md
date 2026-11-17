# Audit di architettura — Sport IApperò, Soccer Oracle, Tennis Oracle

**Sintesi per il titolare.** La piattaforma è un'app Expo che parla con un BFF FastAPI, il quale
aggrega due motori di previsione indipendenti (calcio e tennis). L'audit ha reso il BFF più
trasparente e robusto senza cambiare le probabilità pubblicate. Restano cinque punti aperti: il più
urgente è di sicurezza (credenziali reali nella storia git del repository Soccer, da ruotare); gli
altri riguardano la qualità delle previsioni Tennis, il modo in cui il BFF decide PLAY/NO BET sul
tennis, il dettaglio partita del calcio e il fatto che nessun modello batte il mercato in modo
rilevante.

Stato al 17/11/2026, branch `cursor/platform-audit-evolution-e436` dei tre repository.

## Punti critici aperti (in ordine di priorità)

### a. Credenziali reali nella storia git del repository Soccer — PROPOSTA urgente

- **VERIFICATO** (solo nomi e lunghezze, valori mai stampati): `properties/config.env` compare in
  11 commit di `ia_predict_soccer` (`git log --all --format=%h -- properties/config.env | wc -l`,
  il più vecchio del 17/07/2025, rimosso in `560d4c9`). Nella versione di `f59f14f` le variabili
  `API_SPORTS_KEY`, `API_ODDS_KEY_BASE`, `API_ODDS_KEY`, `TELEGRAM_TOKEN`, `STRIPE_SECRET_KEY` e
  `DATABASE_URL` hanno valori non vuoti (comando `git show f59f14f:properties/config.env` filtrato
  con `awk` per stampare solo nome e lunghezza).
- **VERIFICATO**: il ramo remoto `origin/feature/config_drive` (`cddb54b`) contiene
  `properties/client_secret.json` e un file JSON di account di servizio in `properties/`
  (`git ls-tree -r --name-only origin/feature/config_drive`).
- **VERIFICATO**: `docs/soccer_oracle_v2_detailed/IMPLEMENTATION_LOG.md:432` riporta host e porta
  del database Railway (password oscurata).
- **PROPOSTA urgente**: ruotare tutte queste credenziali (API-Sports, The Odds API, Telegram,
  Stripe, password del database, client OAuth e account di servizio) e togliere host e porta dal
  documento. Cancellare i file dal repository non li toglie dalla storia; la riscrittura della
  storia (e la cancellazione del ramo `feature/config_drive`) è una decisione separata, da prendere
  dopo la rotazione perché riscrive gli hash per tutti.

### b. Tennis: scostamento train/serve sul modello v4 in produzione — decisione del titolare

- **VERIFICATO**: in serving le 13 colonne di arricchimento ATP non vengono costruite.
  `ATP_DEFAULTS` viene scritto sulla riga (`tennis_oracle/backend/src/app/ml/prediction/predictor.py:373`)
  ma poi eliminato; al modello arriva lo 0 di `fill_missing_feature_columns` (`predictor.py:577`).
- **VERIFICATO** (benchmark del 17/11/2026, `n = 87.504`, 8 fold): servire 0 invece delle feature
  reali peggiora il log loss di +0,00624 [IC95 +0,00551, +0,00696], l'accuratezza scende da 0,7068
  a 0,7013, il 7,97% dei pronostici si inverte, peggio in 8 fold su 8. Sull'artefatto di produzione
  (in-sample, 66.633 righe dal 2025) il log loss passa da 0,55268 a 0,55527 e l'ECE da 0,0060 a
  0,0252; la probabilità media scende da 0,5102 a 0,4925 contro un target medio di 0,5121.
- **PROPOSTA**: correggere (riaddestrare senza quelle colonne, oppure dichiararle mancanti con la
  policy `impute`). Cambia le probabilità pubblicate: serve una tua decisione esplicita. Dettagli in
  [TENNIS_PROVIDER_AUDIT.md](./TENNIS_PROVIDER_AUDIT.md) e [ML_VALIDATION_REPORT.md](./ML_VALIDATION_REPORT.md).

### c. Tennis match winner: il BFF decide sulla probabilità grezza — dichiarato, ma aperto

- **VERIFICATO**: `MatchPredictionRead` del motore non ha né `value_decision` né `void_odds`
  (`tennis_oracle/backend/src/app/schemas/prediction.py:38-62`); la rotta
  `GET /api/next-fixtures/predictions` usa quello schema (`api/routes/predictions.py:54`). Il motore
  invece decide su p_adj = 0,5·p_modello + 0,5·p_mercato (`services/single_match_value.py:54-59`,
  `:173-193`).
- **VERIFICATO**: senza quei campi il BFF applica la soglia del 2% a 1/probabilità grezza
  (`Sport_IAppero/backend/app/providers/tennis/mapper.py:498-529`). Esempio calcolato: modello 74%,
  mercato 55%, quota 1,55. BFF: quota di pareggio 1,3514, soglia 1,3784 → **PLAY**. Motore:
  p_adj 0,645, quota di pareggio 1,5504 → **NO BET** (`python3 -c "v=1/0.74; print(v, v*1.02, 1/(0.5*0.74+0.5*0.55))"`).
- **IMPLEMENTATO** (`Sport_IAppero@e507892`): la decisione dichiara la propria base
  (`provenance.decision_basis = raw_probability`) con l'anomalia `decision_from_raw_probability`;
  se il motore manda `value_decision` o `void_odds`, il BFF li usa (in quest'ordine).
- **PROPOSTA**: il motore Tennis pubblica `value_decision` e `void_odds` del match winner in
  `MatchPredictionRead` (campi additivi; il BFF legge già quei nomi). Cambia le decisioni mostrate
  nell'app nei casi come l'esempio.

### d. Calcio, dettaglio partita: forme di risposta del motore non lette dal BFF — PROPOSTA (attività separata)

- **VERIFICATO**: `GET /dashboard/match/{id}/oracle-detail` restituisce
  `{fixture_id, overview: {fixture, …}, probabilities: [card], …}`
  (`ia_predict_soccer/backend/src/api/oracle_match_detail_service.py:302-320`), ma il BFF lo tratta
  come una riga piatta perché contiene `fixture_id` (`Sport_IAppero/backend/app/providers/soccer/mapper.py:957-960`):
  0 predizioni lette, ripiego sul feed del giorno.
- **VERIFICATO**: `GET /dashboard/match/{id}` mette le decision card al livello superiore
  (`dashboard_service.py:2266-2287`), mentre la riga `fixture` ha `decision_cards: []`
  (`dashboard_service.py:1536`, `:1787`); il BFF copia una chiave dal livello superiore solo se
  manca nella riga (`mapper.py:973`), quindi le predizioni arrivano senza decisione.
- **VERIFICATO**: le fixture di test del BFF (`backend/tests/fixtures/soccer/oracle_detail.json`,
  `match.json`) sono righe piatte, per questo i test non lo rilevano.
- **PROPOSTA**: allineare la lettura del BFF alle due forme reali, con test costruiti dal codice del
  motore. Cambia ciò che il dettaglio partita mostra: proposto come attività separata.

### e. Benchmark: nessun modello batte il mercato in modo rilevante — VERIFICATO

- Tennis (`n = 87.504`): il miglior modello `v4_like__enrichment_as_missing` ha log loss 0,55666
  contro 0,55906 del mercato senza margine (Δ −0,00241): pochi millesimi, misurati su quote storiche
  senza timestamp, presumibilmente di chiusura. Il vantaggio potrebbe non trasferirsi in
  produzione, dove il modello vede quote precedenti.
- Soccer 1X2 (`n = 8.118`): nessun modello batte il mercato senza margine (0,97408); il mercato
  ricalibrato è indistinguibile (Δ −0,00021 [−0,00144, +0,00105]); Elo, Dixon-Coles e Poisson sono
  peggiori in 20 fold su 20.
- **PROPOSTA**: non presentare nell'app un "vantaggio sul mercato" finché non c'è una misura su quote
  con istante di cattura noto. Dettagli in [ML_VALIDATION_REPORT.md](./ML_VALIDATION_REPORT.md).

## Architettura reale (VERIFICATO)

```text
App Expo (Sport_IAppero/mobile)
        │ HTTPS  /api/v1/feed, /api/v1/predictions, /api/v1/admin/…
        ▼
BFF FastAPI (Sport_IAppero/backend) — un solo processo uvicorn (backend/Dockerfile:20)
   ├── cache feed in memoria (TTL 60 s, ripiego stantio fino a 300 s; core/config.py:37-38)
   ├── retry GET + circuit breaker per provider (providers/http_utils.py)
   ├── SoccerProvider ──► Soccer Oracle (ia_predict_soccer, FastAPI + scheduler + Postgres)
   │                        /dashboard/day, /dashboard/match/{id}[/oracle-detail], /live/fixtures,
   │                        /dashboard/matches/{id}/refresh, /jobs/…   (providers/soccer/client.py:180-206, :242, :651-654)
   └── TennisProvider ──► Tennis Oracle (tennis_oracle, FastAPI + scheduler + Postgres)
                            /api/next-fixtures/predictions, /api/published-predictions,
                            /api/matches/{id}/refresh, /api/global-update   (providers/tennis/client.py:145-181)
```

| Componente | Repository | Ruolo | Provider dati a monte |
|---|---|---|---|
| App mobile | `Sport_IAppero/mobile` | presentazione; tipi tutti opzionali (`mobile/types/api.ts`) | — |
| BFF | `Sport_IAppero/backend` | aggregazione, contratto unificato, cache, storico utente | i due motori |
| Soccer Oracle | `ia_predict_soccer` | import, training multi-mercato, snapshot predizioni, decision card | API-Sports; FotMob via RapidAPI; The Odds API solo offline |
| Tennis Oracle | `tennis_oracle` | import, training match winner e mercati extra, pubblicazione | API-Tennis; file Sackmann ATP solo offline |

- **VERIFICATO**: non esiste un ensemble calcio-tennis; le probabilità sono responsabilità dei
  motori. Il BFF ricostruisce la decisione solo per il tennis (punto c).
- **VERIFICATO** (feed da fixture, script in TEST_REPORT): calcio = `decision_source=provider`,
  `decision_basis=provider_decision` su tutti i mercati; tennis match winner = `bff_derived` /
  `raw_probability`; tennis first_set_winner e over_under_games = `bff_derived` / `provider_void_odds`.

## Deploy su Railway (VERIFICATO, metriche del 15/11/2026)

Tre progetti, ognuno con un solo ambiente chiamato `dev`: `sport_IApperò` (bff, Postgres),
`Soccer-Oracle` (api, scheduler, web, Postgres), `Oracle-Tennis` (backend, scheduler-dev,
telegram-bot, frontend, Postgres). Uso e proposte in [PERFORMANCE_COST_AUDIT.md](./PERFORMANCE_COST_AUDIT.md).

## Cosa è cambiato con l'audit (IMPLEMENTATO)

| Area | Cosa | Commit |
|---|---|---|
| BFF | contratto additivo: `model`, `availability`, `data_freshness`, `provenance`, `anomalies`, `event.unavailable_markets`, `meta.is_stale` | `Sport_IAppero@516241c`, `229ea96`, `e507892`, `54a2b3d`, `4ee6e3d` |
| BFF | feed stantio sempre segnalato (anche dopo rebuild fallito e su tutte le pagine) | `84ffef1`, `80e2a81` |
| BFF | refresh admin: cache scaduta ma conservata come ripiego | `caae6e1` |
| BFF | retry solo GET, breaker per provider; le POST non lo aprono | `516241c`, `f77a88b` |
| App | niente 0% fittizio, banner feed stantio | `b9cdfbd`, `727a14c` |
| Soccer | pausa quota collegata allo scheduler e corretta; settlement senza import a quota esaurita | `ia_predict_soccer@226d03c`, `d395c34`, `fc0444d`, `3643636` |
| Soccer | trasparenza serving (`markets_missing_reasons`, `data_quality`, `computed_at`, `features_defaulted`) | `d28d486`, `1b08cf4`, `903d3f9`, `56d8770` |
| Soccer | chiave The Odds API mascherata in errori e log | `39d7cf2`, `4196864`, `ce7d797` |
| Tennis | client API-Tennis con retry, breaker, budget; chiave tolta dai traceback | `tennis_oracle@8d9ca20`, `5515aec`, `2da4346` |
| Tennis | `data_quality` e `odds_captured_at` additivi; errore quote distinto da "nessuna quota" | `183c4f4`, `797e880`, `676175b` |
| Entrambi | benchmark walk-forward offline riproducibili | `tennis_oracle@01b7fb0`, `180f653`; `ia_predict_soccer@226d03c` |

Elenco completo in [IMPLEMENTATION_LOG.md](./IMPLEMENTATION_LOG.md).

## Rischi architetturali residui (VERIFICATO, non risolti)

- Cache del feed e circuit breaker del BFF vivono nella memoria del processo: corretti con un solo
  processo uvicorn (`backend/Dockerfile:20`); il numero di repliche su Railway non è verificato.
- Una POST riuscita non chiude il breaker del BFF (le POST non lo toccano, `providers/http_utils.py:78-93`, `:122`).
- Breaker Tennis e Soccer per processo/istanza: `live_data_service.py:186` crea un proprio
  `ApiSportsProvider`; il lock della pausa quota Soccer non vale fra i container `api` e `scheduler`.
- Il contratto motore → BFF è testato con payload costruiti dal codice dei motori, non con risposte
  catturate dal vivo (punto d ne è la conseguenza).
- `availability.status` Tennis può diventare `limited` quando il motore dichiara un buco nei dati
  (`4ee6e3d`); frequenza in produzione non misurata; l'app non usa ancora questo campo.
