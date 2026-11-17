# Revisione del contratto API — BFF ↔ motori ↔ app

**Sintesi per il titolare.** Il BFF espone ora, per calcio e tennis con gli stessi nomi, da quale
modello viene una previsione, quanto sono freschi i dati, se mancano informazioni e chi ha preso la
decisione PLAY/NO BET. Tutti i campi nuovi sono facoltativi: le versioni dell'app già installate
continuano a funzionare. Due divari restano aperti: la decisione del match winner tennis è
ricostruita dal BFF, e il dettaglio partita del calcio non legge le risposte reali del motore.

Repository `Sport_IAppero`, percorsi relativi a `backend/`.

## 1. Contratto unificato (IMPLEMENTATO, additivo)

Campi storici di `UnifiedPrediction` invariati (`app/domain/models.py:175-186`): `id`, `sport`,
`event`, `prediction`, `probabilities`, `provider`, `oracle_score`, `generated_at`, `correct`,
`pricing`, `decision`. `FeedResponse.schema_version` resta `"1"` (`models.py:277`).

| Campo additivo | Contenuto | Riga | Commit |
|---|---|---|---|
| `model` | `name`, `version` | `models.py:91-99`, `:189` | `516241c` |
| `availability` | `status` = `available` / `limited` / `unavailable`, `reason` | `models.py:102-110`, `:190` | `516241c`, `4ee6e3d` |
| `data_freshness` | `predicted_at`, `event_data_updated_at`, `live_updated_at`, `odds_captured_at`, `timezone_explicit`; `null` = "non registrato", mai "fresco" | `models.py:113-123`, `:191` | `516241c`, `54a2b3d` |
| `provenance` | `engine`, `source`, `data_quality` (passato com'è), `decision_source` (`provider` / `bff_derived`), `decision_basis` (`provider_decision` / `provider_void_odds` / `raw_probability`) | `models.py:126-144`, `:192` | `516241c`, `229ea96`, `e507892` |
| `anomalies[]` | es. `probability_missing`, `decision_derived_by_bff`, `decision_from_raw_probability`, `naive_datetime`, `features_defaulted` | `app/providers/transparency.py:23-28`; `providers/tennis/mapper.py:603`; `providers/soccer/mapper.py:823` | `516241c`, `e507892`, `54a2b3d` |
| `event.unavailable_markets[]` | `{market, reason}` con il codice del motore, mai inventato | `models.py:41-47`, `:66` | `516241c`, `4ee6e3d` |
| `meta.is_stale`, `meta.snapshot_age_seconds` | feed servito dalla cache dopo un rebuild fallito; warning `served_from_stale_cache` | `models.py:259-267`; `app/services/feed_service.py:421`, `:435-436` | `516241c`, `84ffef1`, `80e2a81` |

**Retrocompatibilità (VERIFICATO).** Test `tests/unit/test_transparency_contract.py`:
`test_old_payload_without_new_fields_still_validates` (`:156`),
`test_feed_meta_without_new_fields_validates` (`:170`), chiavi storiche presenti (`:40`, `:54`).
L'app dichiara tutti i nuovi campi come opzionali (`mobile/types/api.ts:94-140`, `:212-213`) e non
mostra mai uno 0% al posto di una probabilità mancante (`mobile/utils/probability.ts`, `b9cdfbd`).

**Parità calcio/tennis (VERIFICATO).** `test_football_and_tennis_share_the_same_top_level_keys`
(`test_transparency_contract.py:69`), `test_decision_source_is_declared_for_both_engines` (`:98`),
`test_decision_basis_is_declared_for_both_engines` (`:108`).

**Modifica di valore (IMPLEMENTATO, `516241c`)**: per il calcio `provider.version` e
`model.version` valgono ora il `run_id` del motore (prima `None`): cambia il valore, non il tipo.

## 2. Chi decide PLAY / BORDERLINE / NO BET (VERIFICATO)

Misurato sul feed da fixture (`USE_PROVIDER_FIXTURES=true`, script in [TEST_REPORT.md](./TEST_REPORT.md)):

| Sport / mercato | `decision_source` | `decision_basis` |
|---|---|---|
| Calcio, tutti i mercati del feed (h2h, dc, goal_no_goal, under/over, cartellini) | `provider` | `provider_decision` |
| Tennis match winner | `bff_derived` | `raw_probability` |
| Tennis first_set_winner, over_under_games | `bff_derived` | `provider_void_odds` |

Ordine applicato dal BFF per il tennis (`providers/tennis/mapper.py:498-541`): etichetta del motore
→ `void_odds` del motore → 1/probabilità grezza; soglia invariata del 2% (`mapper.py:448`). Il caso
`raw_probability` può dare una decisione diversa da quella del motore (esempio PLAY vs NO BET in
[ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md), punto c; test `tests/unit/test_tennis_decision_basis.py:102`).

## 3. Allineamento campi motore → BFF (VERIFICATO, 17/11/2026)

### Calcio (`ia_predict_soccer` → `providers/soccer/mapper.py`)

| Campo del motore | Campo BFF | Stato |
|---|---|---|
| `markets_unavailable`, `markets_missing_reasons` | `event.unavailable_markets[]` (`mapper.py:403-404`) | allineato |
| `data_quality` della riga; `xg_available = false` | `provenance.data_quality`; `availability = limited` (`mapper.py:908-912`) | allineato |
| `predictions.<m>.computed_at` | `generated_at`, `data_freshness.predicted_at` (`mapper.py:904-905`) | allineato |
| `model_name`, `run_id` | `model.name`, `model.version`, `provider.version` (`mapper.py:897-901`, `:936`, `:942`) | allineato |
| `features_defaulted`, `features_defaulted_count` | `provenance` + anomalia `features_defaulted` (`mapper.py:823-835`, `:916`) | **IMPLEMENTATO** `54a2b3d` |
| `/live/fixtures` `rows[].captured_at` | `data_freshness.live_updated_at` (`mapper.py:231-232`, `:984-987`) | **IMPLEMENTATO** `54a2b3d` |
| istante delle quote, istante dei dati partita | `odds_captured_at`, `event_data_updated_at` | assenti a monte → `null` |
| `/dashboard/match/{id}/oracle-detail` (`overview.fixture`, `probabilities`) | letto come riga piatta: 0 predizioni (`mapper.py:957-960`) | **aperto**, PROPOSTA |
| `/dashboard/match/{id}` `decision_cards` al livello superiore | ignorate perché la riga ha `decision_cards: []` (`mapper.py:973`) | **aperto**, PROPOSTA |

### Tennis (`tennis_oracle` → `providers/tennis/mapper.py`)

| Campo del motore | Campo BFF | Stato |
|---|---|---|
| `model_name`, `model_version` | `model.*`, `provider.version` (`mapper.py:589-590`, `:623`, `:629`) | allineato |
| `predicted_at`, `imported_at`, `live_score_updated_at` | `data_freshness.predicted_at`, `event_data_updated_at`, `live_updated_at` (`mapper.py:632-634`) | allineato |
| `odds_captured_at` (additivo, `tennis_oracle@183c4f4`) | `data_freshness.odds_captured_at` (`mapper.py:635-636`) | allineato |
| `features_available`, `warnings` | `availability`, `anomalies` (`mapper.py:593-602`) | allineato |
| `data_quality` (additivo, `797e880`); `status` ≠ `sufficient` | `provenance.data_quality`; `availability = limited` (`mapper.py:547-557`, `:594-596`) | **IMPLEMENTATO** `4ee6e3d` |
| `prediction_warning` senza `prediction` | `event.unavailable_markets[match_winner]` (`mapper.py:388-393`) | **IMPLEMENTATO** `4ee6e3d` |
| `extra_markets[].void_odds` | base della decisione `provider_void_odds` (`mapper.py:541`) | allineato |
| `value_decision`, `void_odds` del match winner | letti se presenti (`mapper.py:524-526`) | **assenti a monte**, PROPOSTA |
| `predicted_winner_market_probability`, `extra_markets[].edge` | — | emessi dal motore, non letti dal BFF (grep: 0 righe) |

## 4. Campi additivi aggiunti dai motori (IMPLEMENTATO)

- Soccer: `markets_missing_reasons`, `data_quality`, `predictions[m].computed_at`,
  `features_defaulted(_count)`, `jobs[].partially_calls_api_sports`, `provider_status`,
  `provider_import_skipped` (dettaglio in [SOCCER_PROVIDER_AUDIT.md](./SOCCER_PROVIDER_AUDIT.md)).
- Tennis: `MatchPredictionRead.data_quality`, `NextFixtureWithPrediction.odds_captured_at`,
  contatori `odds_fetched` / `odds_empty` / `odds_fetch_errors` (dettaglio in
  [TENNIS_PROVIDER_AUDIT.md](./TENNIS_PROVIDER_AUDIT.md)).

Nessun campo esistente è stato rimosso o rinominato in nessuno dei tre repository.

## 5. Proposte

- **PROPOSTA**: il motore Tennis pubblica `value_decision` e `void_odds` del match winner; il BFF
  passa automaticamente a `provider_decision` / `provider_void_odds`. Cambia le decisioni mostrate.
- **PROPOSTA (attività separata)**: il BFF legge le due forme reali del dettaglio partita del calcio,
  con test costruiti dal codice del motore. Cambia ciò che il dettaglio mostra.
- **PROPOSTA**: catturare dal vivo (in staging, senza dati personali) una risposta di ogni endpoint
  dei motori usato dal BFF e usarla come fixture dei test di contratto: oggi le fixture sono scritte
  a mano e non hanno rilevato il punto precedente.
- **PROPOSTA**: decidere se mostrare nell'app `availability`, `provenance.decision_basis` e
  `meta.is_stale` (oggi l'app mostra solo il banner del feed stantio).
- **PROPOSTA**: aumentare `schema_version` solo alla prima modifica non additiva.
