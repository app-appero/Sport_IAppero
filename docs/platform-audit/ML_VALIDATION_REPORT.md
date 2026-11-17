# Validazione dei modelli — benchmark walk-forward contro il mercato

**Sintesi per il titolare.** Abbiamo misurato i modelli su anni di partite passate, simulando ogni
volta di non conoscere il futuro. Nel tennis i modelli con le quote superano il mercato di pochi
millesimi, su quote storiche che sono probabilmente quelle di chiusura: il vantaggio potrebbe non
esistere in produzione. Nel calcio nessun modello batte il mercato. Il modello tennis in produzione,
così come viene servito oggi, è peggiore del mercato.

Tutti i numeri sono letti dai report committati, citati sotto; metrica principale: log loss (più
basso = meglio). Δ = modello − mercato senza margine; IC95 da bootstrap appaiato.

## Tennis — vincitore partita (VERIFICATO)

- Report: `tennis_oracle/backend/data/reports/benchmarks/match_winner_walk_forward_benchmark.{md,json}`,
  generato il 17/11/2026 alle 13:15 UTC (seed 42, 1000 ricampionamenti) con
  `python -m backend.src.app.ml.benchmarks.match_winner_walk_forward`.
- Dataset `backend/data/processed/tennis_winner_dataset_with_odds_v3.csv.gz`: 338.564 righe
  (05/02/1990..21/06/2026), 99.982 con quote valide (07/10/2021..21/06/2026), target medio 0,5112.
- Protocollo: 8 fold trimestrali con finestra espandibile (2023Q3, 2024Q4, 2025Q1..2026Q2),
  addestramento solo su date precedenti, 87.504 righe di test per ogni modello. Elo ricalcolato in
  ordine di data; colonne post-partita escluse.
- **IMPLEMENTATO** (`tennis_oracle@180f653`): corretto un difetto del benchmark, l'etichetta del
  circuito inferito usava righe successive al fold.

| Modello | Log loss | Brier | ECE | Accuratezza | Δ log loss [IC95] | Fold migliori del mercato |
|---|---|---|---|---|---|---|
| `v4_like__enrichment_as_missing` | 0,55666 | 0,18922 | 0,0054 | 0,7072 | −0,00241 [−0,00284, −0,00196] | 7/8 |
| `v4_like__trained_without_enrichment` | 0,55669 | 0,18924 | 0,0049 | 0,7074 | −0,00238 [−0,00281, −0,00191] | 7/8 |
| `v4_like__true_features` | 0,55677 | 0,18927 | 0,0050 | 0,7068 | −0,00230 [−0,00275, −0,00184] | 6/8 |
| `xgb_with_odds` | 0,55704 | 0,18943 | 0,0056 | 0,7071 | −0,00202 [−0,00248, −0,00153] | 8/8 |
| `market_logit_recalibrated` | 0,55720 | 0,18928 | 0,0084 | 0,7077 | −0,00186 [−0,00222, −0,00151] | 7/8 |
| `lr_with_odds` | 0,55771 | 0,18960 | 0,0082 | 0,7066 | −0,00135 [−0,00183, −0,00082] | 7/8 |
| `hgb_with_odds` | 0,55820 | 0,18984 | 0,0053 | 0,7057 | −0,00086 [−0,00147, −0,00026] | 6/8 |
| **`market_no_vig`** (riferimento) | 0,55906 | 0,18969 | 0,0181 | 0,7075 | — | — |
| `v4_like__serving_enrichment_zeros` (come serve oggi) | 0,56300 | 0,19190 | 0,0370 | 0,7013 | +0,00394 [+0,00326, +0,00465] | 1/8 |
| `v4_like__serving_enrichment_zeros_and_rank_fallback` | 0,56308 | 0,19192 | 0,0371 | 0,7010 | +0,00402 [+0,00336, +0,00474] | 1/8 |
| `lr_no_odds` | 0,58357 | 0,20014 | 0,0041 | 0,6858 | +0,02451 [+0,02301, +0,02613] | 1/8 |
| `hgb_no_odds` | 0,58403 | 0,20026 | 0,0053 | 0,6861 | +0,02496 [+0,02344, +0,02651] | 1/8 |
| `elo_overall_dynamic` | 0,59151 | 0,20351 | 0,0058 | 0,6790 | +0,03244 [+0,03074, +0,03412] | 1/8 |
| `elo_overall_k32` | 0,60284 | 0,20817 | 0,0200 | 0,6700 | +0,04378 [+0,04206, +0,04547] | 0/8 |
| `elo_surface_k32` | 0,62553 | 0,21823 | 0,0152 | 0,6439 | +0,06647 [+0,06431, +0,06855] | 0/8 |

