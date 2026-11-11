# Tennis Oracle — Provider & Motore

## Provider esterni (VERIFICATO)

| Provider | Uso | Auth | Note |
|---|---|---|---|
| API-Tennis (`api.api-tennis.com`) | unico feed live (fixtures, odds, standings, players, events, tournaments) | `API_TENNIS_KEY` | 1× `get_odds` per match in import upcoming |
| Sackmann ATP (file locali) | solo ML offline | n/a | non nel checkout lean; ranking WTA storici assenti (sentinel 9999) |
| Telegram / Stripe / Resend | ops/pagamenti | token dedicati | non dati tennis |

## Interventi **IMPLEMENTATI**

1. Client `request_api.py`: retry con backoff+jitter su timeout/conn/429/5xx; circuit breaker; metriche outbound; sleep iniettabile.
2. Import next fixtures: errore provider ≠ assenza quote (conteggio in summary).
3. Inferenza: blocco `data_quality` additivo; policy feature mancanti (default preserva comportamento); freschezza quote in schema se disponibile.
4. Benchmark walk-forward offline + misura train/serve skew (report JSON in repo).

## Risultato skew (VERIFICATO, comando sotto)

Dataset con quote: 87 504 righe di test aggregate su 8 fold. Servire le enrichment ATP come zeri (come fa oggi l’inferenza) peggiora il log loss vs feature vere; addestrare senza quelle colonne è ≈ equivalente alle feature vere e meglio degli zeri.

**Raccomandazione (PROPOSTA, non attivata):** pubblicare un candidato v4 senza colonne ATP enrichment (età/altezza/mano/tourney_level/round/match_found) e calibrarlo; non sostituire l’artifact attuale senza approvazione.

Comando: `python -m backend.src.app.ml.benchmarks.match_winner_walk_forward`  
Report: `backend/data/reports/benchmarks/match_winner_walk_forward_benchmark.json`  
Seed 42. Generato 2026-11-11 ~15:26 Europe/Rome.
