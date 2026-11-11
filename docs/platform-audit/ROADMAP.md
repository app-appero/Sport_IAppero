# Roadmap

Ordinata per impatto su qualità predittiva / affidabilità dati, poi costo.

## Fatto in questo branch (IMPLEMENTATO)

1. Resilienza HTTP Tennis + Soccer (retry/backoff/CB).
2. Pausa quota Soccer nello scheduler + settlement locale a quota esaurita.
3. Trasparenza predizioni Soccer (`markets_missing_reasons`, `data_quality`, `computed_at`).
4. Benchmark offline Tennis match-winner + Soccer top-5 1X2/OU/BTTS.
5. Contratto BFF additivo (model/availability/freshness/provenance/anomalies, feed `is_stale`).
6. Retry GET BFF + invalidazione cache dopo refresh admin.
7. Documentazione di audit (questa cartella).

## Prossimi passi (PROPOSTA — richiedono approvazione)

| Priorità | Azione | Rischio | Dipendenza |
|---|---|---|---|
| P0 | Attivare candidato Tennis senza enrichment ATP (o missing coerente) + calibrazione voting_ensemble | cambia probabilità live | approvazione owner |
| P0 | Esporre `odds_updated_at` end-to-end Tennis (DB→API→BFF) | basso se additivo | migration non distruttiva |
| P1 | Soccer: expert Elo/Dixon-Coles in consensus (non sostituto) | basso | codice expert |
| P1 | Soccer: missingness xG in pipeline + retrain | medio | retrain + promozione registry |
| P1 | Unificare h2h/dc con 1x2 multiclasse in serving | medio | coerenza UX |
| P2 | Disabilitare overlap `data_future_sync` vs daily_refresh | basso | config |
| P2 | Rimuovere dump DB dalla history git | operativo | approvazione + rewrite history |
| P2 | Metriche Railway / budget alert | — | accesso dashboard |
| P3 | Ranking WTA storici | dati | fonte autorizzata |
| P3 | Closing odds Tennis job on | costo API | approvazione |

## Non fare senza evidenza
- Ensemble calcio+tennis nel BFF.
- Nuovi mercati senza copertura/accuratezza.
- Nuovi provider a pagamento automatici.
- Scraping contro ToS.
