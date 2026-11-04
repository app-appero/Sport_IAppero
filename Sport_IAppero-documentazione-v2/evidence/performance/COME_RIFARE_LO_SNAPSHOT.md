# Come rifare lo snapshot prestazioni (e cosa è cambiato dal 2026-11-02)

Baseline: `2026-11-02_snapshot_prestazioni.md` (stessa cartella). Da rifare tra 30-60 giorni e salvare come `AAAA-MM-GG_snapshot_prestazioni.md`.

## Date da tenere presenti
| Data | Evento |
|---|---|
| 2026-11-02 | Snapshot di partenza (decisioni con regola vecchia) |
| 2026-11-04 | Cambio regola in `main` di Soccer e Tennis (EV/PLAY su probabilità ridotta verso il mercato). Il deploy sui motori può essere successivo: **verificare la data reale del deploy su Railway e scriverla qui** |
| 2026-11-04 | Soccer: migrazione `b9c8d7e6f5a4` (colonne `p_adjusted`, `model_weight` nel ledger) |

Le predizioni pubblicate **prima** del deploy restano con la regola vecchia: nel confronto vanno separate da quelle nuove.

## Come separare vecchio e nuovo
- **Soccer** (`prediction_ledger`, cohort `official_paper`): `policy_version` = `decision_policy_v2_model_break_even` (vecchia) oppure `decision_policy_v3_market_blend` (nuova). Righe nuove hanno anche `p_adjusted` e `model_weight`; `p_model` è sempre la probabilità grezza.
- **Tennis** (`published_prediction`): non c'è un campo di versione della regola. Separare per data di pubblicazione (prima/dopo il deploy). `probability` è grezza; `void_odds` e `edge` delle righe nuove sono calcolati su `p_adj`.

## Regola nuova (provvisoria)
`p_adj = w × p_modello + (1 − w) × p_mercato_no_vig`. Pesi: Soccer 0,5 (tutti i mercati); Tennis vincitore partita 0,5, 1° set 0,75, Over/Under games 0,5. Senza probabilità di mercato: NO BET (Soccer: SENZA QUOTA se manca la quota).
I pesi vanno tarati per mercato fuori campione quando ci sono ≥300 casi chiusi per mercato.

## Messaggi da mandare alle sessioni remote (sola lettura)
Aprire una sessione Remote Control con accesso al DB (una per Soccer, una per Tennis). Se la sessione chiede conferma, rispondere direttamente da lì. Mai segreti o URL con credenziali nei messaggi.

**Soccer** (cohort `official_paper`, chiuse e regolate; escludere righe regolate senza esito):
1. Per mercato (under_over_1_5/2_5/3_5/4_5, goal_no_goal, cards, corners) e per decisione (PLAY/BORDERLINE/NO BET): n, hit rate, ROI a stake 1 con IC95% bootstrap (10.000), Brier, log-loss, più Brier/log-loss del base rate.
2. Stesso, separato per `policy_version` (v2 vs v3).
3. Calibrazione per fasce 50-60, 60-70, 70-80, 80+ (n≥100): probabilità media prevista vs frequenza osservata, usando `p_model` e `p_adjusted`.
4. Ultimi 30 giorni vs tutto il periodo.
5. Log-loss modello vs bookmaker (`p_market_fair`).
6. ROI per fascia di EV (<0, 0-2, 2-5, 5-10, 10-15, ≥15%) e cumulato.
7. Marcatori e cartellini giocatori: precision@k (1/3/5), hit rate.

**Tennis** (DB Oracle-Tennis, chiuse e regolate; no-vig dalle quote "opening", settlement come `settle_published_tips`):
1. Per mercato (match_winner, first_set_winner, over_under_games) e decisione: n, hit rate, ROI+IC95%, Brier, log-loss, base rate, baseline bookmaker.
2. Separato prima/dopo la data del deploy.
3. Spaccato per superficie, livello torneo, fascia di quota.
4. Calibrazione per fasce; ultimi 30 giorni vs tutto il periodo.
5. ROI per fascia di EV e di prob_edge.

In ogni tabella: periodo coperto e campioni n<100 segnalati; se manca una colonna dirlo, senza stimare.

## Come giudicare
- **Ha edge:** ROI > 0 con limite basso dell'IC95% > 0, n ≥ 300, e log-loss del modello < bookmaker.
- **Non ha edge:** ROI ≤ 0 oppure log-loss modello ≥ bookmaker.
- **Campione piccolo:** n < 100 (o < 300 per decidere su una soglia).

## Cosa confrontare con il 2 novembre
1. Numero di PLAY per mercato (atteso: calo) e ROI dei PLAY rimasti.
2. Scarto tra probabilità prevista e frequenza osservata nelle fasce alte (atteso: più piccolo con `p_adj`).
3. Log-loss di `p_adj` contro `p_model` e contro il bookmaker.
4. Mercati senza segnale dopo la riduzione: candidati a declassamento (PLAY → informativo).
5. Tennis vincitore partita: ancora fermo da fine agosto? Se ripreso, quanti casi.

## Limiti noti del 2 novembre
Periodi brevi (Soccer 7 settimane, n=530; Tennis vincitore partita 5 settimane, n=140), quasi tutte le celle sotto 100 casi. Il backtest dichiarava numeri molto migliori (es. Tennis vincitore 71,2% contro 44,2% in produzione): divario non ancora spiegato, da indagare prima di riaddestrare.
