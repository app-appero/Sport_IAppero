# Data Provider Matrix

Consultazione prezzi/licenze: dove non verificabile oggi → **non verificato**. Nessuna chiamata a provider a pagamento in questa sessione.

| Provider | Progetto | Tipo | Dati | Frequenza tipica | Licenza/costi | Fallback | Freschezza esposta | Stato |
|---|---|---|---|---|---|---|---|---|
| API-Sports | Soccer | API ufficiale a pagamento | fixtures, stats, xG, odds, lineups, players | job giornalieri + interval | **non verificato** in sessione (piano account) | nessuno secondario autorizzato | parziale (`data_quality`, snapshot `computed_at`) | attivo + resilienza migliorata |
| The Odds API | Soccer | API ufficiale a pagamento | odds storiche | script offline | **non verificato** | n/a runtime | n/a | offline only |
| FotMob via RapidAPI | Soccer | wrapper third-party | predicted lineups | daily 06:30 | ToS wrapper **a rischio**; costi RapidAPI **non verificato** | skip best-effort | `fetched_at` | attivo best-effort |
| API-Tennis | Tennis | API ufficiale a pagamento | fixtures, odds, standings, players | global update + live poll | **non verificato** | nessuno | `imported_at`, `predicted_at`; odds age additivo dove presente | attivo + resilienza |
| Sackmann ATP | Tennis | dataset open storico | ranking/match ATP | rebuild dataset | tipicamente non commerciale senza check; **non verificato uso commerciale** | n/a | n/a | solo ML |
| Telegram | Tennis/Soccer | Bot API | notifiche | event-driven | gratis con limiti | n/a | n/a | ops |
| Stripe | Tennis | pagamenti | abbonamenti | event-driven | commerciale Stripe | n/a | n/a | ops |
| Resend | Tennis | email | report | scheduler | commerciale Resend | n/a | n/a | ops |

Regola adottata: a provider down **non** si inventano dati; BFF può servire cache marcata `is_stale`.
