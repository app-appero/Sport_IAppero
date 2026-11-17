# Rapporto dei test

**Sintesi per il titolare.** In tutti e tre i repository il branch passa tutti i test che passavano
su `main` e ne aggiunge di nuovi: BFF da 137 a 196, app da 88 a 92, Tennis da 778 a 872, Soccer da
1.358 a 1.481 superati. Nel Soccer 17 test falliscono già su `main` e falliscono identici sul branch.
Non sono stati fatti test contro i provider reali né contro i motori in produzione.

Tutti i test sono del 17/11/2026, orari in UTC come nei log (Europe/Rome = UTC+1). Nessuna rete
verso i provider: mock e fixture.

## 1. Suite complete: `main` contro branch

| Repo | Comando | `main` | Branch | Fonte |
|---|---|---|---|---|
| Sport_IAppero backend | `cd backend && USE_PROVIDER_FIXTURES=true python3 -m pytest -q -p no:cacheprovider` | `accd2b3`: **137 passed**, 0 failed, 9,33 s (13:56:54-13:57:05) | `185d0d4`: **196 passed**, 0 failed, 11,45 s (13:56:54-13:57:07) | **VERIFICATO** in questa fase, su copie estratte con `git archive` |
| Sport_IAppero backend, lint | `cd backend && ruff check --no-cache .` (ruff 0.16.9) | 3 errori | 3 errori, gli stessi: `app/api/v1/history.py:46` (E501), `app/persistence/history.py:278` (UP037), `tests/integration/test_history.py:258` (E501), file non toccati dal branch | **VERIFICATO** in questa fase |
| Sport_IAppero mobile | `cd mobile && npm run typecheck` | exit 0 | exit 0 | **VERIFICATO** in questa fase (13:57 UTC) |
| Sport_IAppero mobile | `cd mobile && npm test` (`node --test`) | **88 pass**, 0 fail | **92 pass**, 0 fail | **VERIFICATO** in questa fase |
| tennis_oracle | `OMP_NUM_THREADS=1 python3 -m pytest -q -p no:cacheprovider --no-cov -o addopts=""` (radice) | `4bd7281`: **778 passed**, 0 failed, 246,16 s (13:08-13:12) | `a25b162`: **872 passed**, 0 failed, 148,53 s (13:16-13:19); `7f7b5ab`: **872 passed**, 0 failed, 108,97 s (14:01:34-14:03:27) | **VERIFICATO**: `main` e `a25b162` dal TEST_REPORT Tennis; `7f7b5ab` rieseguito in questa fase su copia `git archive` |
| ia_predict_soccer | `cd backend && LOKY_MAX_CPU_COUNT=2 OMP_NUM_THREADS=2 timeout 7200 python3 -m pytest tests -q -p no:cacheprovider -o addopts=""` (avvio 13:03) | `18eebfe`: 1.375 raccolti, **1.358 passed**, **17 failed**, 2.388,82 s | `3d8ea22`: 1.498 raccolti, **1.481 passed**, **17 failed**, 2.404,52 s | **VERIFICATO** dal TEST_REPORT Soccer (non rieseguito qui, vedi sezione 6); stessi 17 falliti (confronto con `comm`); dopo `3d8ea22` il branch cambia solo file `.md` |

App mobile: nessun ESLint configurato (**VERIFICATO**: nessun file di configurazione in `mobile/`,
0 occorrenze di `eslint` in `mobile/package.json`).

## 2. I 17 test Soccer che falliscono già su `main` (VERIFICATO dal TEST_REPORT Soccer)

Preesistenti e non modificati; cause eterogenee, non corrette perché fuori perimetro.

