# Tennis Oracle — provider, qualità dei dati e scostamento train/serve

**Sintesi per il titolare.** Il motore tennis dipende da un solo provider (API-Tennis). L'audit ha
reso il client robusto, ha eliminato una fuga della chiave API nei log e ha aggiunto un indicatore
di qualità dei dati per ogni previsione. Il problema aperto più importante è di qualità predittiva:
il modello v4 in produzione riceve 0 su 13 colonne che in addestramento avevano valori reali, e
questo peggiora le previsioni in modo misurato. Correggerlo cambia le probabilità pubblicate, quindi
serve una tua decisione. Inoltre il motore non pubblica la propria decisione PLAY/NO BET del match
winner, che il BFF deve ricostruire.

Repository `tennis_oracle`, branch `cursor/platform-audit-evolution-e436` (HEAD `7f7b5ab`,
`main` = `4bd7281`). Fonte di dettaglio: `docs/platform-audit/IMPLEMENTATION_LOG.md` e
`TEST_REPORT.md` del repository (17/11/2026). Percorsi relativi a `tennis_oracle/backend/`.

## 1. Provider esterni — VERIFICATO

| Provider | Uso | Riferimento |
|---|---|---|
| API-Tennis | unico feed a runtime (partite, quote, classifiche, giocatori); chiave in `API_TENNIS_KEY`, indirizzo in `API_TENNIS_BASE`, chiave passata in query come `APIkey` | `src/utility/request_api.py:35-36`, `:348` |
| API-Tennis `get_odds` | una chiamata per partita nell'import dei prossimi incontri | `src/service/import_next_fixtures.py:399` |
| File Sackmann ATP | solo offline, per l'arricchimento del dataset di addestramento | `src/app/ml/datasets/`, `src/app/ml/benchmarks/match_winner_walk_forward.py` |
| Telegram, Stripe, Resend | notifiche, pagamenti, email: non dati tennis | `src/jobs/run_telegram_notifications.py`, `src/app/services/payments.py`, `src/app/observability/email_reports.py` |

## 2. Client API-Tennis — IMPLEMENTATO

Commit `8d9ca20`, `5515aec`, `2da4346`, `9028443`, `41b6ab9`. Default **VERIFICATO** in
`src/utility/request_api.py`:

| Parametro | Default | Riga |
|---|---|---|
| timeout | 30 s | `:39` |
| retry extra | 2 | `:51` |
| backoff base / tetto | 0,5 s / 8 s | `:52-53` |
| budget per chiamata | 2 × timeout = 60 s | `:230`, `:321` |
| breaker | aperto dopo 5 tentativi falliti, recupero 60 s poi una probe | `:59-60` |

- Retry solo su 429, 5xx, timeout ed errori di rete; un 4xx non apre il breaker. Breaker creato
  sotto lock (`_breaker_lock`, `:158`, `:168`); stato non condiviso fra processi.
- Metriche `api_tennis_requests_total`, `api_tennis_retries_total`,
  `api_tennis_request_duration_seconds`, `api_tennis_circuit_breaker_transitions_total`.
- **Difetto preesistente corretto (`2da4346`)**: le eccezioni di `requests` contengono l'URL con
  `APIkey` in chiaro e il client le agganciava come causa, quindi ogni `logger.exception` a valle
  (es. `src/app/services/global_update.py:444`) scriveva la chiave nei log. Ora la causa è
  `ApiTennisTransportCause` con messaggio redatto (`request_api.py:103-121`). Dimostrato in locale
  con chiave finta e porta chiusa, senza rete esterna (fonte: IMPLEMENTATION_LOG Tennis, sezione 1).

## 3. Import delle quote — IMPLEMENTATO

`676175b`: `fetch_odds_for_match` (`import_next_fixtures.py:387`) distingue "errore del provider"
da "nessuna quota"; contatori additivi `odds_fetched`, `odds_empty`, `odds_fetch_errors`
(`:470-472`) nel riepilogo di `POST /api/imports/refresh` e `POST /api/matches/{event_key}/refresh`.
Le quote salvate non vengono toccate quando la chiamata fallisce.

## 4. Qualità dei dati per previsione — IMPLEMENTATO (additivo)

Commit `183c4f4`, `2c2f8cd`, `797e880`.

- `MatchPredictionRead.data_quality` (`src/app/schemas/prediction.py:62`) in
  `GET /api/next-fixtures/predictions`: `status` (`sufficient` / `limited` / `insufficient`),
  `reasons`, `systemic_gaps`, `details`, `evaluated`, `not_evaluated`.
- `NextFixtureWithPrediction.odds_captured_at` (`schemas/prediction.py:94`): ultima cattura quote
  del match winner, `null` se non registrata.
- Giocatori con meno di 5 partite di storico (`src/app/ml/prediction/data_sufficiency.py:28`) →
  `status = limited`. In lettura lo storico è valutato solo con
  `PREDICTION_DATA_QUALITY_HISTORY_ENABLED=true` (default `false`, `src/app/core/config.py:180`),
  perché la query non ha indici e la latenza in produzione non è misurata.
