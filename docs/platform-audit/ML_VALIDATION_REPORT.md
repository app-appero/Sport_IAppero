# ML Validation Report

Tutti i numeri sotto derivano da comandi eseguiti in questa sessione (o sono citati come report preesistenti del repo). Nessun guadagno inventato.

## Tennis — match winner walk-forward (IMPLEMENTATO)

- Comando: `~/venvs/tennis/bin/python -m backend.src.app.ml.benchmarks.match_winner_walk_forward`
- Report: `tennis_oracle/backend/data/reports/benchmarks/match_winner_walk_forward_benchmark.json`
- Seed 42; n test aggregato = **87 504** (righe con quote, fold trimestrali).
- Headline (log loss ↓ meglio):

| Contender | log_loss | Brier | accuracy | Δll vs market |
|---|---:|---:|---:|---:|
| v4_like enrichment_as_missing | 0.55666 | 0.18922 | 0.7072 | −0.00241 |
| v4_like trained_without_enrichment | 0.55669 | 0.18924 | 0.7074 | −0.00238 |
| v4_like true_features | 0.55677 | 0.18927 | 0.7068 | −0.00230 |
| market_no_vig | 0.55906 | 0.18969 | 0.7075 | 0 |
| v4_like **serving zeros** (bug attuale) | 0.56300 | 0.19190 | 0.7013 | +0.00394 |
| elo_overall_k32 | 0.60284 | 0.20817 | 0.6700 | +0.04378 |
| rank_logit | 0.66470 | 0.23531 | 0.5867 | +0.10564 |

Skew sull’artifact di produzione (in-sample, dichiarato tale): serving zeros vs dataset_values → mean |Δp| ≈ 0.021, pick flip ≈ 3.4%.

**Conclusione:** non sostituire il modello live; candidare un training senza enrichment ATP (o trattarle come missing coerente). Il mercato no-vig resta vicino; i modelli senza quote restano peggiori.

Report preesistente repo `walk_forward_latest.json` (2026-08-22): voting ≈ market_no_vig — coerente con quanto sopra.

## Soccer — 1X2 / O/U / BTTS top-5 (IMPLEMENTATO offline)

- Comando: `python scripts/analysis/walk_forward_1x2_benchmark.py` (cwd `backend`)
- Dataset: `scripts/analysis/_export/top5_matches_for_benchmark.csv.gz` — 19 682 match, 2015→2026-05, quote h2h su 9 918.
- Report: `scripts/analysis/walk_forward_1x2_benchmark_result.json` (seed 42, ~181 s).

### 1X2 su match quotati (n=8118)

| Contender | log_loss | Brier | accuracy |
|---|---:|---:|---:|
| market_recalibrated | 0.97388 | 0.57960 | 0.5346 |
| market_no_vig | 0.97408 | 0.57968 | 0.5350 |
| rf_with_odds | 0.97934 | 0.58253 | 0.5312 |
| lr_with_odds | 0.98054 | 0.58384 | 0.5297 |
| elo_multinomial (k15_hfa40_gd) | 0.98859 | 0.58939 | 0.5241 |
| dixon_coles | 0.98950 | 0.59011 | 0.5228 |
| poisson_independent | 0.99039 | 0.59055 | 0.5228 |
| base_rate | 1.07390 | 0.64983 | 0.4350 |

### Over 2.5 vs mercato API-Sports (n=1708)

`market_no_vig` 0.674 ll batte Poisson/DC/LR/RF.

### BTTS vs mercato two-sided (n=746, campione piccolo)

`hgb_no_odds` 0.689 ≈ `market_no_vig` 0.690 — campione troppo piccolo per promuovere.

**Conclusione:** **mantenere** i modelli/produzione attuali e il blend verso mercato; Elo/Dixon-Coles utili come expert/baseline, non come sostituto. Non adottare HGB-with-odds sul 1X2 (peggiora).