| File | Test |
|---|---|
| `dashboard_service_test.py` (5) | `TestDashboardService::test_get_day_matches_from_api_feed`, `::test_get_day_matches_loads_snapshots_once_for_all_fixtures`, `::test_get_live_matches_filter`, `::test_get_match_detail_adds_correct_for_finished_match`, `::test_recompute_predictions_calls_predict_fixture_with_force_true` |
| `download_match_test.py` (6) | `TestDownloadMatch::test_download_import_matches_continue_on_fixture_error`, `::test_download_import_matches_insert_report`, `::test_download_import_matches_update_report`, `::test_snapshot_agganciati_all_id_restituito_dall_upsert`; `TestDownloadImportMatchesScoreWithoutStatistics::test_score_saved_even_when_statistics_endpoint_returns_nothing`; `TestDownloadImportMatchesLegaNonDisponibile::test_lega_non_disponibile_registrata_e_giro_continua` |
| `frontend_match_center_test.py` (1) | `test_mobile_view_keeps_void_odd_and_situation_visible` |
| `job_status_endpoint_test.py` (1) | `TestJobStatusEndpoint::test_get_job_returns_progress_summary` |
| `markets_endpoint_test.py` (1) | `TestMarketsEndpoint::test_excludes_markets_whose_production_is_archived` |
| `model_legend_endpoint_test.py` (2) | `TestModelLegendEndpoint::test_covers_over_signal_line_market_signal_and_generic_bucket`, `::test_reflects_real_production_state_per_market` |
| `model_paths_test.py` (1) | `TestDestinationSubdir::test_gli_altri_mercati_restano_nella_radice` |

Esempi di prime righe d'errore: `'h2h' not found in {}` (il test simula `registry.list_markets`, il
codice usa `list_active_markets`), `0 != 1` sui contatori di `download_import_matches`,
`401 != 404`. **PROPOSTA**: correggerli in un'attività separata.

## 3. Test aggiunti dai branch (IMPLEMENTATO)

| Repo | File di test nuovi o estesi |
|---|---|
| Sport_IAppero | `tests/unit/test_transparency_contract.py`, `test_http_resilience.py`, `test_tennis_decision_basis.py`, `test_soccer_engine_contract.py`, `test_tennis_engine_contract.py`; `tests/integration/test_feed_stale.py`, `test_admin.py`; `mobile/tests/probability.test.ts` |
| tennis_oracle | `backend/tests/test_request_api_resilience.py`, `test_next_fixtures_odds_status.py`, `test_predictor_missing_features.py`, `test_prediction_freshness_fields.py`, `test_prediction_data_quality_read.py`, `test_match_winner_benchmark.py` |
| ia_predict_soccer | `quota_pause_test.py`, `scheduler_test.py`, `settlement_service_test.py`, `api_sports_provider_test.py`, `resilience_test.py`, `request_api_odds_test.py`, `serving_transparency_test.py`, `tests/analysis/walk_forward_1x2_benchmark_test.py` |

I test dei contratti motore → BFF usano payload costruiti dal codice dei motori, non risposte
catturate dal vivo.

## 4. Benchmark rilanciati (VERIFICATO)

| Benchmark | Comando | Esecuzione | Esito | Fonte |
|---|---|---|---|---|
| Tennis match winner | `python -m backend.src.app.ml.benchmarks.match_winner_walk_forward` (`OMP_NUM_THREADS=2`) | 17/11/2026, 13:08:37-13:15:14 UTC | exit 0; report `.json` e `.md` generati alle 13:15:05 UTC e committati (`a25b162`) | TEST_REPORT Tennis; intestazione del `.md` |
| Soccer 1X2 top 5 | `python scripts/analysis/walk_forward_1x2_benchmark.py --output <file temporaneo>` (da `backend`) | 17/11/2026, 2.541,5 s | **0 differenze** con `walk_forward_1x2_benchmark_result.json` committato, esclusi `generated_at`, `elapsed_seconds`, `environment` | TEST_REPORT Soccer |

Numeri dei benchmark in [ML_VALIDATION_REPORT.md](./ML_VALIDATION_REPORT.md); i valori della
tabella 1X2 sono stati ricontrollati sul JSON con `python3 -I`.

## 5. Verifiche puntuali fatte in questa fase (VERIFICATO)

