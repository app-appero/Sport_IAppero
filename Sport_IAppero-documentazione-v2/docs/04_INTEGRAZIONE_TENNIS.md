# Integrazione Tennis Oracle

Base: https://tennisoracle-backend-dev.up.railway.app
Repository: https://github.com/romy1992/tennis_oracle.git
Prefisso distribuito: `/api`. Il default Settings è `/api`, ma è configurabile via API_PREFIX: usare OpenAPI del deployment come verifica.

## Endpoint verificati

| Metodo/path | Risposta | Accesso nel codice |
|---|---|---|
| GET `/api/next-fixtures` | list[NextFixtureRead], senza predizioni | admin o servizio |
| GET `/api/next-fixtures/predictions` | FixturesWithPredictionsPage | admin o servizio |
| GET `/api/published-predictions` | PublishedPredictionListResponse | admin JWT |
| GET `/api/published-predictions/{prediction_id}` | PublishedPredictionRead | admin JWT |
| GET `/api/published-predictions/by-publication/{publication_id}` | catena versioni | admin JWT |
| GET `/api/published-predictions/stats` | PublishedLiveStatsSummary | admin JWT |
| POST `/api/auth/login` | token admin | Non necessario al feed con service token |
| GET `/health` | health | Fuori dal prefisso `/api` |

`/matches` ha un file route nel repository ma non è incluso nel router aggregato esaminato. Non adottare `/api/matches` come contratto senza verificarne la registrazione nel deployment.

Feed iniziale: `/api/next-fixtures/predictions?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=200&offset=0&status=upcoming`. Parametri aggiuntivi: `model_version` enum v1/v2/v3/v4 (default distribuito v4), `model_name`, `outcome` all/won/lost, `player`, `event_type` atp/wta/challenger/itf. Il default v4 non prova quale modello commerciale sia ufficiale: confermare la configurazione con il proprietario, senza fallback a versioni diverse.

Response: `items`, `total`, `offset`, `limit`. Paginare fino a esaurimento con tetto configurato; se budget/tempo finisce segnare truncation. Non confondere `id` della fixture con `event_key` stabile del provider.

## Autenticazione

`require_admin_or_service` accetta JWT Bearer admin oppure `X-Service-Token`. Le chiavi valide sono `SERVICE_API_KEY` e opzionalmente `SERVICE_API_KEY_PREVIOUS`. Se nessuna chiave è configurata e ALLOW_UNAUTHENTICATED_SERVICE_READS è true, il codice permette letture anonime; sul deployment osservato la richiesta anonima al feed dà 401. Non possiamo dedurre quale variabile provochi questa configurazione.

Il BFF autentica lato server con `TENNIS_ORACLE_USERNAME`/`TENNIS_ORACLE_PASSWORD` (login su `/api/auth/login`, bearer admin); `TENNIS_SERVICE_TOKEN` non esiste nella configurazione. Non incorporare credenziali nell'app Expo, non loggare header Authorization. Il registro published è protetto da `require_admin`: il login admin del BFF lo sblocca, quindi non serve alcuna route nuova su Tennis Oracle. Il feed tecnico resta segnalato come tale, senza dichiararlo ufficiale. Non cambiare le dipendenze auth dei motori dentro questo task.

## Mapping evento items[]

| Campo | Destinazione | Note |
|---|---|---|
| event_key | event.source_event_id | ID `tennis:event:{event_key}` |
| event_first_player / event_second_player | participants[].name | role player_1/player_2 |
| first_player_key / second_player_key | participants[].source_id | Null se assenti |
| tournament_name / tournament_key | competition.name / source_id | Opzionali |
| event_date + event_time | start_time | Solo dopo conferma timezone delle fixture |
| surface / tournament_round / event_type_type | metadata | Non uniformare nomi di superfici senza mapping |
| event_status / match_lifecycle_status / is_completed | status + source metadata | Mappa esplicita, evitare pre-match già iniziati |
| prediction_warning | warnings | Non nasconderlo |

## Match winner da item.prediction

| Campo | Destinazione | Regola |
|---|---|---|
| prob_player_1_win | outcomes[player_1].probability | p; per player_2 usare 1-p nel modello binario |
| predicted_winner | selection | `First Player` → player_1; `Second Player` → player_2 |
| confidence | confidence.raw | Il codice la calcola max(p,1-p); non è accuracy del modello |
| predicted_winner_odds | pricing.odds_decimal | Quota dell'esito selezionato |
| model_version / model_name | model.version / name | Conservare stringhe originali |
| predicted_at | predicted_at | Nullable; validare offset |
| features_available / warnings | quality | Indicano availability, non un voto inventato |
| actual_winner / is_correct | settlement | Solo uso storico, non ancora ufficiale per definizione |

Probability della selezione: usare p o 1-p in funzione di predicted_winner. Se label sconosciuta, non assegnare un partecipante in base solo a max(p,1-p): conservare label e warning. Confidence max(p,1-p) può discordare con una selezione incoerente; segnalarlo.

## Altri mercati da extra_markets[]

Campo `market`, `selection`, `probability`, `model_version`, `model_name`, `odds`, `void_odds`, `edge`, `published_at`. Sono già schemi separati: non appiattirli nel match-winner. Sorgenti previste dal ledger: `first_set_winner`, `over_under_games`. Normalizzare a `first_set_winner` (periodo first_set) e `total_games` (periodo match). La linea non è un campo esplicito di ExtraMarketPredictionRead: parser selezione solo con esempi reali e test; altrimenti source label e linea null, nessun numero inventato.

## Ledger pubblicato (implementato in Sprint 3)

Il BFF legge `/api/published-predictions` (`official_only`, `latest_only`, paginato) e gli esiti da `/api/live-beta-dashboard` giorno per giorno e mercato per mercato (tetto 100 righe per chiamata, avviso nel log se raggiunto). L'esito lo decide Tennis Oracle. Il provider rifiuta di pubblicare o correggere dopo l'inizio della partita; data/ora d'inizio sono Europe/Rome locali, e senza `event_time` la riga resta fuori dalle statistiche.


`publication_id`, `content_version`, `previous_version_id`, `is_latest`, `initial_status`, `published_at`, `event_key`, `market`, `selection`, `probability`, `value_decision`, `official_play`, modello, quote, player/tournament/date/time. Distinguere published da official_play; draft non appare nel feed consumer. Filtri `from`/`to` sono passati come from_date/to_date e non vanno assunti filtri evento: verificare il servizio prima dello storico. Stats ha filtri distinti event_date_from/event_date_to.

Nessun payload Tennis autenticato è incluso: gli schemi sono reali, ma i mapper restano da collaudare su fixture JSON autorizzate.
