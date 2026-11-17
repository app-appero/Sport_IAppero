# Audit tecnico della piattaforma — indice

**Sintesi per il titolare.** Audit dei tre repository di Sport IApperò (app + BFF, Soccer Oracle,
Tennis Oracle) chiuso il 17/11/2026. Le modifiche fatte sono additive e non cambiano le probabilità
pubblicate; restano aperti cinque punti che richiedono una tua decisione, il primo dei quali è
urgente (credenziali reali nella storia git del repository Soccer). L'elenco è in cima a
[ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) e [ROADMAP.md](./ROADMAP.md).

Questi documenti sostituiscono quelli scritti l'11/11/2026 (commit `516241c`), che riportavano
numeri superati, citavano log locali non più esistenti e contenevano voci non verificate.

## Come leggere le marcature

| Marcatura | Significato |
|---|---|
| **VERIFICATO** | letto nel codice (file:riga) o misurato (comando riportato) |
| **IMPLEMENTATO** | modifica fatta, con hash del commit e repository |
| **PROPOSTA** | non fatta: richiede una decisione del titolare |
| **BLOCCO** | non verificabile da questo ambiente (motivo dichiarato) |
| **NON ESEGUITO** | verifica non fatta di proposito (motivo dichiarato), solo in [TEST_REPORT.md](./TEST_REPORT.md) |

I percorsi sono relativi alla radice del repository indicato. Le date sono in formato italiano;
gli orari dei test sono in UTC come nei log (Europe/Rome = UTC+1 in novembre).

## Documenti

| File | Contenuto |
|---|---|
| [ARCHITECTURE_AUDIT.md](./ARCHITECTURE_AUDIT.md) | Punti critici aperti, architettura reale, componenti e rischi |
| [SOCCER_PROVIDER_AUDIT.md](./SOCCER_PROVIDER_AUDIT.md) | Soccer Oracle: provider, quota, serving, segreti nella storia |
| [TENNIS_PROVIDER_AUDIT.md](./TENNIS_PROVIDER_AUDIT.md) | Tennis Oracle: client API-Tennis, qualità dei dati, scostamento train/serve |
| [DATA_PROVIDER_MATRIX.md](./DATA_PROVIDER_MATRIX.md) | Matrice dei provider esterni |
| [ML_VALIDATION_REPORT.md](./ML_VALIDATION_REPORT.md) | Benchmark walk-forward Tennis e Soccer contro il mercato |
| [API_CONTRACT_REVIEW.md](./API_CONTRACT_REVIEW.md) | Contratto unificato del BFF e allineamento dei campi motore → BFF |
| [PERFORMANCE_COST_AUDIT.md](./PERFORMANCE_COST_AUDIT.md) | Uso misurato su Railway (7 giorni) e proposte; fatturazione non accessibile |
| [ROADMAP.md](./ROADMAP.md) | Prossimi passi ordinati per impatto, con rischio e dipendenze |
| [IMPLEMENTATION_LOG.md](./IMPLEMENTATION_LOG.md) | Commit dei tre branch rispetto a `main`, per tema |
| [TEST_REPORT.md](./TEST_REPORT.md) | Test main vs branch, benchmark rilanciati, cosa non è stato eseguito |

## Stato dei branch (VERIFICATO, 17/11/2026)

Comando: `git -C <repo> rev-list --count origin/main..HEAD` e `git -C <repo> log --oneline -1`.

| Repository | Branch | `main` | HEAD | Commit sopra `main` |
|---|---|---|---|---|
| Sport_IAppero | `cursor/platform-audit-evolution-e436` | `accd2b3` | `185d0d4` (prima di questi documenti) | 14 |
| ia_predict_soccer | `cursor/platform-audit-evolution-e436` | `18eebfe` | `bf8f3c4` | 18 |
| tennis_oracle | `cursor/platform-audit-evolution-e436` | `4bd7281` | `7f7b5ab` | 15 |

Nessun deploy, nessuna PR, nessun merge in `main`, nessuna chiamata ai provider a pagamento.

## Fonti primarie

- Il codice e la storia git dei tre repository (`git log`, `git show`).
- `tennis_oracle/docs/platform-audit/IMPLEMENTATION_LOG.md` e `TEST_REPORT.md` (17/11/2026).
- `ia_predict_soccer/docs/platform-audit/IMPLEMENTATION_LOG.md` e `TEST_REPORT.md` (17/11/2026).
- `tennis_oracle/backend/data/reports/benchmarks/match_winner_walk_forward_benchmark.{md,json}`
  (generato il 17/11/2026 alle 13:15 UTC).
- `ia_predict_soccer/backend/scripts/analysis/walk_forward_1x2_benchmark_result.json`
  (generato l'11/11/2026, riprodotto con 0 differenze il 17/11/2026).
- Metriche Railway di uso a 7 giorni lette il 15/11/2026 in sola lettura (vedi
  [PERFORMANCE_COST_AUDIT.md](./PERFORMANCE_COST_AUDIT.md)).

Nessun documento riporta valori di chiavi, password, token o host di database: solo nomi di
variabili e file:riga.