`v4_like__*` = stessi algoritmi e 38 feature dell'artefatto v4, riaddestrati in ogni fold (non è
l'artefatto di produzione). Tabella completa e segmenti nel `.md` del report.

**Avvertenze (VERIFICATO nel report).** Le quote del dataset sono la media dei bookmaker dello
snapshot salvato, senza istante di cattura: presumibilmente quote di chiusura, non verificabile
offline. In produzione il modello vede quote precedenti, quindi i modelli basati sul mercato sono
probabilmente più informati nel benchmark che in produzione. Il vantaggio (al massimo 2,4 millesimi
di log loss) è piccolo e potrebbe non trasferirsi.

### Scostamento train/serve (VERIFICATO)

| Confronto (stesso modello per fold) | Δ log loss [IC95] | Δ Brier [IC95] | Accuratezza | Invertiti | Fold peggiori |
|---|---|---|---|---|---|
| serving con 0 vs feature reali | +0,00624 [+0,00551, +0,00696] | +0,00263 [+0,00233, +0,00293] | 0,7013 vs 0,7068 | 7,97% | 8/8 |
| serving con 0 + ranking assente vs feature reali | +0,00632 [+0,00558, +0,00704] | +0,00266 [+0,00234, +0,00297] | 0,7010 vs 0,7068 | 8,06% | 8/8 |
| colonne dichiarate mancanti vs feature reali | −0,00011 [−0,00023, +0,00001] | −0,00005 [−0,00010, −0,00000] | 0,7072 vs 0,7068 | 0,27% | 0/8 |

Artefatto di produzione v4, **in-sample** (66.633 righe dal 01/01/2025, contano solo le differenze):

| Variante | Log loss | Brier | ECE | Accuratezza | Probabilità media |
|---|---|---|---|---|---|
| valori del dataset | 0,55268 | 0,18790 | 0,0060 | 0,7084 | 0,5102 |
| riempimento con 0 (serving attuale) | 0,55527 | 0,18888 | 0,0252 | 0,7071 | 0,4925 |
| colonne dichiarate mancanti | 0,55268 | 0,18790 | 0,0060 | 0,7084 | 0,5102 |
| mercato senza margine | 0,56009 | 0,19011 | 0,0179 | 0,7070 | 0,512 |

Target medio 0,5121. Il riempimento con 0 sposta la probabilità media verso il secondo giocatore e
peggiora la calibrazione (ECE da 0,0060 a 0,0252).

**Riproducibilità (VERIFICATO, fonte TEST_REPORT Tennis)**: il codice di `5515aec` rilanciato il
17/11/2026 riproduce il JSON dell'11/11 (8.708 valori, unica differenza l'indentazione di una
docstring).

## Soccer — 1X2 top 5 campionati (VERIFICATO)

- Report: `ia_predict_soccer/backend/scripts/analysis/walk_forward_1x2_benchmark_result.json`
  (generato l'11/11/2026; rilanciato il 17/11/2026 con
  `python scripts/analysis/walk_forward_1x2_benchmark.py --output <file>`: **0 differenze** esclusi
  `generated_at`, `elapsed_seconds`, `environment`).
- Dati: 19.682 partite concluse dal 01/01/2015 al 26/05/2026 (Premier League, La Liga, Serie A,
  Bundesliga, Ligue 1), 9.918 con quote 1X2 dal 11/06/2020.
- Protocollo: 20 fold trimestrali dal 2021Q3 al 2026Q2; Elo, Poisson e Dixon-Coles con sole
  partite precedenti; iperparametri scelti solo su 01/07/2018..01/07/2021.

