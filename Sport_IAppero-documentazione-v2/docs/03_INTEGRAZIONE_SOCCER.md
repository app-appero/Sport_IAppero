# Integrazione Soccer Oracle

Base: https://soccer-oracle-api-dev.up.railway.app
Repository: https://github.com/romy1992/ia_predict_soccer.git
Codice: `backend/src/api/main.py`, `schemas.py`, `dashboard_service.py`, commit nel documento 00.

## Endpoint verificati

| Metodo e path | Utilizzo | Note |
|---|---|---|
| GET `/dashboard/day` | Feed eventi e predizioni | `target_date`, `limit` default 300, `with_predictions`, `markets` CSV, `phase`, `search`, `force_refresh` |
| GET `/dashboard/match/{fixture_id}` | Dettaglio eventuale | Può attivare calcolo, eventi/provider esterno; non usarlo per arricchire ogni riga |
| GET `/dashboard/match/{fixture_id}/oracle-detail` | Analisi estese successive | Non necessario al primo feed |
| GET `/predictions/official/plays` | Ledger ufficiale | `market`, `is_settled`, `limit` default 200; senza filtro data/offset nell'API esaminata |
| GET `/predictions/ledger/fixture/{fixture_id}` | Ledger singolo evento | Consultazione futura |
| GET `/predictions/official/performance` | Statistiche provider | Tenere separati denominatori e cohort |
| GET `/markets` | Discovery mercati | Route verificata, prova payload in timeout |

Il path Soccer non ha prefisso `/api/v1`: questo prefisso riguarda solo il nuovo BFF.

Chiamata iniziale: `GET /dashboard/day?target_date=YYYY-MM-DD&limit=300&with_predictions=true&force_refresh=false`. Nel codice corrente questa lista legge snapshot bulk e usa `allow_compute=False`; `force_refresh=true` può interrogare provider esterni. L'aggregatore mantiene sempre false. Il dettaglio non ha la stessa garanzia: costruire il dettaglio MVP dai dati del feed/cache.

## Mapping eventi da rows[]

| Campo reale | Destinazione proposta | Regola |
|---|---|---|
| `fixture_id` | event.source_event_id | Stringa; ID unificato `soccer:event:{fixture_id}` |
| `home`, `away` | event.participants[] | role home/away; non inventare ID squadre |
| `league` | event.competition.name | Nel serializer day è nome o fallback ID in stringa |
| `round` | event.metadata.round | Opzionale |
| `datetime` | event.start_time | Accettare offset reale; timestamp naive richiede policy timezone confermata |
| `date`, `time` | event.metadata.source_date/source_time | Non assumere UTC dalle sole stringhe |
| `status`, `phase` | event.status + metadata.source_status | Mappa esplicita pre-match; sconosciuto → unknown |
| `score`, `actual_totals` | event.metadata | Dati storici/futuri opzionali |
| `markets_unavailable` | event.unavailable_markets | Non generare previsioni per questi mercati |

## Mapping predizioni da decision_cards[]

| Campo reale | Destinazione | Regola |
|---|---|---|
| `market` | market.source_key / market.key | Traduzione con tabella esplicita |
| `outcome`, `pick` | selection.source_value / label | outcome preferito come codice sorgente; pick per visualizzazione |
| `predicted_probability` | probability | È probabilità dell'esito; float [0,1] |
| `line` | market.line | Decimal opzionale; validare formato, conservare source_value |
| `odd` | pricing.odds_decimal | `market_odd` solo fallback se coerente |
| `prob_edge`, `ev` | pricing.probability_edge / expected_value | Unità frazionaria, non percentuale |
| `value_label`, `value_reason` | decision.code / reason | Non ricalcolare PLAY con soglie del BFF |
| `model_name`, `run_id` | model.name / run_id | Run ID non è automaticamente versione modello |
| `is_official` | provenance.is_official | Non attribuire ufficialità agli snapshot normali |
| `settlement_status`, `pnl` | settlement.source_status / profit_units | Mappa solo valori verificati |

Per mercati binari, `predictions[market].probability` rappresenta P(classe 1), non sempre P(esito scelto). Il servizio calcola `predicted_probability = p` se prediction==1, altrimenti `1-p`. Preferire le decision_cards già risolte. Per h2h usare le probabilità degli outcome; non trattare la prediction intera come binaria. Non usare 0.5 come fallback del BFF se il dato manca.

Nel ledger ufficiale reale: `id_prediction` UUID identifica la riga, `p_model` è probability, `outcome` la selezione, `model_run_id` il run, `kickoff_at` il timestamp evento, `captured_at` il timestamp pubblicazione, `cohort` distingue il cohort e `line` distingue le soglie. `league` nel campione ledger è un ID numerico, non un nome. Le anagrafiche squadra non sono incluse: serve join sul feed/cache; senza anagrafica non inventare nomi.

## Mercati

| Sorgente | Chiave unificata proposta | Linea/periodo |
|---|---|---|
| h2h | match_result | full_time; home/draw/away |
| dc | double_chance | full_time; home_draw/draw_away/home_away |
| goal_no_goal | both_teams_to_score | full_time |
| under_over_1_5 / 2_5 / 3_5 | total_goals | 1.5 / 2.5 / 3.5, full_time |
| cards_line_3_5 / 4_5 / 5_5 / 6_5 | total_cards | 3.5 / 4.5 / 5.5 / 6.5, full_time |

Registrare soltanto mercati realmente presenti. Per codici selezione non verificati conservare la label sorgente e segnalare mapping incompleto. Non dedurre penalità/rossi o regole settlement di cards dal nome mercato.

## Limiti da risolvere

La response day restituisce `total` e `returned`, ma non ha offset: se troncata, non fingere completezza. Filtrare per mercati o usare strategia approvata dopo misure. Il ledger ufficiale usa un limit senza paginazione: non promettere storico completo. Feed del 7 ottobre vuoto; mapping rows confermato dal codice, non da payload pieno su quel giorno. Nessuna auth applicativa dichiarata nelle route Soccer esaminate; non assumere configurazione di rete protetta. Il BFF deve esporre solo una allowlist.
