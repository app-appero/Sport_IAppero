# Test Report

Orari in Europe/Rome. Comandi eseguiti su questa VM.

## Baseline → dopo

| Repo | Comando | Prima | Dopo |
|---|---|---|---|
| tennis_oracle | `pytest -q -p no:cacheprovider --no-cov` (root) | 778 passed | **842 passed** (EXIT 0) — log `/tmp/work/tennis_after.log` |
| ia_predict_soccer | `pytest tests -q` (backend) | 17 failed, 1358 passed | **17 failed, 1420 passed** — stessi 17 preesistenti; +62 test nuovi — `/tmp/work/soccer_baseline_final.log`, `/tmp/work/soccer_after.log` |
| Sport_IAppero backend | `USE_PROVIDER_FIXTURES=true pytest -q` | 137 passed | **145 passed** |
| Sport_IAppero ruff (file toccati) | `ruff check …` | 3 errori preesistenti altrove | file nuovi/toccati: **All checks passed** |
| Sport_IAppero mobile | `npm run typecheck` | n/a | OK |
| Sport_IAppero mobile | `npm test` | n/a | **88 passed** |

## Test mirati aggiunti

- Tennis: `test_request_api_resilience`, `test_predictor_missing_features`, `test_match_winner_benchmark`, freschezza, odds status.
- Soccer: `api_sports_provider` CB/retry, scheduler quota sync, settlement skip import, odds timeout, serving transparency, walk_forward unit.
- BFF: `test_transparency_contract`, `test_http_resilience`.

## Benchmark

- Tennis: EXIT 0, report JSON commitato (~13k linee summary incluso).
- Soccer: EXIT 0, `walk_forward_1x2_benchmark_result.json` commitato.

## Non eseguito / blocchi
- Chiamate live ai provider a pagamento: non fatte.
- Deploy Railway / e2e su backend remoti autenticati: non fatti.
- Restore completo dump Postgres soccer in CI: non necessario ai test unitari.