| Modello (n = 8.118) | Log loss | Brier | Accuratezza | Δ log loss [IC95] | Fold migliori del mercato |
|---|---|---|---|---|---|
| `market_recalibrated` | 0,97388 | 0,57960 | 0,5346 | −0,00021 [−0,00144, +0,00105] | 11/20 |
| **`market_no_vig`** (riferimento) | 0,97408 | 0,57968 | 0,5350 | — | — |
| `rf_with_odds` | 0,97934 | 0,58253 | 0,5312 | +0,00525 [+0,00256, +0,00793] | 5/20 |
| `lr_with_odds` | 0,98054 | 0,58384 | 0,5297 | +0,00646 [+0,00389, +0,00912] | 5/20 |
| `lr_no_odds` | 0,98659 | 0,58814 | 0,5227 | +0,01251 [+0,00924, +0,01593] | 0/20 |
| `elo_multinomial` | 0,98859 | 0,58939 | 0,5241 | +0,01451 [+0,01097, +0,01784] | 0/20 |
| `dixon_coles` | 0,98950 | 0,59011 | 0,5228 | +0,01542 [+0,01169, +0,01918] | 0/20 |
| `poisson_independent` | 0,99039 | 0,59055 | 0,5228 | +0,01630 [+0,01286, +0,01954] | 0/20 |
| `hgb_with_odds` | 1,00319 | 0,59655 | 0,5191 | +0,02911 [+0,02367, +0,03524] | 1/20 |
| `base_rate` | 1,07390 | 0,64983 | 0,4350 | +0,09982 [+0,09212, +0,10733] | 0/20 |

Valori controllati sul JSON con `python3 -I` (sezione `results.1x2_on_quoted_test_matches`).

Mercati binari (fonte TEST_REPORT Soccer): Over 2.5 contro il mercato (solo quote API-Sports,
n = 1.708) mercato 0,67407, miglior modello `lr_no_odds` 0,68269 (+0,00862); Goal/No Goal contro il
mercato (n = 746) nessuna differenza significativa.

**Avvertenze (VERIFICATO nel report Soccer).** Una sola rilevazione di quote per partita, istante
non registrato: 6.410 partite di test hanno quote da The Odds API, 1.708 da API-Sports. Il codice
di import storico interroga snapshot nei giorni 1, 11 e 21 del mese
(`backend/src/service_ia/pre_processing/df_odds_service.py:67-91`): il mercato di riferimento è
probabilmente più debole della chiusura, e ciò nonostante nessun modello lo batte.

## Indizi sul serving (VERIFICATO)

| Motore | Indizio | Riferimento |
|---|---|---|
| Tennis | calibrazione non applicata in inferenza; l'artefatto v4 non contiene calibratori | `predictor.py:582-583`, `:653`, `:661` |
| Tennis | il motore riduce la probabilità verso il mercato solo per EV/PLAY (w = 0,5 match winner) | `services/single_match_value.py:54-59` |
| Tennis | nessuna astensione per giocatori senza storico (ora `data_quality.status = limited`) | `predictor.py:522`, `:544` |
| Soccer | nessun Elo né Dixon-Coles nel serving | grep su `backend/src`: 0 righe |
| Soccer | h2h, doppia chance e 1X2 non riconciliati nel dettaglio partita | `dashboard_service.py:899-934`, `:1652-1687` |
| Soccer | xG mai rilevato trattato come 0 (45,5% delle righe dell'export `h2h_raw.csv`) | messaggio del commit `1b08cf4` |

## Conclusioni

- **PROPOSTA**: non sostituire i modelli in produzione sulla base di questi benchmark; nessun
  candidato batte il mercato in modo rilevante.
- **PROPOSTA (Tennis, decisione del titolare)**: eliminare lo scostamento train/serve (riaddestrare
  senza arricchimento ATP o policy `impute`): nel benchmark porta il modello da peggiore a
  leggermente migliore del mercato, ma cambia le probabilità pubblicate.
- **PROPOSTA**: prima di dichiarare un vantaggio sul mercato, registrare l'istante di cattura delle
  quote e ripetere i benchmark su quote dello stesso momento in cui il modello pubblica.
- **PROPOSTA (Soccer)**: Elo e Dixon-Coles possono servire come baseline o "esperti" di supporto,
  non come sostituti (peggiori del mercato in 20 fold su 20).
