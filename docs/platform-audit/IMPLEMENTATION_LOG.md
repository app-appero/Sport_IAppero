# Implementation Log

Sessione 11 novembre 2026 (Europe/Rome). Branch comuni: `cursor/platform-audit-evolution-e436`.

## Tennis Oracle — IMPLEMENTATO

| Problema | Soluzione | File principali |
|---|---|---|
| Client fragile | retry/backoff/jitter + circuit breaker + metriche | `backend/src/utility/request_api.py`, `resilience.py` |
| Errore odds = no odds | status distinto in import | `import_next_fixtures.py` |
| Feature mancanti / qualità | policy + `data_quality` additivo | `predictor.py`, `data_sufficiency.py`, schemas |
| Mancanza di misura | walk-forward offline + skew | `ml/benchmarks/match_winner_walk_forward.py`, report JSON |
| Docs env | variabili opzionali documentate | `.env.staging.example`, `config.env.example` |

Commit (hash soggetti a `git log`): 5 commit sul branch, push eseguito.

## Soccer Oracle — IMPLEMENTATO

| Problema | Soluzione | File principali |
|---|---|---|
| Pausa quota non in scheduler | `_sync_quota_pause_if_needed` | `scheduler.py`, `job_settings.py` |
| Settlement consuma quota | skip import se esaurita | `settlement_service.py` |
| HTTP fragile | resilience condivisa + Odds timeout | `api_sports_provider.py`, `request_api.py`, `resilience.py` |
| Trasparenza | motivi mercati + data_quality + computed_at | `dashboard_service.py`, `prediction_snapshot_service.py` |
| Validazione | benchmark top-5 | `walk_forward_1x2_benchmark.py` + result JSON + csv.gz |
| Hygiene | placeholder password example | `config.env.example` |

1 commit aggregato, push eseguito.

## Sport IApperò — IMPLEMENTATO

| Problema | Soluzione | File principali |
|---|---|---|
| Contratto incompleto | campi additivi + helper shared | `domain/models.py`, `providers/transparency.py`, mappers |
| Feed stantio silenzioso | `is_stale` + age + warning | `feed_service.py`, `cache.py` |
| Cache post-refresh | `invalidate_feed_cache` | `admin.py` |
| HTTP BFF | retry GET + circuit breaker | `http_utils.py`, `config.py` |
| Mobile | tipi + niente 0% fittizio + banner stale | `types/api.ts`, `MarketBoard`, `FeedBanner`, prediction detail |

## Rischi residui
- Tennis: modello live ancora con skew enrichment finché non si attiva un candidato.
- Soccer: 17 test preesistenti falliscono (invariati prima/dopo).
- ManagePullRequest non disponibile in sessione: PR da aprire a mano dai link GitHub.
- Metriche Railway assenti.