- `MATCH_WINNER_MISSING_FEATURE_POLICY` (default `zero`, `config.py:172`): con il default la
  probabilità è identica a `main` (test `test_default_policy_probability_is_exactly_the_legacy_integer_zero_fill`).

## 5. Scostamento train/serve sul modello v4 — VERIFICATO, PROPOSTA

**Cosa succede (VERIFICATO).** Le 13 colonne di arricchimento ATP (età, altezza, mano,
`atp_surface`, `atp_tourney_level`, `atp_round`, `atp_best_of`, `atp_match_found`) non vengono mai
costruite in serving. `ATP_DEFAULTS` viene scritto sulla riga (`src/app/ml/prediction/predictor.py:373`)
ma eliminato dalla pulizia; al modello arriva lo 0 di `fill_missing_feature_columns`
(`predictor.py:577`). L'emulazione del benchmark coincide con il serving reale (differenza 0,0).

**Quanto pesa (VERIFICATO, benchmark del 17/11/2026, `n = 87.504`, 8 fold).**

| Confronto | Δ log loss [IC95] | Δ Brier | Accuratezza | Pronostici invertiti | Fold peggiori |
|---|---|---|---|---|---|
| serving con 0 vs feature reali | +0,00624 [+0,00551, +0,00696] | +0,00263 | 0,7013 vs 0,7068 | 7,97% | 8/8 |
| colonne dichiarate mancanti vs feature reali | −0,00011 [−0,00023, +0,00001] | −0,00005 | 0,7072 vs 0,7068 | 0,27% | 0/8 |

Artefatto di produzione `backend/data/models/v4/voting_ensemble.pkl`, in-sample (contano solo le
differenze), 66.633 righe dal 01/01/2025: log loss 0,55268 → 0,55527, ECE 0,0060 → 0,0252,
pronostici invertiti 3,37%, probabilità media 0,5102 → 0,4925 con target medio 0,5121.

Nota (VERIFICATO): l'arricchimento ATP esiste nel dataset solo per i fold 2023Q3 (quota 0,5018) e
2024Q4 (0,4599); dal 2025Q1 `atp_match_found` è 0 su tutte le righe. Nei fold recenti il confronto
misura quindi "mancante" contro "0".

**PROPOSTA (decisione del titolare).** Due strade equivalenti nel benchmark: riaddestrare senza
le colonne di arricchimento (`v4_like__trained_without_enrichment`, log loss 0,55669) oppure
attivare `MATCH_WINNER_MISSING_FEATURE_POLICY=impute` sull'artefatto attuale. Entrambe cambiano le
probabilità pubblicate e le decisioni PLAY/NO BET.

## 6. Decisione del match winner non pubblicata — VERIFICATO, PROPOSTA

- `MatchPredictionRead` (`schemas/prediction.py:38-62`) ha `predicted_winner_market_probability`
  (`:50`) ma né `value_decision` né `void_odds`; `ExtraMarketPredictionRead` ha `void_odds` ed
  `edge` (`:82-83`) calcolati dalla probabilità ridotta verso il mercato
  (`src/app/services/extra_market_predictions.py:136-142`).
- Il motore decide su p_adj = w·p_modello + (1−w)·p_mercato, con w = 0,5 per match winner e
  over/under games e 0,75 per il primo set (`src/app/services/single_match_value.py:54-59`, `:173-193`).
- Conseguenza nel BFF ed esempio PLAY vs NO BET: [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md),
  punto c.
- **PROPOSTA**: aggiungere `value_decision` e `void_odds` a `MatchPredictionRead` (additivi, nomi già
  letti dal BFF).

## 7. Altri indizi — VERIFICATO

- **Calibrazione non applicata in inferenza**: la probabilità pubblicata è quella di
  `pipeline.predict_proba` (`predictor.py:582-583`), salvata così com'è (`:653`, `:661`); l'artefatto
  v4 (VotingClassifier soft di LogisticRegression, XGBClassifier, HistGradientBoostingClassifier)
  non contiene calibratori.
- **Nessuna astensione per giocatori senza storico**: `predict_fixture` si astiene solo per chiavi o
  data mancanti (`predictor.py:522`) e quote mancanti v3/v4 (`:544`); ora la previsione esce con
  `data_quality.status = "limited"`.
- **Password di sviluppo banali nel file di esempio**: `.env.example:17`, `:20-21`, `:39` (variabili
  `POSTGRES_PASSWORD`, `DATABASE_URL`, `DATABASE_SOURCE_URL`, `ADMIN_PASSWORD`), già presenti su
  `main`, non toccate. **PROPOSTA**: sostituirle con segnaposto.

## Rischi residui (VERIFICATO, non risolti)

- Breaker per processo: con più worker ognuno conta i propri fallimenti.
- `PREDICTION_DATA_QUALITY_HISTORY_ENABLED=true` non provato sul database di produzione.
- Le quote storiche del dataset non hanno istante di cattura (presumibilmente di chiusura): i
  confronti con il mercato sono probabilmente ottimistici per i modelli che usano le quote.
- La suite di test riscrive il file tracciato
  `backend/data/reports/over_under_games_chained_experiment_results.json`: va ripristinato prima di
  ogni commit.
