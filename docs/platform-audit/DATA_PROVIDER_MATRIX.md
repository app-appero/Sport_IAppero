# Matrice dei provider di dati

**Sintesi per il titolare.** Ogni motore dipende da un solo provider a pagamento per i dati in tempo
reale (API-Sports per il calcio, API-Tennis per il tennis): non esiste un provider di riserva. Le
quote storiche usate per misurare i modelli non hanno l'istante di cattura. Costi, piani e licenze
dei provider non sono stati verificati in questo audit.

Nessuna chiamata ai provider è stata fatta durante l'audit: tutto è stato letto nel codice o
provato con mock e fixture.

## Matrice

Ogni riga è **VERIFICATO** nel codice (riferimenti file:riga nei documenti per motore); le colonne
"Resilienza" e "Costi / licenza" portano la propria marcatura.

| Provider | Motore | Dati | Uso | Chiave (nome variabile) | Resilienza dopo l'audit | Freschezza esposta al BFF | Costi / licenza |
|---|---|---|---|---|---|---|---|
| API-Sports | Soccer | partite, statistiche, xG, quote, formazioni, giocatori | runtime, job dello scheduler (6 job su 16 consumano quota) | `API_SPORTS_KEY` | **IMPLEMENTATO** retry, backoff, breaker, pausa a quota esaurita (`ia_predict_soccer@226d03c`, `fc0444d`) | `predictions[m].computed_at`, `data_quality` per riga; nessun istante delle quote né dei dati partita | **BLOCCO**: piano non verificabile da qui |
| The Odds API | Soccer | quote storiche | solo script offline (**VERIFICATO**: nessun job né rotta la usa) | `API_ODDS_KEY` | **IMPLEMENTATO** timeout 30 s, chiave mascherata (`39d7cf2`, `4196864`) | non esposta | **BLOCCO** |
| FotMob via RapidAPI | Soccer | formazioni probabili | job giornaliero attivo di default, best-effort | `RAPIDAPI_KEY` | invariata | non letta dal BFF | **BLOCCO**: wrapper di terze parti, condizioni d'uso non verificate |
| API-Tennis | Tennis | partite, quote (una `get_odds` per partita), classifiche, giocatori | runtime, import e aggiornamento globale | `API_TENNIS_KEY`, `API_TENNIS_BASE` | **IMPLEMENTATO** retry, backoff, breaker, budget per chiamata, chiave tolta dai log (`tennis_oracle@8d9ca20`, `5515aec`, `2da4346`) | `predicted_at`, `imported_at`, `live_score_updated_at`, `odds_captured_at` (additivo, `183c4f4`), `data_quality` | **BLOCCO** |
| File Sackmann ATP | Tennis | ranking e partite ATP storiche | solo costruzione del dataset di addestramento | — | — | non applicabile; in serving le colonne derivate valgono 0 (vedi [TENNIS_PROVIDER_AUDIT.md](./TENNIS_PROVIDER_AUDIT.md)) | **BLOCCO**: licenza per uso commerciale non verificata |
| Telegram, Stripe, Resend | Tennis; Telegram e Stripe anche Soccer (`ia_predict_soccer/backend/src/service_ia/bot_telegram/start_bot.py`) | notifiche, pagamenti, email | operativo, non dati sportivi | token dedicati | — | — | **BLOCCO** |

Riferimenti: [SOCCER_PROVIDER_AUDIT.md](./SOCCER_PROVIDER_AUDIT.md) sezioni 2-3,
[TENNIS_PROVIDER_AUDIT.md](./TENNIS_PROVIDER_AUDIT.md) sezioni 1-2.

## Regole adottate (IMPLEMENTATO)

- Provider giù: i motori non inventano dati. Il BFF può servire l'ultimo feed in cache fino a 300 s,
  sempre marcato `meta.is_stale = true` con il warning `served_from_stale_cache`
  (`Sport_IAppero@84ffef1`, `80e2a81`); oltre risponde 503.
- Un istante mancante resta `null` ("non registrato"), mai "fresco" (`Sport_IAppero/backend/app/domain/models.py:113-123`).

## Proposte

- **PROPOSTA**: registrare l'istante di cattura delle quote in entrambi i motori anche nei dati
  storici, così che i benchmark contro il mercato siano confrontabili con la produzione.
- **PROPOSTA**: verificare piani, limiti e licenze di API-Sports, API-Tennis, RapidAPI/FotMob e dei
  file Sackmann prima di qualsiasi uso commerciale o nuovo mercato.
- **PROPOSTA**: valutare un secondo provider solo dopo aver misurato i periodi di indisponibilità
  reali (oggi non misurati: le metriche del client esistono, ma non sono state lette in produzione).