- **Base delle decisioni sul feed da fixture.** Script con `fastapi.testclient.TestClient` su
  `GET /api/v1/feed?sports=football|tennis&limit=50`, `USE_PROVIDER_FIXTURES=true`, conteggio di
  `provenance.decision_source` / `decision_basis` per mercato: calcio 10 mercati × 2 predizioni,
  tutti `provider` / `provider_decision`; tennis match_winner 3 × `bff_derived` / `raw_probability`;
  first_set_winner e over_under_games 1 ciascuno `bff_derived` / `provider_void_odds`.
- **Esempio PLAY vs NO BET.** `python3 -c "v=1/0.74; print(v, v*1.02); p=0.5*0.74+0.5*0.55; print(p, 1/p)"`
  → 1,3514 / 1,3784; 0,645 / 1,5504.
- **Hash dei branch** con `git -C <repo> log --oneline origin/main..HEAD` (14, 18, 15 commit) e
  file:riga citati nei documenti (controllati a campione con `sed -n`/`grep -n` sui tre repository).
- **Credenziali nella storia Soccer**: solo nomi e lunghezze (vedi
  [SOCCER_PROVIDER_AUDIT.md](./SOCCER_PROVIDER_AUDIT.md), sezione 1).

## 6. Cosa non è stato eseguito

| Verifica | Stato | Motivo |
|---|---|---|
| Chiamate reali ai provider (API-Sports, The Odds API, RapidAPI/FotMob, API-Tennis) | **NON ESEGUITO** | consumano quota a pagamento e richiedono chiavi di produzione; fuori dal perimetro dell'audit (tutto con mock; `tennis_oracle/backend/tests/conftest.py` blocca l'HTTP verso API-Tennis) |
| Deploy su Railway | **NON ESEGUITO** | richiede una decisione del titolare; nessuna PR né merge |
| Test end-to-end BFF → motori reali | **NON ESEGUITO** | nessun ambiente di staging né credenziali dei motori in questa sessione; i motori su Railway non sono stati chiamati |
| Payload catturati dal vivo per i test di contratto | **NON ESEGUITO** | stesso motivo; per questo il divario del dettaglio partita calcio è emerso solo leggendo il codice |
| Suite Soccer rieseguita in questa fase | **NON ESEGUITO** | circa 40 minuti per esecuzione; numeri presi dal TEST_REPORT Soccer dello stesso giorno, con comando e commit |
| Stati intermedi BFF (145 a `516241c`, 165 a `b9cdfbd`) e Tennis 842 dell'11/11 | **NON ESEGUITO** | dichiarati da sessioni precedenti, non riverificati; non servono al confronto `main` / branch |
| Latenza di `PREDICTION_DATA_QUALITY_HISTORY_ENABLED=true` sul DB di produzione | **NON ESEGUITO** | nessun accesso al DB |

## 7. Divergenze fra le fonti (VERIFICATO)

- Tennis, ultimo commit: il TEST_REPORT Tennis documenta 872 passed a `a25b162`; il resoconto
  dell'agente dichiarava 872 a `7f7b5ab` in 154 s. Rieseguito qui a `7f7b5ab`: 872 passed in
  108,97 s (la durata dipende dal carico della macchina).
- I documenti dell'11/11 dichiaravano Tennis 842, Soccer 1.420 e BFF 145 superati sul branch di
  allora: superati dai numeri sopra.
- Soccer, dettaglio partita: il file di sintesi degli agenti citava `dashboard_service.py:2251-2260`;
  le righe verificate sono `:1536`, `:1787` (riga `fixture` con `decision_cards: []`) e `:2266-2287`
  (decision card al livello superiore).
- Dump Soccer: i documenti dell'11/11 dicevano "~425 MB"; misurato `du -sb` = 434.438.069 byte.
- `config.env.example` Soccer: i documenti dell'11/11 dichiaravano "password dall'aspetto reale
  sostituita"; su `main` il valore era già `CHANGE_ME`. Il problema reale è la storia git.
- Railway: i documenti dell'11/11 dichiaravano metriche non accessibili; le metriche di uso sono
  state lette il 15/11/2026 (la fatturazione resta un **BLOCCO**).
